"""
[Claude.A14] Model Integration Layer (spec section 12).

Single entry point every other service calls instead of talking to
OpenAI/Anthropic/Google/Stability SDKs directly. Responsibilities:

  - Normalize completion calls across 4 providers behind one interface
  - Walk the fallback chain (primary -> secondary -> tertiary -> local)
  - Track usage/cost per call
  - Enforce per-call timeouts (spec: max generation time 2 minutes)
  - Retry transient failures with backoff before falling through

This module intentionally does NOT know about design/animation/shader
domain logic - it only knows how to get text or an image out of a model
given a prompt. Domain services build prompts and parse results.
"""
from __future__ import annotations

import asyncio
import json
import logging
import time
from dataclasses import dataclass
from typing import Any

from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from config import Settings, get_settings
from models.ai.common import ModelUsage
from services.analytics_ai import get_analytics_service
from utils.model_selector import Capability, ModelSpec, Provider, select_fallback_chain
from utils.token_counter import count_tokens, estimate_cost_usd

logger = logging.getLogger("ai_engine.model_integration")


class ProviderCallError(Exception):
    """Raised when a single provider call fails (network, auth, refusal, etc.)."""


class AllProvidersFailedError(Exception):
    """Raised when every model in the fallback chain has been exhausted."""

    def __init__(self, attempts: list[dict[str, Any]]):
        self.attempts = attempts
        super().__init__(f"All {len(attempts)} provider(s) in fallback chain failed")


@dataclass
class CompletionResult:
    text: str
    usage: ModelUsage
    raw: Any = None


