"""
[V0.A7] Export Pipeline — FastAPI service entry point.

Run with:  uvicorn main:app --reload --port 8001
(intended to be mounted under the main ForgeOS FastAPI app per
01_ARCHITECTURE_REQUIREMENTS.md's "Frontend-Backend: Zustand store <-> Python
FastAPI" integration point — see README.md "Integrating into ForgeOS".)
"""
from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.export import router as export_router
from services import code_export, image_export, lottie_export, rive_export, sprite_export, svg_export, video_export
from services.export_engine import engine

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async def sweep():
        while True:
            removed = engine.cleanup_temp_files(older_than_sec=3600)
            if removed:
                logging.getLogger("export_engine").info("cleaned up %d stale export artifact(s)", removed)
            await asyncio.sleep(900)

    task = asyncio.create_task(sweep())
    yield
    task.cancel()


app = FastAPI(title="ForgeOS Export Pipeline", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten to the ForgeOS app origin in production
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(export_router)

# Register every exporter (§Export format registry) against the engine.
for module in (video_export, image_export, code_export, svg_export, lottie_export, rive_export, sprite_export):
    module.register(engine)


@app.get("/api/export/health")
async def health():
    return {"status": "ok", "registered_formats": sorted(engine._handlers.keys())}
