"""Ad-hoc smoke test (not part of the deliverable's `Testing & Documentation`
pytest suite — see tests/test_export_pipeline.py for that). Run directly to
sanity-check every exporter against a small hand-built project."""
from __future__ import annotations

import asyncio
import sys
import traceback

sys.path.insert(0, ".")

from models.schemas import (
    Easing, EasingType, ExportFormat, ExportRequest, FrameRange, Keyframe, Layer, ProjectData, ShapeType,
)
from services import code_export, image_export, lottie_export, rive_export, sprite_export, svg_export, video_export
from services.export_engine import ExportEngine


def sample_project() -> ProjectData:
    box = Layer(
        name="Box", shape=ShapeType.RECT,
        geometry={"width": 120, "height": 80}, fill="#D97757",
        keyframes=[
            Keyframe(time_ms=0, properties={"x": 20, "y": 20, "opacity": 1, "rotation": 0}, easing=Easing(type=EasingType.EASE_IN_OUT)),
            Keyframe(time_ms=500, properties={"x": 300, "y": 20, "rotation": 90}, easing=Easing(type=EasingType.EASE_OUT)),
            Keyframe(time_ms=1000, properties={"x": 300, "y": 200, "rotation": 180, "opacity": 0.3}, easing=Easing(type=EasingType.LINEAR)),
        ],
    )
    circle = Layer(
        name="Circle", shape=ShapeType.ELLIPSE,
        geometry={"width": 60, "height": 60}, fill="#4A90D9",
        keyframes=[
            Keyframe(time_ms=0, properties={"x": 400, "y": 300, "scaleX": 1, "scaleY": 1}),
            Keyframe(time_ms=1000, properties={"x": 100, "y": 100, "scaleX": 1.8, "scaleY": 1.8}),
        ],
    )
    return ProjectData(project_id="p1", name="Smoke Test Scene", width=640, height=360, duration_ms=1000, fps=24, layers=[box, circle])


async def main() -> None:
    engine = ExportEngine()
    for module in (video_export, image_export, code_export, svg_export, lottie_export, rive_export, sprite_export):
        module.register(engine)

    # monkeypatch other modules' `engine` references to this local instance
    for module in (video_export, image_export, code_export, svg_export, lottie_export, rive_export, sprite_export):
        module.engine = engine

    project = sample_project()
    formats_to_test = [
        ExportFormat.MP4, ExportFormat.WEBM,
        ExportFormat.PNG_SEQUENCE, ExportFormat.APNG, ExportFormat.TIFF_SEQUENCE,
        ExportFormat.CSS, ExportFormat.HTML, ExportFormat.FRAMER_MOTION, ExportFormat.GSAP,
        ExportFormat.MOTION_ONE, ExportFormat.ANIME_JS, ExportFormat.WEB_ANIMATION_API,
        ExportFormat.TAILWIND, ExportFormat.STYLED_COMPONENTS, ExportFormat.THREE_JS,
        ExportFormat.SVG_SMIL, ExportFormat.SVG_CSS, ExportFormat.SVG_JS,
        ExportFormat.LOTTIE, ExportFormat.RIVE,
        ExportFormat.SPRITE_SHEET_PNG, ExportFormat.SPRITE_SHEET_JSON,
    ]

    results = []
    for fmt in formats_to_test:
        req = ExportRequest(project=project, format=fmt, frame_range=FrameRange(mode="full"))
        try:
            job = await engine.start(req)
            task = engine._tasks[job.job_id]
            await task
            final = engine.get(job.job_id)
            status = final.status.value
            size = final.file_size_bytes
            results.append((fmt.value, status, size, final.error))
        except Exception as exc:  # noqa: BLE001
            results.append((fmt.value, "EXCEPTION", None, f"{exc}\n{traceback.format_exc()}"))

    ok = 0
    for fmt, status, size, error in results:
        mark = "OK  " if status == "complete" else "FAIL"
        if status == "complete":
            ok += 1
        print(f"[{mark}] {fmt:22s} status={status:10s} size={size} {('err=' + str(error)[:200]) if error else ''}")
    print(f"\n{ok}/{len(results)} formats passed")


if __name__ == "__main__":
    asyncio.run(main())
