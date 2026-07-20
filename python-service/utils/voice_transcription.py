"""
[Claude.A14] Voice transcription (spec section 10 — "Convert voice to
design actions"). This was the missing half of NLP commands: text
parsing existed, audio input didn't.

Uses OpenAI's Whisper transcription endpoint by default. The interface
is provider-agnostic (`TranscriptionProvider` protocol) so a self-hosted
whisper.cpp/faster-whisper backend can be swapped in later without
touching nlp_commands.py or the route layer.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Protocol

from config import Settings, get_settings

logger = logging.getLogger("ai_engine.voice_transcription")


class TranscriptionError(Exception):
    pass


@dataclass
class TranscriptionResult:
    text: str
    language: str | None = None
    duration_seconds: float | None = None
    provider: str = "openai-whisper"


class TranscriptionProvider(Protocol):
    async def transcribe(self, audio_bytes: bytes, filename: str, language_hint: str | None) -> TranscriptionResult: ...


class OpenAIWhisperProvider:
    """Wraps OpenAI's /v1/audio/transcriptions (whisper-1 / gpt-4o-transcribe)."""

    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()
        self._client = None

    def _get_client(self):
        if self._client is None:
            if not self.settings.openai_api_key:
                raise TranscriptionError("OPENAI_API_KEY not configured; voice transcription unavailable")
            from openai import AsyncOpenAI

            self._client = AsyncOpenAI(api_key=self.settings.openai_api_key)
        return self._client

    async def transcribe(self, audio_bytes: bytes, filename: str, language_hint: str | None = None) -> TranscriptionResult:
        client = self._get_client()
        import io

        audio_file = io.BytesIO(audio_bytes)
        audio_file.name = filename or "command.webm"

        try:
            kwargs = {"model": "whisper-1", "file": audio_file}
            if language_hint:
                kwargs["language"] = language_hint
            resp = await client.audio.transcriptions.create(**kwargs)
        except Exception as exc:  # noqa: BLE001
            raise TranscriptionError(f"Whisper transcription failed: {exc}") from exc

        text = getattr(resp, "text", None) or (resp.get("text") if isinstance(resp, dict) else "")
        return TranscriptionResult(text=text, language=language_hint, provider="openai-whisper")


class VoiceCommandService:
    """
    High-level entry point used by routes/ai.py: transcribes audio, then
    hands the resulting text to NLPCommandParser so voice and typed
    commands share one parsing/validation path.
    """

    # Simple size guard - Whisper's API caps uploads at 25MB; we fail fast
    # with a clear error instead of letting the provider reject it opaquely.
    MAX_AUDIO_BYTES = 25 * 1024 * 1024

    def __init__(self, provider: TranscriptionProvider | None = None):
        self.provider = provider or OpenAIWhisperProvider()

    async def transcribe(self, audio_bytes: bytes, filename: str = "command.webm", language_hint: str | None = None) -> TranscriptionResult:
        if not audio_bytes:
            raise TranscriptionError("No audio data received")
        if len(audio_bytes) > self.MAX_AUDIO_BYTES:
            raise TranscriptionError(
                f"Audio file too large ({len(audio_bytes)} bytes, max {self.MAX_AUDIO_BYTES})"
            )
        result = await self.provider.transcribe(audio_bytes, filename, language_hint)
        if not result.text.strip():
            raise TranscriptionError("Transcription returned empty text — audio may be silent or unintelligible")
        return result
