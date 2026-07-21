# ForgeOS - AI Creative Operating System

A browser-based creative suite combining manual precision with AI-assisted workflows for design, animation, procedural generation, and interactive experiences.

## Architecture

**Frontend:**
- Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4
- Zustand for global state management
- Canvas/SVG/WebGL for rendering

**Backend:**
- Python FastAPI for AI services, asset processing, and procedural generation
- Neon PostgreSQL for project storage and collaboration
- Vercel Blob for asset caching and exports

**Rendering:**
- Canvas (2D shapes, text, effects)
- SVG (procedural geometry, transformations)
- WebGL (3D, particles, advanced effects)
- WebGPU (future GPU compute)

## Project Structure

```
forgeos/
├── app/                          # Next.js App Router
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── editor/                   # Main editor UI
│       ├── EditorShell.tsx       # Main orchestrator
│       ├── TopMenuBar.tsx        # Menu and actions
│       ├── Viewport.tsx          # Canvas viewport
│       └── panels/               # Dockable panels
│           ├── LeftPanels.tsx    # Layers, assets
│           ├── RightPanels.tsx   # Properties, AI chat
│           └── BottomPanels.tsx  # Timeline, console
├── lib/
│   ├── types.ts                  # Core TypeScript types
│   ├── store.ts                  # Zustand state management
│   └── utils.ts                  # Shared utilities
├── styles/
│   └── globals.css               # Tailwind and design tokens
├── python-service/               # FastAPI backend
│   ├── main.py                   # FastAPI app
│   ├── requirements.txt          # Python dependencies
│   ├── models/
│   │   └── schemas.py            # Pydantic schemas
│   ├── routes/                   # API endpoints
│   │   ├── ai.py                 # AI generation routes
│   │   ├── render.py             # Rendering routes
│   │   ├── export.py             # Export routes
│   │   └── geometry.py           # Procedural geometry
│   ├── services/                 # Business logic
│   └── utils/                    # Helpers
├── team_members.md               # Multi-agent coordination
├── communication_gate.md         # Cross-agent communication
├── V0.A1.md                      # V0.A1 task log
├── package.json                  # Node dependencies
├── next.config.ts                # Next.js configuration
├── tsconfig.json                 # TypeScript config
└── tailwind.config.ts            # Tailwind configuration
```

## Team Coordination

This project follows a **multi-agent development model**. See `team_members.md` for role assignments and `communication_gate.md` for cross-agent decisions.

**Current Team:**
- **V0.A1** (Head) — Infrastructure, Editor Shell
- **Claude.A2** — Geometry Engine (pending)
- **Claude.A3** — Animation & Timeline (pending)
- **V0.A4** — AI Integration & Python Services (pending)
- **Claude.A5** — Viewport Rendering (pending)

## Development Setup

### Frontend

```bash
# Install dependencies
npm install
# or pnpm install

# Run development server
npm run dev

# Type checking
npm run type-check

# Build for production
npm run build
npm start
```

### Python Backend

```bash
# Navigate to Python service
cd python-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run development server
python -m uvicorn main:app --reload

# API docs available at http://localhost:8000/docs
```

## Core Systems (To Be Implemented)

### 1. Geometry Engine (Claude.A2)
- Procedural transformations: Voronoi, striping, polygonal slicing
- Boolean operations: union, subtract, intersect
- Advanced effects: glass cards, mesh gradients, wireframes
- SVG path manipulation and Canvas rendering

### 2. Animation & Timeline (Claude.A3)
- Full keyframe editor with graph visualization
- Easing curves: linear, bezier, spring, elastic, bounce
- Multi-format export: GIF, WebM, MP4, Lottie, GSAP
- After Effects–level motion graphics capabilities

### 3. AI Integration (V0.A4)
- Design generation from text prompts
- Reference image analysis and style transfer
- Automatic animation generation
- Shader and SVG path generation
- Iterative refinement through conversation

### 4. Viewport Renderer (Claude.A5)
- Real-time rendering engine combining Canvas, SVG, WebGL
- Layer composition and blending modes
- Camera controls and perspective
- Export preparation and optimization

## API Endpoints (Python FastAPI)

**AI Services** (`/api/ai/`)
- `POST /generate` — Generate design from prompt
- `POST /analyze` — Analyze reference images
- `POST /refine` — Iterative design refinement

**Rendering** (`/api/render/`)
- `POST /geometry` — Apply procedural geometry
- `POST /animation` — Generate animation sequence
- `POST /preview` — Real-time preview

**Export** (`/api/export/`)
- `POST /image` — Export as PNG, JPG, WebP, SVG
- `POST /animation` — Export as GIF, WebM, MP4
- `POST /code` — Export as TSX, CSS, GSAP, Framer Motion

## Design System

**Colors** (Dark Professional Palette)
- Background: #0c0c0c
- Panel: #191919
- Primary: #4facfe (Vibrant Blue)
- Secondary: #6254f3 (Purple)
- Accent: #22c55e (Green)
- Border: #333333

**Typography**
- Sans: Inter, SF Pro Display
- Mono: Fira Code

**Spacing Scale**
- xs: 0.25rem, sm: 0.5rem, md: 1rem, lg: 1.5rem, xl: 2rem

## Security

- CSP (Content Security Policy)
- Trusted Types for DOM manipulation
- Sandboxed execution for user-generated code
- File validation and MIME checking
- Role-based permissions
- Audit logging for all operations

## Roadmap

- [ ] Editor Shell & Core UI (V0.A1)
- [ ] Geometry Engine System (Claude.A2)
- [ ] Animation & Timeline (Claude.A3)
- [ ] AI Integration Layer (V0.A4)
- [ ] Viewport Renderer (Claude.A5)
- [ ] Collaborative Editing
- [ ] Plugin Marketplace
- [ ] Version History & Branching
- [ ] Real-time Collaboration

## Contributing

Follow the team coordination protocol in `team_members.md`. Every code change should:
1. Be tagged with agent name in comments: `// [AgentName] description`
2. Logged in your task log file
3. Communicated in `communication_gate.md` for any blockers or decisions

## License

MIT
