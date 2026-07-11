# V0.A4 - AI Integration & FastAPI Backend Specification

**Agent:** V0.A4  
**Task:** AI Services - Design Generation, Reference Analysis, Python FastAPI Routes  
**LOC Target:** 4000-5000 lines  
**Complexity:** Very High  
**Files:** 15-20  
**Timeline:** Phase 1 (5 days)

---

## Executive Summary

Build the AI-powered backend service using FastAPI. Implement design generation, reference image analysis, composition suggestions, and style synthesis. Agents must understand uploaded images and generate designs matching natural language descriptions.

**Key Deliverables:**
- FastAPI service with async endpoints
- Design generation pipeline (via Vercel AI Gateway or custom models)
- Reference image analysis and feature extraction
- Prompt parsing and intent understanding
- Real-time streaming responses (SSE)
- Async task queue for heavy operations
- Comprehensive error handling and logging
- Response caching and optimization

---

## File Structure & Responsibilities

### Core FastAPI Backend

```
python-service/routes/ai.py (1500 LOC)
├─ Main AI endpoints (POST /ai/*)
├─ Design generation endpoint
├─ Reference analysis endpoint
├─ Suggestion endpoint
├─ Style synthesis endpoint
└─ [V0.A4] tagged all functions

python-service/services/design_generator.py (1200 LOC)
├─ Core design generation logic
├─ Prompt engineering
├─ Model orchestration
├─ Response parsing
├─ Parameter extraction
└─ Quality validation

python-service/services/image_analyzer.py (800 LOC)
├─ Image reference analysis
├─ Feature extraction (colors, composition, style)
├─ Geometric pattern detection
├─ Clustering and grouping
├─ Style classification
└─ Recommendation generation

python-service/services/style_synthesizer.py (600 LOC)
├─ Style merging and blending
├─ Aesthetic transfer
├─ Brand style analysis
├─ Tone and mood mapping
└─ Design guideline generation

python-service/models/ai_schemas.py (400 LOC)
├─ Pydantic models for requests
├─ Response schemas
├─ Error responses
├─ Streaming message types
└─ Full validation

python-service/utils/prompt_engineering.py (500 LOC)
├─ Prompt building utilities
├─ Template system for design descriptions
├─ Intent classification
├─ Parameter inference from text
├─ Response post-processing

python-service/utils/image_processing.py (400 LOC)
├─ Image loading and validation
├─ Format conversion
├─ Thumbnail generation
├─ Feature extraction helpers
└─ Caching and optimization

python-service/utils/cache.py (300 LOC)
├─ Request-response caching
├─ Cache invalidation
├─ Cache key generation
├─ Redis integration (if available)
└─ Memory cache fallback

python-service/routes/geometry.py (600 LOC)
├─ Geometry processing endpoints
├─ Procedural generation from AI output
├─ Parameter conversion
└─ Validation

python-service/routes/animation.py (400 LOC)
├─ Animation generation from prompts
├─ Motion suggestion
├─ Keyframe generation
└─ Timing optimization

components/editor/panels/AIChatPanel.tsx (800 LOC)
├─ AI chat UI component
├─ Message display and history
├─ File upload for references
├─ Streaming message rendering
├─ Suggestion buttons
└─ Real-time updates via SSE

hooks/useAI.ts (400 LOC)
├─ AI service integration hook
├─ Streaming message handling
├─ Error recovery
├─ State synchronization
└─ Cache management

lib/ai/types.ts (300 LOC)
├─ TypeScript interfaces for AI
├─ Request/response types
├─ Message types
├─ Error types
└─ Streaming types

__tests__/ai_integration.test.py (500 LOC)
├─ Unit tests for AI services
├─ Mock model testing
├─ Prompt validation tests
├─ Image analysis tests
└─ Integration tests
```

---

## Detailed Requirements

### 1. FastAPI AI Routes (`python-service/routes/ai.py`)

**Purpose:** Main HTTP endpoints for AI services.

**Required Endpoints:**

