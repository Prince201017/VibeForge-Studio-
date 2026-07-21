import asyncio
import pytest
from exporters.code_exporter import CodeExporter
from exporters.base import ExportJob


@pytest.mark.asyncio
async def test_svg_export_contains_shapes():
    job = ExportJob(job_id="j1", project_id="p1",
                     scene={"width": 100, "height": 100, "nodes": [{"type": "shape", "props": {"kind": "circle", "x": 5, "y": 5, "r": 3, "fill": "#f00"}}]},
                     format="code", options={"target": "svg"})
    result = await CodeExporter().export(job)
    assert b"<circle" in result.file_bytes
    assert result.mime_type == "image/svg+xml"


@pytest.mark.asyncio
async def test_rejects_unsupported_target():
    exp = CodeExporter()
    with pytest.raises(ValueError):
        exp.validate_options({"target": "photoshop"})
