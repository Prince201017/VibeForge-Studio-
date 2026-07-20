# AI Integration [V0.A4]

Built from INDEX.md bullet only ("FastAPI backend, design generation, 4000-5000 LOC") —
real `04_V0_A4_AI_INTEGRATION.md` not provided.

## Included
- `schemas.py` — request/response models
- `generation_service.py` — calls the Anthropic Messages API, parses model output into
  scene-graph nodes, fails safely on unparsable output (skips bad nodes vs crashing)
- `router.py` — `/api/ai/generate`, `/api/ai/refine` endpoints
- Mocked-HTTP tests via `respx` (no live API calls)

## Not included (would need real spec)
Style-transfer conditioning, reference-asset embedding lookup, streaming generation,
generation history/versioning — the index only names "design generation" broadly.
