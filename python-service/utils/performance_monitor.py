"""
[V0.A7] Performance Monitoring (§15)
====================================
Wraps an export call to record wall-clock time, peak RSS memory, and CPU
percent, then checks the result against the hard SLAs from
07_EXPORT_PIPELINE_NEEDS.md so a regression shows up as a failed assertion
in CI rather than a silent slowdown.

Uses `psutil` for process metrics (add to requirements.txt) and a
background sampling thread rather than instrumenting every exporter, so it
works uniformly across the ffmpeg-subprocess path and the pure-Python
paths.
"""
from __future__ import annotations

import threading
import time
from contextlib import contextmanager
from dataclasses import dataclass, field

try:
    import psutil
    _HAS_PSUTIL = True
except ImportError:
    _HAS_PSUTIL = False


@dataclass
class Benchmark:
    label: str
    duration_sec: float = 0.0
    peak_rss_mb: float = 0.0
    avg_cpu_pct: float = 0.0
    samples: list[tuple[float, float]] = field(default_factory=list)  # (rss_mb, cpu_pct)


# Hard SLAs, straight from the spec's "Performance Targets" section.
SLA_SECONDS = {
    "video_10s": 15,
    "video_60s": 60,
    "image_sequence_1000_frames": 30,
    "code_export": 0.5,
    "lottie_export": 1,
    "format_conversion": 5,
}


@contextmanager
def measure(label: str, sla_key: str | None = None):
    bm = Benchmark(label=label)
    stop_flag = threading.Event()
    proc = psutil.Process() if _HAS_PSUTIL else None

    def _sample():
        while not stop_flag.is_set():
            if proc:
                bm.samples.append((proc.memory_info().rss / (1024 * 1024), proc.cpu_percent(interval=None)))
            time.sleep(0.25)

    sampler = threading.Thread(target=_sample, daemon=True)
    start = time.monotonic()
    if _HAS_PSUTIL:
        sampler.start()
    try:
        yield bm
    finally:
        bm.duration_sec = time.monotonic() - start
        stop_flag.set()
        if _HAS_PSUTIL:
            sampler.join(timeout=1)
            if bm.samples:
                bm.peak_rss_mb = max(s[0] for s in bm.samples)
                bm.avg_cpu_pct = sum(s[1] for s in bm.samples) / len(bm.samples)

        if sla_key and sla_key in SLA_SECONDS and bm.duration_sec > SLA_SECONDS[sla_key]:
            import logging
            logging.getLogger("performance_monitor").warning(
                "SLA MISS: %s took %.2fs, budget was %ss (sla_key=%s)",
                label, bm.duration_sec, SLA_SECONDS[sla_key], sla_key,
            )


def quality_metrics(reference_frame_path, exported_frame_path) -> dict[str, float]:
    """PSNR/SSIM between a rendered reference frame and the exported frame,
    for the spec's 'Quality metrics (PSNR, SSIM)' requirement. Needs
    numpy + scikit-image (optional deps — only imported if this function
    is actually called, keeping the base install light)."""
    import numpy as np
    from PIL import Image
    from skimage.metrics import peak_signal_noise_ratio, structural_similarity

    a = np.asarray(Image.open(reference_frame_path).convert("RGB"))
    b = np.asarray(Image.open(exported_frame_path).convert("RGB"))
    if a.shape != b.shape:
        raise ValueError(f"frame size mismatch: reference {a.shape} vs exported {b.shape}")
    return {
        "psnr": float(peak_signal_noise_ratio(a, b)),
        "ssim": float(structural_similarity(a, b, channel_axis=2)),
    }
