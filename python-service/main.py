"""
[V0.A1] ForgeOS Python FastAPI Service
Main entry point for AI, rendering, and asset processing services.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import route modules (to be created by team members)
# from routes import ai, render, export, geometry

# [V0.A1] Lifecycle management
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events."""
    print("[V0.A1] ForgeOS Python service starting...")
    yield
    print("[V0.A1] ForgeOS Python service shutting down...")


# [V0.A1] Initialize FastAPI app
app = FastAPI(
    title="ForgeOS API",
    description="AI Creative Operating System - Backend Services",
    version="0.1.0",
    lifespan=lifespan,
)

# [V0.A1] CORS configuration for local development and Vercel
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "https://*.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# [V0.A1] Health check endpoint
@app.get("/health")
async def health_check():
    """Service health check."""
    return {
        "status": "healthy",
        "service": "ForgeOS API",
        "version": "0.1.0",
    }


# [V0.A1] Root endpoint
@app.get("/")
async def root():
    """API root information."""
    return {
        "name": "ForgeOS API",
        "description": "Backend services for AI Creative Operating System",
        "endpoints": {
            "ai": "/ai - Design generation, analysis, assistance",
            "render": "/render - Geometry and animation rendering",
            "export": "/export - Asset export and optimization",
            "geometry": "/geometry - Procedural geometry operations",
        },
    }


# Route modules will be included here once implemented by team members:
# app.include_router(ai.router, prefix="/ai", tags=["AI"])
# app.include_router(render.router, prefix="/render", tags=["Render"])
# app.include_router(export.router, prefix="/export", tags=["Export"])
# app.include_router(geometry.router, prefix="/geometry", tags=["Geometry"])


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