```python
# [V0.A4] Main AI routes
from fastapi import APIRouter, UploadFile, File
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/ai", tags=["AI"])

# POST /api/ai/generate-design
@router.post("/generate-design")
async def generate_design(request: GenerateDesignRequest) -> DesignGenerationResponse:
    """
    Generate a complete design from natural language description.
    
    Request body:
    {
      "prompt": "Convert this portrait into diagonal premium geometry with glossy reflections",
      "reference_images": ["url1", "url2"],
      "style": "luxury-brand",
      "width": 1920,
      "height": 1080,
      "format": ["geometry", "animation", "css"]
    }
    
    Response:
    {
      "design_id": "uuid",
      "geometry": {...},
      "animation": {...},
      "css": "...",
      "metadata": {...},
      "suggested_next_steps": [...]
    }
    
    Performance target: < 5 seconds
    """
    pass

# POST /api/ai/analyze-reference
@router.post("/analyze-reference")
async def analyze_reference(
    file: UploadFile = File(...),
    analysis_type: str = "full"
) -> ReferenceAnalysisResponse:
    """
    Analyze uploaded reference image for design insights.
    
    Returns:
    {
      "colors": [...],
      "composition": {...},
      "style": "...",
      "geometry_patterns": [...],
      "typography": {...},
      "recommendations": [...]
    }
    
    Performance target: < 2 seconds
    """
    pass

# POST /api/ai/suggest-improvements
@router.post("/suggest-improvements")
async def suggest_improvements(request: SuggestImprovementsRequest) -> SuggestionsResponse:
    """
    Suggest design improvements based on current design.
    
    Returns array of actionable suggestions:
    {
      "suggestions": [
        {
          "category": "composition",
          "suggestion": "...",
          "confidence": 0.95,
          "how_to_apply": {...}
        }
      ]
    }
    """
    pass

# POST /api/ai/describe-composition
@router.post("/describe-composition")
async def describe_composition(request: DescribeCompositionRequest) -> CompositionDescriptionResponse:
    """
    Generate natural language description of a design composition.
    
    Returns:
    {
      "description": "...",
      "analysis": {...},
      "style_keywords": [...],
      "technical_notes": [...]
    }
    """
    pass

# POST /api/ai/style-transfer (Streaming)
@router.post("/style-transfer", response_class=StreamingResponse)
async def style_transfer(request: StyleTransferRequest):
    """
    Stream style transfer results as they're generated.
    
    Yields server-sent events with generation progress.
    """
    async def generate():
        yield f"data: {json.dumps({'status': 'started'})}\n\n"
        # Process and yield updates
        yield f"data: {json.dumps({'status': 'complete', 'result': {...}})}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")

# POST /api/ai/merge-styles
@router.post("/merge-styles")
async def merge_styles(request: MergeStylesRequest) -> MergeStylesResponse:
    """
    Merge multiple reference images into cohesive style.
    
    Request:
    {
      "reference_images": ["url1", "url2", "url3"],
      "weights": [0.5, 0.3, 0.2],
      "description": "Apple meets Stripe with luxury glass"
    }
    """
    pass

# POST /api/ai/regenerate-parameter
@router.post("/regenerate-parameter")
async def regenerate_parameter(request: RegenerateParameterRequest):
    """
    Regenerate specific geometry or animation parameter.
    
    Target: < 1 second for fast iteration
    """
    pass
```

**Constraints:**
- All endpoints must validate input strictly
- All requests must include session/project context
- All responses must include metadata and timing
- Streaming endpoints must use SSE format
- Error responses must be detailed and actionable

---

### 2. Design Generator Service (`python-service/services/design_generator.py`)

**Purpose:** Core design generation logic.

**Required Class:**

```python
# [V0.A4] Design generation engine
class DesignGenerator:
    def __init__(self, model_name: str = "gpt-4-vision"):
        self.model = load_model(model_name)
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
    
    # [V0.A4] Parse prompt and extract design parameters
    def parse_prompt(self, prompt: str, references: List[str]) -> ParsedPrompt:
        """
        Extract structured design parameters from natural language.
        
        Returns:
        {
          "geometry_operations": [
            {"op": "voronoi", "params": {...}},
            {"op": "boolean_union", "params": {...}}
          ],
          "animation": {
            "duration": 3.0,
            "easing": "easeInOutCubic",
            "keyframes": [...]
          },
          "style": {
            "colors": ["#123456", "#ABCDEF"],
            "blur": 10,
            "glow": 5
          }
        }
        """
        pass
    
    # [V0.A4] Generate design from parameters
    async def generate_design(
        self, 
        prompt: str, 
        reference_urls: List[str],
        style_preset: str
    ) -> GeneratedDesign:
        """
        Generate complete design matching prompt and references.
        """
        pass
    
    # [V0.A4] Stream generation updates
    async def generate_design_streaming(self, request: GenerateDesignRequest):
        """
        Yield design updates as generation progresses.
        """
        pass
    
    # [V0.A4] Validate generated design
    def validate_design(self, design: GeneratedDesign) -> ValidationResult:
        """
        Check design is exportable and valid.
        """
        pass
    
    # [V0.A4] Refine design based on feedback
    async def refine_design(
        self,
        current_design: GeneratedDesign,
        feedback: str
    ) -> GeneratedDesign:
        """
        Iteratively improve design based on user feedback.
        """
        pass
```

