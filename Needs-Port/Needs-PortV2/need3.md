# NEED 3: AI INTEGRATION - FastAPI Backend & Design Generation

## System Overview
Python FastAPI service that handles AI-powered design generation, reference image analysis, intent parsing, and style synthesis.

## What Goes In This System
- FastAPI backend with design generation endpoints
- Reference image analysis and feature extraction
- Prompt engineering and NLP intent parsing
- Design style synthesis and merging
- Model integration (Stable Diffusion, style transfer models)
- Background task processing

## Files to Create
- `python-service/routes/design_generator.py` - Main API routes
- `python-service/services/design_service.py` - Core design generation logic
- `python-service/services/image_analyzer.py` - Image analysis
- `python-service/services/style_synthesizer.py` - Style merging
- `python-service/models/requests.py` - Request schemas
- `python-service/models/responses.py` - Response schemas
- `python-service/utils/prompt_parser.py` - NLP prompt parsing
- `lib/hooks/useAI.ts` - React hook for frontend
- `components/ai/AIChatPanel.tsx` - Chat UI component
- `tests/ai_integration.test.ts` - Tests (70%+ coverage)

## LOC Target: 4000-5000 lines

## Quality Standards
- 100% TypeScript (frontend) + Python type hints (backend)
- 70% test coverage minimum
- JSDoc/docstrings on all functions
- [AgentName] tags on functions
- Performance: < 5s for design generation

## API Endpoints Required
- POST /api/ai/generate-design - Generate design from prompt
- POST /api/ai/analyze-reference - Analyze uploaded image
- POST /api/ai/merge-styles - Merge multiple reference styles
- POST /api/ai/generate-prompt-suggestions - Auto-complete prompts
- GET /api/ai/models - List available models
- POST /api/ai/style-transfer - Apply style to design
- WebSocket /api/ai/chat - Real-time AI chat

## Models to Integrate
- Stable Diffusion (image generation)
- CLIP (image-text matching)
- StyleGAN (style transfer)
- Custom fine-tuned model (design intent)

## Features Required
1. Text-to-design generation
2. Image analysis (colors, composition, style)
3. Multi-reference style merging
4. Prompt enhancement (suggest keywords)
5. Style transfer to existing designs
6. Real-time chat for iterative refinement
7. Design history and undo

## State Integration
Use Zustand store:
- `editorStore.setAIDesign()`
- `editorStore.updateFromAI()`
- Track AI generation history
- Store prompts and references
- Update viewport with generated design

## Database Integration
Store in Neon PostgreSQL:
- ai_generations table (prompt, result, timestamp)
- ai_references table (images, features, vectors)
- ai_styles table (style definitions, parameters)

## Deliverables Checklist
- All 7 API endpoints working
- Text-to-design generation working
- Image analysis feature working
- Style transfer working
- Real-time chat working
- All models integrated
- Frontend chat panel functional
- All tests passing
- Performance benchmarks met
- JSDoc complete