class ModelIntegrationService:
    """
    Async client wrapper. Provider SDK clients are created lazily so the
    service can boot even when only a subset of API keys are configured
    (useful in dev/CI where you may only have one provider key set).
    """

    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()
        self._openai_client = None
        self._anthropic_client = None
        self._gemini_configured = False
        self._stability_ready = bool(self.settings.stability_api_key)

    # ------------------------------------------------------------------ #
    # Lazy client accessors
    # ------------------------------------------------------------------ #
    def _get_openai_client(self):
        if self._openai_client is None:
            if not self.settings.openai_api_key:
                raise ProviderCallError("OPENAI_API_KEY not configured")
            from openai import AsyncOpenAI

            self._openai_client = AsyncOpenAI(api_key=self.settings.openai_api_key)
        return self._openai_client

    def _get_anthropic_client(self):
        if self._anthropic_client is None:
            if not self.settings.anthropic_api_key:
                raise ProviderCallError("ANTHROPIC_API_KEY not configured")
            from anthropic import AsyncAnthropic

            self._anthropic_client = AsyncAnthropic(api_key=self.settings.anthropic_api_key)
        return self._anthropic_client

    def _get_gemini_module(self):
        if not self._gemini_configured:
            if not self.settings.google_api_key:
                raise ProviderCallError("GOOGLE_API_KEY not configured")
            import google.generativeai as genai

            genai.configure(api_key=self.settings.google_api_key)
            self._gemini_configured = True
        import google.generativeai as genai

        return genai

    # ------------------------------------------------------------------ #
    # Public API
    # ------------------------------------------------------------------ #
    async def complete(
        self,
        system_prompt: str,
        user_prompt: str,
        *,
        capability: Capability = Capability.TEXT,
        image_urls: list[str] | None = None,
        max_tokens: int = 2000,
        temperature: float = 0.7,
        prefer_provider: Provider | None = None,
        json_mode: bool = True,
        feature: str = "unspecified",
    ) -> CompletionResult:
        """
        Runs the fallback chain for a text/vision completion and returns the
        first successful result. Raises AllProvidersFailedError if every
        candidate model fails.

        `feature` is a free-form label (e.g. "design_generation",
        "shader_generation") used purely for analytics attribution
        (spec section 16) — it has no effect on routing/model selection.
        """
        analytics = get_analytics_service()
        prompt_tokens_estimate = count_tokens(system_prompt + user_prompt)
        chain = select_fallback_chain(
            required_capability=capability,
            prompt_tokens_estimate=prompt_tokens_estimate,
            cheap_task_max_tokens=self.settings.cheap_task_max_tokens,
            prefer_provider=prefer_provider,
        )

        attempts: list[dict[str, Any]] = []
        start = time.monotonic()

        for depth, spec in enumerate(chain):
            elapsed = time.monotonic() - start
            remaining = self.settings.max_generation_seconds - elapsed
            if remaining <= 0:
                attempts.append({"model": spec.model_name, "error": "generation time budget exceeded"})
                await analytics.record_failure(feature, "generation time budget exceeded", spec.provider.value, spec.model_name)
                break
            try:
                result = await asyncio.wait_for(
                    self._call_provider(
                        spec, system_prompt, user_prompt, image_urls,
                        max_tokens, temperature, json_mode,
                    ),
                    timeout=min(remaining, self.settings.request_timeout_seconds),
                )
                result.usage.fallback_depth = depth
                await analytics.record_model_call(result.usage, success=True)
                return result
            except Exception as exc:  # noqa: BLE001 - deliberately broad; we fall through
                logger.warning("Provider %s/%s failed: %s", spec.provider, spec.model_name, exc)
                attempts.append({"model": spec.model_name, "provider": spec.provider.value, "error": str(exc)})
                await analytics.record_failure(feature, str(exc), spec.provider.value, spec.model_name)
                await analytics.record_model_call(
                    ModelUsage(provider=spec.provider.value, model=spec.model_name), success=False
                )
                continue

        await analytics.record_failure(feature, "all providers in fallback chain exhausted")
        raise AllProvidersFailedError(attempts)

    async def generate_image(self, prompt: str, *, n: int = 1) -> list[bytes]:
        """Stability AI image generation (spec: Image Generation capability)."""
        if not self._stability_ready:
            raise ProviderCallError("STABILITY_API_KEY not configured")

        import httpx

        url = (
            f"https://api.stability.ai/v1/generation/"
            f"{self.settings.stability_model}/text-to-image"
        )
        headers = {
            "Authorization": f"Bearer {self.settings.stability_api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        payload = {
            "text_prompts": [{"text": prompt}],
            "samples": n,
            "cfg_scale": 7,
            "steps": 30,
        }
        async with httpx.AsyncClient(timeout=self.settings.request_timeout_seconds) as client:
            resp = await client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()

        import base64

        return [base64.b64decode(art["base64"]) for art in data.get("artifacts", [])]

    # ------------------------------------------------------------------ #
    # Provider-specific call implementations
    # ------------------------------------------------------------------ #
    @retry(
        reraise=True,
        stop=stop_after_attempt(2),
        wait=wait_exponential(multiplier=0.5, max=4),
        retry=retry_if_exception_type(ProviderCallError),
    )
    async def _call_provider(
        self,
        spec: ModelSpec,
        system_prompt: str,
        user_prompt: str,
        image_urls: list[str] | None,
        max_tokens: int,
        temperature: float,
        json_mode: bool,
    ) -> CompletionResult:
        call_start = time.monotonic()

        if spec.provider == Provider.ANTHROPIC:
            text, prompt_tok, completion_tok = await self._call_anthropic(
                spec, system_prompt, user_prompt, image_urls, max_tokens, temperature
            )
        elif spec.provider == Provider.OPENAI:
            text, prompt_tok, completion_tok = await self._call_openai(
                spec, system_prompt, user_prompt, image_urls, max_tokens, temperature, json_mode
            )
        elif spec.provider == Provider.GOOGLE:
            text, prompt_tok, completion_tok = await self._call_gemini(
                spec, system_prompt, user_prompt, image_urls, max_tokens, temperature
            )
        else:
            raise ProviderCallError(f"Unsupported completion provider: {spec.provider}")

        latency_ms = int((time.monotonic() - call_start) * 1000)
        usage = ModelUsage(
            provider=spec.provider.value,
            model=spec.model_name,
            prompt_tokens=prompt_tok,
            completion_tokens=completion_tok,
            estimated_cost_usd=estimate_cost_usd(prompt_tok, completion_tok, spec.price),
            latency_ms=latency_ms,
        )
        return CompletionResult(text=text, usage=usage)

    async def _call_anthropic(
        self, spec, system_prompt, user_prompt, image_urls, max_tokens, temperature
    ) -> tuple[str, int, int]:
        client = self._get_anthropic_client()
        content: list[dict[str, Any]] = []
        if image_urls:
            for url in image_urls:
                content.append({"type": "image", "source": {"type": "url", "url": url}})
        content.append({"type": "text", "text": user_prompt})

        try:
            resp = await client.messages.create(
                model=spec.model_name,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system_prompt,
                messages=[{"role": "user", "content": content}],
            )
        except Exception as exc:  # noqa: BLE001
            raise ProviderCallError(f"Anthropic call failed: {exc}") from exc

        text = "".join(block.text for block in resp.content if getattr(block, "type", "") == "text")
        return text, resp.usage.input_tokens, resp.usage.output_tokens

    async def _call_openai(
        self, spec, system_prompt, user_prompt, image_urls, max_tokens, temperature, json_mode
    ) -> tuple[str, int, int]:
        client = self._get_openai_client()
        user_content: Any = user_prompt
        if image_urls:
            user_content = [{"type": "text", "text": user_prompt}]
            for url in image_urls:
                user_content.append({"type": "image_url", "image_url": {"url": url}})

        kwargs: dict[str, Any] = dict(
            model=spec.model_name,
            max_tokens=max_tokens,
            temperature=temperature,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
        )
        if json_mode and not image_urls:
            kwargs["response_format"] = {"type": "json_object"}

        try:
            resp = await client.chat.completions.create(**kwargs)
        except Exception as exc:  # noqa: BLE001
            raise ProviderCallError(f"OpenAI call failed: {exc}") from exc

        text = resp.choices[0].message.content or ""
        usage = resp.usage
        return text, usage.prompt_tokens, usage.completion_tokens

    async def _call_gemini(
        self, spec, system_prompt, user_prompt, image_urls, max_tokens, temperature
    ) -> tuple[str, int, int]:
        genai = self._get_gemini_module()
        model = genai.GenerativeModel(
            model_name=spec.model_name, system_instruction=system_prompt
        )
        parts: list[Any] = [user_prompt]
        if image_urls:
            import httpx

            async with httpx.AsyncClient(timeout=20) as client:
                for url in image_urls:
                    try:
                        img_resp = await client.get(url)
                        parts.append({"mime_type": "image/png", "data": img_resp.content})
                    except Exception as exc:  # noqa: BLE001
                        logger.warning("Failed fetching reference image %s: %s", url, exc)

        try:
            resp = await asyncio.to_thread(
                model.generate_content,
                parts,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=max_tokens, temperature=temperature
                ),
            )
        except Exception as exc:  # noqa: BLE001
            raise ProviderCallError(f"Gemini call failed: {exc}") from exc

        text = resp.text or ""
        prompt_tok = count_tokens(system_prompt + user_prompt)
        completion_tok = count_tokens(text)
        return text, prompt_tok, completion_tok


def parse_json_response(raw_text: str) -> dict[str, Any]:
    """
    Robustly parse a model's JSON response, stripping accidental markdown
    fences the model may add despite instructions.
    """
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("```")[1]
        if cleaned.startswith("json"):
            cleaned = cleaned[4:]
    cleaned = cleaned.strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as exc:
        # Last-resort: extract the largest {...} span.
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(cleaned[start : end + 1])
            except json.JSONDecodeError:
                pass
        raise ValueError(f"Model response was not valid JSON: {exc}") from exc