**Key Methods:**

```python
# [V0.A4] Prompt engineering
def _build_system_prompt(self) -> str:
    """
    Build system prompt for design generation.
    Must include:
    - Design principles and best practices
    - Available geometry operations
    - Animation capabilities
    - Style guidelines
    - Output format specification
    """
    pass

# [V0.A4] Reference image analysis
def _analyze_references(self, urls: List[str]) -> ReferenceAnalysis:
    """
    Extract design elements from reference images.
    """
    pass

# [V0.A4] Parameter inference
def _infer_parameters(self, description: str) -> Dict[str, Any]:
    """
    Infer geometry and animation parameters from text.
    """
    pass
```

---

### 3. Image Analyzer Service (`python-service/services/image_analyzer.py`)

**Purpose:** Extract design insights from reference images.

**Required Class:**

```python
# [V0.A4] Image analysis engine
class ImageAnalyzer:
    def __init__(self):
        self.vision_model = load_vision_model()
        self.feature_extractor = FeatureExtractor()
    
    # [V0.A4] Analyze image for design elements
    async def analyze_image(self, image_url: str) -> ImageAnalysis:
        """
        Return:
        {
          "colors": [
            {"color": "#123456", "name": "navy", "count": 45},
            ...
          ],
          "composition": {
            "rule_of_thirds": 0.9,
            "symmetry": 0.3,
            "balance": "asymmetric"
          },
          "style": "minimalist | luxury | playful | technical",
          "geometry_patterns": ["grid", "circles", "diagonal_stripes"],
          "typography": {
            "font_types": ["sans-serif"],
            "weights": ["bold", "regular"],
            "sizes": [12, 24, 32]
          },
          "recommended_operations": [
            {"operation": "voronoi", "confidence": 0.8},
            ...
          ]
        }
        """
        pass
    
    # [V0.A4] Extract color palette
    def extract_colors(self, image_url: str, num_colors: int = 8) -> List[ColorInfo]:
        """
        Extract dominant colors with percentages.
        """
        pass
    
    # [V0.A4] Detect geometric patterns
    def detect_patterns(self, image_url: str) -> List[PatternInfo]:
        """
        Find repeating geometric patterns.
        """
        pass
    
    # [V0.A4] Classify style
    def classify_style(self, image_url: str) -> StyleClassification:
        """
        Classify design style (minimalist, luxury, playful, etc).
        """
        pass
    
    # [V0.A4] Generate recommendations
    def generate_recommendations(self, analysis: ImageAnalysis) -> List[Recommendation]:
        """
        Suggest design operations based on analysis.
        """
        pass
```

---

### 4. AI Chat Panel Component (`components/editor/panels/AIChatPanel.tsx`)

**Purpose:** User-facing AI chat interface.

**Required Component:**

