"""
[Claude.A14] FastAPI application entrypoint for the Advanced AI Engine.

Run with:
    uvicorn main:app --reload --port 8001

Requires at least one of OPENAI_API_KEY / ANTHROPIC_API_KEY / GOOGLE_API_KEY
to be set for text/vision endpoints to function, and STABILITY_API_KEY for
image generation. See .env.example.
"""
from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import get_settings
from routes.ai import router as ai_router
from services.model_integration import AllProvidersFailedError

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("ai_engine.main")

settings = get_settings()

app = FastAPI(
    title="ForgeOS Advanced AI Engine",
    description="[Claude.A14] Deep AI integration: design generation, style "
    "analysis, animation, shaders, code gen, and iterative refinement.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ai_router)


@app.exception_handler(AllProvidersFailedError)
async def all_providers_failed_handler(request: Request, exc: AllProvidersFailedError):
    return JSONResponse(
        status_code=503,
        content={"success": False, "error": "All configured AI providers failed", "attempts": exc.attempts},
    )


@app.get("/health")
async def health():
    return {"status": "ok", "service": "forgeos-advanced-ai-engine"}


@app.on_event("startup")
async def on_startup():
    configured = []
    if settings.openai_api_key:
        configured.append("openai")
    if settings.anthropic_api_key:
        configured.append("anthropic")
    if settings.google_api_key:
        configured.append("google")
    if settings.stability_api_key:
        configured.append("stability")
    logger.info("AI Engine starting. Configured providers: %s", configured or "NONE (set API keys in .env)")
    logger.info(
        "Persistence: %s | Cache/rate-limit backend: %s",
        "Postgres" if settings.database_url else "in-memory (DATABASE_URL not set)",
        "Redis" if settings.redis_url else "in-memory (REDIS_URL not set)",
    )


@app.on_event("shutdown")
async def on_shutdown():
    from db.connection import close_pool

    await close_pool()
