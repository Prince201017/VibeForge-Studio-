"""
[V0.A7] Export Pipeline — pytest suite (§17 Testing & Documentation)

Run with:  pytest -q  (from backend/)
Requires:  pip install pytest pytest-asyncio httpx
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from models.schemas import (
    Easing, EasingType, ExportFormat, ExportMetadata, ExportRequest, FrameRange,
    Keyframe, Layer, ProjectData, RenderOptions, ShapeType,
)
from services.export_engine import ExportEngine
from services.frame_renderer import _ease, interpolate_properties


# --------------------------------------------------------------------------
# fixtures
# --------------------------------------------------------------------------

@pytest.fixture
def project() -> ProjectData:
    layer = Layer(
        name="Box", shape=ShapeType.RECT, geometry={"width": 100, "height": 100}, fill="#FF0000",
        keyframes=[
            Keyframe(time_ms=0, properties={"x": 0, "y": 0, "opacity": 1}),
            Keyframe(time_ms=1000, properties={"x": 100, "y": 50, "opacity": 0.5}),
        ],
    )
    return ProjectData(project_id="test", name="Test", width=400, height=300, duration_ms=1000, fps=30, layers=[layer])


@pytest.fixture
def engine() -> ExportEngine:
    from services import code_export, image_export, lottie_export, rive_export, sprite_export, svg_export, video_export
    eng = ExportEngine()
    for module in (video_export, image_export, code_export, svg_export, lottie_export, rive_export, sprite_export):
        module.register(eng)
        module.engine = eng
    return eng


# --------------------------------------------------------------------------
# easing / interpolation (pure math, no I/O — the cheapest tests to run)
# --------------------------------------------------------------------------

class TestEasing:
    def test_linear_is_identity(self):
        assert _ease(0.5, Easing(type=EasingType.LINEAR)) == 0.5

    def test_ease_in_out_is_symmetric(self):
        e = Easing(type=EasingType.EASE_IN_OUT)
        assert _ease(0.5, e) == pytest.approx(0.5, abs=1e-6)

    def test_ease_boundaries_are_clamped(self):
        e = Easing(type=EasingType.EASE_IN_OUT)
        assert _ease(-1, e) == 0.0
        assert _ease(2, e) == 1.0

    def test_steps_easing_quantizes(self):
        e = Easing(type=EasingType.STEPS, steps=4)
        assert _ease(0.1, e) == 0.0
        assert _ease(0.9, e) == pytest.approx(0.75)


class TestInterpolation:
    def test_before_first_keyframe_holds(self, project):
        props = interpolate_properties(project.layers[0], -500)
        assert props["x"] == 0

    def test_after_last_keyframe_holds(self, project):
        props = interpolate_properties(project.layers[0], 5000)
        assert props["x"] == 100

    def test_midpoint_interpolates(self, project):
        props = interpolate_properties(project.layers[0], 500)
        assert 0 < props["x"] < 100
        assert 0.5 <= props["opacity"] <= 1.0

    def test_no_keyframes_returns_defaults(self):
        layer = Layer(name="Static", shape=ShapeType.RECT, geometry={"width": 50, "height": 50})
        props = interpolate_properties(layer, 500)
        assert props["x"] == 0.0
        assert props["opacity"] == 1.0


# --------------------------------------------------------------------------
# export engine: job lifecycle
# --------------------------------------------------------------------------

class TestExportEngine:
    @pytest.mark.asyncio
    async def test_unregistered_format_raises(self, engine, project):
        eng2 = ExportEngine()  # nothing registered
        req = ExportRequest(project=project, format=ExportFormat.MP4)
        with pytest.raises(ValueError, match="No exporter registered"):
            await eng2.start(req)

    @pytest.mark.asyncio
    async def test_css_export_completes(self, engine, project):
        req = ExportRequest(project=project, format=ExportFormat.CSS)
        job = await engine.start(req)
        await engine._tasks[job.job_id]
        final = engine.get(job.job_id)
        assert final.status.value == "complete"
        assert final.file_size_bytes > 0
        assert Path(final.output_path).read_text().count("@keyframes") == 1

    @pytest.mark.asyncio
    async def test_cancel_marks_cancelled(self, engine, project):
        req = ExportRequest(project=project, format=ExportFormat.MP4)
        job = await engine.start(req)
        cancelled = await engine.cancel(job.job_id)
        assert cancelled.status.value == "cancelled"

    @pytest.mark.asyncio
    async def test_history_records_completed_job(self, engine, project):
        req = ExportRequest(project=project, format=ExportFormat.CSS)
        job = await engine.start(req)
        await engine._tasks[job.job_id]
        assert any(j.job_id == job.job_id for j in engine.history())

    def test_frame_count_estimation_full_range(self, project):
        req = ExportRequest(project=project, format=ExportFormat.CSS, frame_range=FrameRange(mode="full"))
        assert ExportEngine._estimate_frame_count(req) == 30  # 1000ms @ 30fps

    def test_frame_count_estimation_current_frame(self, project):
        req = ExportRequest(project=project, format=ExportFormat.CSS, frame_range=FrameRange(mode="current_frame", current_frame_ms=500))
        assert ExportEngine._estimate_frame_count(req) == 1


# --------------------------------------------------------------------------
# format-specific correctness checks
# --------------------------------------------------------------------------

class TestLottieExport:
    @pytest.mark.asyncio
    async def test_produces_valid_lottie_schema(self, engine, project):
        req = ExportRequest(project=project, format=ExportFormat.LOTTIE)
        job = await engine.start(req)
        await engine._tasks[job.job_id]
        final = engine.get(job.job_id)
        doc = json.loads(Path(final.output_path).read_text())
        for key in ("v", "fr", "ip", "op", "w", "h", "layers"):
            assert key in doc
        assert doc["fr"] == project.fps
        assert len(doc["layers"]) == len(project.layers)


class TestSvgExport:
    @pytest.mark.asyncio
    async def test_smil_output_is_well_formed_xml_ish(self, engine, project):
        req = ExportRequest(project=project, format=ExportFormat.SVG_SMIL)
        job = await engine.start(req)
        await engine._tasks[job.job_id]
        final = engine.get(job.job_id)
        text = Path(final.output_path).read_text()
        assert text.strip().startswith("<svg")
        assert text.strip().endswith("</svg>")
        assert "<animateTransform" in text


class TestCodeExport:
    @pytest.mark.asyncio
    async def test_framer_motion_has_balanced_jsx_braces(self, engine, project):
        req = ExportRequest(project=project, format=ExportFormat.FRAMER_MOTION)
        job = await engine.start(req)
        await engine._tasks[job.job_id]
        final = engine.get(job.job_id)
        code = Path(final.output_path).read_text()
        assert code.count("{") == code.count("}")
        assert "style={{" in code  # JSX double-brace must survive templating intact

    @pytest.mark.asyncio
    async def test_metadata_header_is_prepended(self, engine, project):
        req = ExportRequest(project=project, format=ExportFormat.GSAP, metadata=ExportMetadata(title="My Anim", author="Ada"))
        job = await engine.start(req)
        await engine._tasks[job.job_id]
        final = engine.get(job.job_id)
        code = Path(final.output_path).read_text()
        assert "My Anim" in code.splitlines()[1]
        assert "Ada" in code.splitlines()[2]


class TestVideoExport:
    @pytest.mark.asyncio
    async def test_mp4_export_produces_playable_file(self, engine, project):
        req = ExportRequest(project=project, format=ExportFormat.MP4)
        job = await engine.start(req)
        await engine._tasks[job.job_id]
        final = engine.get(job.job_id)
        assert final.status.value == "complete"
        assert Path(final.output_path).suffix == ".mp4"
        assert final.file_size_bytes > 1000  # not an empty/corrupt file

    @pytest.mark.asyncio
    async def test_render_options_do_not_crash_pipeline(self, engine, project):
        req = ExportRequest(project=project, format=ExportFormat.MP4,
                             render=RenderOptions(motion_blur=True, bloom=True, film_grain=0.2, tone_mapping="reinhard"))
        job = await engine.start(req)
        await engine._tasks[job.job_id]
        assert engine.get(job.job_id).status.value == "complete"


# --------------------------------------------------------------------------
# API routes (requires httpx test client)
# --------------------------------------------------------------------------

class TestApiRoutes:
    def test_health_endpoint_lists_formats(self):
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        resp = client.get("/api/export/health")
        assert resp.status_code == 200
        assert "css" in resp.json()["registered_formats"]

    def test_start_export_returns_job_id(self, project):
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        resp = client.post("/api/export/start", json=json.loads(
            ExportRequest(project=project, format=ExportFormat.CSS).model_dump_json()
        ))
        assert resp.status_code == 200
        assert "job_id" in resp.json()

    def test_progress_for_unknown_job_is_404(self):
        from fastapi.testclient import TestClient
        from main import app

        client = TestClient(app)
        resp = client.get("/api/export/progress/does-not-exist")
        assert resp.status_code == 404
