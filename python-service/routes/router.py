# [V0.A4] FastAPI routes for AI design generation/refinement.
import os
from fastapi import APIRouter, Depends, HTTPException

from .schemas import DesignGenerateRequest, DesignGenerateResponse, DesignRefineRequest
from .generation_service import generate_design, GenerationError

router = APIRouter(prefix="/api/ai", tags=["ai"])

AI_GATEWAY_API_KEY = os.environ.get("AI_GATEWAY_API_KEY", "")


@router.post("/generate", response_model=DesignGenerateResponse)
async def generate(req: DesignGenerateRequest):
    # NOTE: current_user + rate_limit + RBAC decorators from the security module
    # (12-security) should wrap this in the real app; omitted here to keep this
    # module standalone/importable on its own.
    try:
        return await generate_design(req, api_key=AI_GATEWAY_API_KEY)
    except GenerationError as exc:
        raise HTTPException(status_code=502, detail="Design generation failed") from exc


@router.post("/refine")
async def refine(req: DesignRefineRequest):
    # Refinement re-prompts the model with the existing node subset + instruction.
    # Left as a thin wrapper around generate_design with a composed prompt.
    gen_req = DesignGenerateRequest(
        prompt=f"Refine these nodes: {req.node_ids}. Instruction: {req.instruction}",
        project_id=req.project_id,
    )
    try:
        return await generate_design(gen_req, api_key=AI_GATEWAY_API_KEY)
    except GenerationError as exc:
        raise HTTPException(status_code=502, detail="Refinement failed") from exc
