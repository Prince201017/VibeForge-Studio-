# [V0.A4] Unit test with mocked HTTP layer — no real API calls.
import json
import pytest
import respx
import httpx

from app.schemas import DesignGenerateRequest
from app.generation_service import generate_design, GenerationError


@pytest.mark.asyncio
@respx.mock
async def test_generate_design_parses_nodes():
    mock_response = {
        "content": [{"type": "text", "text": json.dumps([{"type": "shape", "props": {"kind": "circle", "r": 10}}])}],
        "usage": {"input_tokens": 100, "output_tokens": 50},
    }
    respx.post("https://api.anthropic.com/v1/messages").mock(
        return_value=httpx.Response(200, json=mock_response)
    )
    req = DesignGenerateRequest(prompt="a red circle", project_id="p1")
    result = await generate_design(req, api_key="fake-key")
    assert len(result.nodes) == 1
    assert result.nodes[0].type == "shape"
    assert result.tokens_used == 150


@pytest.mark.asyncio
async def test_generate_design_requires_api_key():
    req = DesignGenerateRequest(prompt="x", project_id="p1")
    with pytest.raises(GenerationError):
        await generate_design(req, api_key="")