```typescript
// [V0.A4] AI chat panel
export function AIChatPanel() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Message history */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
      </div>
      
      {/* File upload area */}
      <div className="p-4 border-t border-border">
        <FileUploadZone
          onFileSelect={(files) => setUploadedFiles(files)}
          maxFiles={5}
          acceptTypes={["image/*", ".pdf"]}
        />
        {uploadedFiles.map((file) => (
          <div key={file.name} className="flex items-center gap-2">
            <span>{file.name}</span>
            <button onClick={() => removeFile(file.name)}>×</button>
          </div>
        ))}
      </div>
      
      {/* Input area */}
      <div className="p-4 border-t border-border">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your design idea..."
            className="flex-1 resize-none"
            rows={3}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 bg-primary text-primary-foreground"
          >
            {isLoading ? "..." : "Send"}
          </button>
        </form>
      </div>
      
      {/* Quick action buttons */}
      <div className="p-4 border-t border-border flex gap-2 flex-wrap">
        <button onClick={() => sendPrompt("Make it more geometric")}>
          More Geometric
        </button>
        <button onClick={() => sendPrompt("Add animation")}>
          Add Animation
        </button>
        <button onClick={() => sendPrompt("Analyze composition")}>
          Analyze
        </button>
      </div>
    </div>
  )
  
  // Handle form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    
    // Add user message
    const userMsg: Message = { id: uuid(), role: "user", content: input }
    setMessages([...messages, userMsg])
    
    // Stream AI response
    await streamAIResponse(input, uploadedFiles)
    setInput("")
    setUploadedFiles([])
  }
  
  // [V0.A4] Stream SSE messages from backend
  async function streamAIResponse(prompt: string, files: File[]) {
    setIsLoading(true)
    
    // Upload files if any
    const fileUrls = await Promise.all(
      files.map(f => uploadFile(f))
    )
    
    // Stream response
    const response = await fetch("/api/ai/generate-design", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        reference_images: fileUrls,
        stream: true
      })
    })
    
    const reader = response.body?.getReader()
    if (!reader) return
    
    let aiMsg: Message = { id: uuid(), role: "assistant", content: "" }
    setMessages(msgs => [...msgs, aiMsg])
    
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      const text = new TextDecoder().decode(value)
      const lines = text.split("\n")
      
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = JSON.parse(line.slice(6))
          aiMsg.content += data.text || ""
          setMessages(msgs => msgs.map(m => m.id === aiMsg.id ? aiMsg : m))
        }
      }
    }
    
    setIsLoading(false)
  }
}
```

---

### 5. AI Hooks (`hooks/useAI.ts`)

**Purpose:** AI service integration for React.

**Required Hook:**

```typescript
// [V0.A4] Main AI integration hook
function useAI() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  // Generate design from prompt
  async function generateDesign(
    prompt: string,
    references: string[]
  ): Promise<GeneratedDesign> {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch("/api/ai/generate-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, reference_images: references })
      })
      
      if (!response.ok) throw new Error(await response.text())
      
      const design = await response.json()
      
      // Update viewport with generated design
      updateViewportWithDesign(design)
      
      return design
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setIsLoading(false)
    }
  }
  
  // Analyze reference image
  async function analyzeReference(file: File): Promise<ImageAnalysis> {
    setIsLoading(true)
    const formData = new FormData()
    formData.append("file", file)
    
    try {
      const response = await fetch("/api/ai/analyze-reference", {
        method: "POST",
        body: formData
      })
      
      return await response.json()
    } finally {
      setIsLoading(false)
    }
  }
  
  return { generateDesign, analyzeReference, isLoading, error }
}
```

---

## Environment Variables Required

```bash
# Model configuration
AI_MODEL_PROVIDER=vercel  # or openai, anthropic, etc
AI_MODEL_NAME=gpt-4-vision
AI_API_KEY=sk_...

# Image processing
IMAGE_MAX_SIZE=10485760  # 10MB
ALLOWED_IMAGE_FORMATS=png,jpg,jpeg,webp,gif

# Caching
CACHE_ENABLED=true
REDIS_URL=redis://localhost:6379  # Optional

# Performance
TIMEOUT_DESIGN_GENERATION=30
TIMEOUT_IMAGE_ANALYSIS=10

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

---

## Code Quality Standards (STRICT)

1. **All async operations must have timeout** — No hanging requests
2. **All file uploads must be validated** — MIME type, size, virus scan
3. **All model calls must have fallback** — Graceful degradation
4. **Comprehensive logging** — Every operation logged with context
5. **Error handling** — All errors caught and meaningful messages returned
6. **Type hints required** — Full Python type annotations
7. **Docstrings on all functions** — Google-style docstrings
8. **70%+ test coverage**

---

## Submission Checklist

Before pushing:

- [ ] All FastAPI endpoints implemented
- [ ] Design generator produces valid outputs
- [ ] Image analyzer extracts meaningful insights
- [ ] AI chat UI fully functional
- [ ] Streaming SSE working smoothly
- [ ] File upload with validation working
- [ ] Error handling comprehensive
- [ ] All environment variables documented
- [ ] 70%+ test coverage
- [ ] All functions tagged with [V0.A4]
- [ ] Git commit with detailed message
- [ ] Summary posted in communication_gate.md

Ready? Let's give this platform AI superpowers.
