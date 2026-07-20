"""
[Claude.A14] Central configuration for the Advanced AI Engine.

All API keys and tunables are pulled from environment variables so that
no secret ever needs to be hard-coded or committed. See .env.example.
"""
from functools import lru_cache
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- Provider credentials -------------------------------------------------
    openai_api_key: Optional[str] = Field(default=None, alias="OPENAI_API_KEY")
    anthropic_api_key: Optional[str] = Field(default=None, alias="ANTHROPIC_API_KEY")
    google_api_key: Optional[str] = Field(default=None, alias="GOOGLE_API_KEY")
    stability_api_key: Optional[str] = Field(default=None, alias="STABILITY_API_KEY")

    # --- Model identifiers (kept out of business logic so they can be bumped) -
    openai_model: str = "gpt-4o"
    openai_vision_model: str = "gpt-4o"
    anthropic_model: str = "claude-sonnet-4-6"
    anthropic_vision_model: str = "claude-sonnet-4-6"
    gemini_model: str = "gemini-1.5-pro"
    stability_model: str = "stable-diffusion-xl-1024-v1-0"

    # --- Infra ------------------------------------------------------------
    redis_url: Optional[str] = Field(default=None, alias="REDIS_URL")
    cache_ttl_seconds: int = 60 * 30
    request_timeout_seconds: int = 90
    max_generation_seconds: int = 120  # hard SLA ceiling from spec

    # --- Rate limiting (spec: 100 requests/minute/user) --------------------
    rate_limit_per_minute: int = 100

    # --- Cost optimization thresholds --------------------------------------
    cheap_task_max_tokens: int = 500  # below this, prefer the cheapest model

    # --- Safety -------------------------------------------------------------
    enable_content_moderation: bool = True
    store_user_designs: bool = False  # spec: don't persist unless opted-in

    # --- CORS ---------------------------------------------------------------
    allowed_origins: list[str] = ["http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
