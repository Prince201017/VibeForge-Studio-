"""
[V0.A7] Rive Export — Known Limitation
=======================================
Read this before wiring up the "Rive export" button.

`.riv` is Rive's own compiled binary format. There is no open specification
and no first- or third-party Python/Node library that *writes* `.riv` files
from arbitrary data — the only supported way to produce one is Rive's own
editor or their (closed-source) runtime SDKs, which round-trip existing
`.riv` projects rather than authoring new ones from a generic animation
timeline. This is a real constraint of the Rive ecosystem, not a gap in
this implementation.

What this module does instead, so "Rive export" is still a useful button
rather than a dead end:
  1. Exports the same animation as Lottie JSON (§8 is fully implemented —
     see lottie_export.py) via `lottie_export.export_lottie`.
  2. Emits a Rive-flavored *state machine descriptor* (JSON) describing the
     layers, timeline, and inferred states (idle/playing), which matches
     the shape a human would manually recreate in the Rive editor's own
     state machine graph — so importing is a mechanical step, not a
     from-scratch rebuild.
  3. Returns both files plus a short instructions.txt.

If native `.riv` output becomes a hard requirement, the real fix is a build
step that shells out to Rive's `rive-cli` (if/when Rive ships a headless
authoring CLI) or a licensed integration with their runtime — that's a
product/licensing decision, not something to fake here.
"""
from __future__ import annotations

import json
import shutil
import time

from models.schemas import ExportRequest
from services.export_engine import ExportResult, ProgressCallback, engine
from services.lottie_export import export_lottie


async def export_rive(request: ExportRequest, progress_cb: ProgressCallback) -> ExportResult:
    progress_cb(5, 0, 1)
    lottie_result = await export_lottie(request, lambda p, c, t: progress_cb(5 + p * 0.6, c, t))

    project = request.project
    state_machine = {
        "artboard": project.name,
        "note": "Rive-flavored state machine descriptor — import into the Rive editor manually; "
                "see instructions.txt. This is NOT a .riv binary.",
        "states": [
            {"name": "idle", "type": "entry"},
            {"name": "play", "type": "animation", "source_timeline": "main",
             "duration_ms": project.duration_ms, "loop": True},
        ],
        "transitions": [{"from": "idle", "to": "play", "trigger": "onLoad"}],
        "layers": [{"name": l.name, "shape": l.shape.value, "keyframe_count": len(l.keyframes)} for l in project.layers],
    }

    out_dir = engine.work_dir / f"rive_bundle_{time.time_ns()}"
    out_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy(lottie_result.output_path, out_dir / "animation.lottie.json")
    (out_dir / "state_machine.json").write_text(json.dumps(state_machine, indent=2), encoding="utf-8")
    (out_dir / "instructions.txt").write_text(
        "Rive (.riv) cannot be generated programmatically outside Rive's own editor/SDK.\n"
        "This bundle gives you everything short of that:\n"
        "  1. Open rive.app -> New File.\n"
        "  2. Import animation.lottie.json (Rive supports Lottie import) to bring in the "
        "shapes and keyframes.\n"
        "  3. Use state_machine.json as the blueprint for wiring up the State Machine graph "
        "(states + transitions already named to match).\n"
        "  4. Export as .riv from within Rive.\n",
        encoding="utf-8",
    )

    progress_cb(90, 0, 1)
    archive_path = engine.work_dir / f"{out_dir.name}.zip"
    archive_path = type(archive_path)(shutil.make_archive(str(out_dir), "zip", root_dir=out_dir))
    shutil.rmtree(out_dir, ignore_errors=True)

    progress_cb(100, 1, 1)
    return ExportResult(
        output_path=archive_path,
        file_size_bytes=archive_path.stat().st_size,
        extra={"format_limitation": "true .riv binary output is not programmatically producible; see instructions.txt in the bundle"},
    )


def register(engine_instance=engine) -> None:
    from models.schemas import ExportFormat
    engine_instance.register(ExportFormat.RIVE.value, export_rive)
