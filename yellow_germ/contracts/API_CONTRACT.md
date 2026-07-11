# API Contract - All Agents Must Follow

**Version:** 1.0  
**Status:** LOCKED (no changes without team approval)  
**Last Updated:** 2026-07-12

---

## Base URL & Routing

```
Frontend Base: http://localhost:3000
Backend Base: http://localhost:8000
Next.js Rewrites: /api/* → http://localhost:8000/*
```

All endpoints follow REST + JSON convention.

---

## Request/Response Format

### Standard Request
```json
{
  "projectId": "uuid",
  "sessionId": "uuid",
  "timestamp": "2026-07-12T10:00:00Z",
  "data": { ... }
}
```

### Standard Response (Success)
```json
{
  "success": true,
  "data": { ... },
  "metadata": {
    "requestId": "uuid",
    "processingTime": 123,
    "timestamp": "2026-07-12T10:00:00Z"
  }
}
```

### Standard Response (Error)
```json
{
  "success": false,
  "error": {
    "code": "GEOMETRY_ERROR",
    "message": "Invalid parameters",
    "details": { ... }
  },
  "metadata": { ... }
}
```

---

## Geometry Endpoints

### POST /api/geometry/process

Process geometry with specified operation.

**Request:**
```json
{
  "projectId": "uuid",
  "layerId": "uuid",
  "operation": "voronoi",
  "params": {
    "points": [[x, y], ...],
    "width": 1920,
    "height": 1080,
    "relaxation": 3
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "geometry": {
      "paths": [{ "commands": [...], "closed": true }],
      "bounds": { "x": 0, "y": 0, "width": 1920, "height": 1080 }
    },
    "metadata": {
      "operationId": "uuid",
      "operation": "voronoi",
      "pointCount": 42,
      "pathCount": 42,
      "processingTime": 150
    }
  }
}
```

**Error Codes:**
- `INVALID_OPERATION` — Unknown operation
- `INVALID_PARAMS` — Parameters fail validation
- `TIMEOUT` — Operation took too long (> 500ms)
- `GEOMETRY_ERROR` — Processing failed

---

### POST /api/geometry/export

Export geometry to format.

**Request:**
```json
{
  "projectId": "uuid",
  "geometryId": "uuid",
  "format": "svg" | "png" | "json",
  "options": {
    "width": 1920,
    "height": 1080,
    "dpi": 72,
    "background": "#ffffff"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://blob.storage/exports/...",
    "format": "svg",
    "size": 45000,
    "mimeType": "image/svg+xml"
  }
}
```

---

## Animation Endpoints

### POST /api/animation/interpolate

Interpolate animation value at time.

**Request:**
```json
{
  "projectId": "uuid",
  "layerId": "uuid",
  "property": "transform.position.x",
  "time": 1.5,
  "keyframes": [
    { "time": 0, "value": 0, "easing": "linear" },
    { "time": 2, "value": 100, "easing": "easeInOutCubic" }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "value": 50,
    "interpolated": true,
    "accuracy": 0.99
  }
}
```

---

### POST /api/animation/render

Render animation to video/frames.

**Request:**
```json
{
  "projectId": "uuid",
  "duration": 3.0,
  "fps": 30,
  "format": "mp4" | "png" | "apng",
  "quality": "high" | "medium" | "low"
}
```

**Response (Streaming):**
SSE stream with progress events:
```
data: {"status":"started"}
data: {"status":"processing","frame":10,"total":90}
data: {"status":"complete","url":"https://...","format":"mp4"}
```

---

## AI Endpoints

### POST /api/ai/generate-design

Generate design from prompt.

**Request:**
```json
{
  "projectId": "uuid",
  "prompt": "Convert this portrait into diagonal premium geometry with glossy reflections",
  "reference_images": ["https://..."],
  "style": "luxury-brand",
  "width": 1920,
  "height": 1080,
  "stream": true
}
```

**Response (Streaming):**
```
data: {"status":"analyzing_references"}
data: {"status":"generating","progress":0.3}
data: {"status":"complete","design":{...}}
```

---

### POST /api/ai/analyze-reference

Analyze uploaded reference image.

**Request (multipart):**
```
Content-Type: multipart/form-data
file: <binary image data>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "colors": [
      { "hex": "#123456", "name": "navy", "percentage": 45 }
    ],
    "composition": {
      "rule_of_thirds": 0.95,
      "symmetry": 0.2,
      "balance": "asymmetric"
    },
    "style": "luxury-minimalist",
    "patterns": ["grid", "circles"],
    "recommendations": [...]
  }
}
```

---

## Rendering Endpoints

### POST /api/render/canvas

Render layers to canvas image.

**Request:**
```json
{
  "projectId": "uuid",
  "frame": 0,
  "width": 1920,
  "height": 1080,
  "format": "png" | "webp" | "jpeg"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://blob.storage/renders/...",
    "mimeType": "image/png",
    "size": 1024000
  }
}
```

---

### POST /api/render/export

Export complete project.

**Request:**
```json
{
  "projectId": "uuid",
  "format": "mp4" | "gif" | "svg" | "html" | "css",
  "options": {
    "fps": 30,
    "quality": "high",
    "compression": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://blob.storage/exports/project.mp4",
    "format": "mp4",
    "duration": 3.0,
    "size": 5000000,
    "metadata": {...}
  }
}
```

---

## Error Response Codes (HTTP)

| Code | Meaning               |
|------|----------------------|
| 200  | Success              |
| 201  | Created              |
| 400  | Bad Request          |
| 401  | Unauthorized         |
| 403  | Forbidden            |
| 404  | Not Found            |
| 422  | Validation Error     |
| 429  | Rate Limited         |
| 500  | Internal Server Error|
| 504  | Gateway Timeout      |

---

## Validation Rules (STRICT)

### Geometry Operations
- Must accept only valid operation names
- Parameters must match schema for operation
- Must validate point arrays, dimensions, angles
- Must return valid Path structures

### Animation Values
- Times must be non-negative numbers
- Values must match property type
- Easing must be valid function or preset
- Must handle out-of-range frames gracefully

### Image Uploads
- Max size: 10MB
- Allowed formats: PNG, JPG, WEBP, GIF
- Must validate MIME type
- Must scan for malware (if available)

### Export Options
- Width/height must be positive integers (max 4K)
- FPS must be 24-60
- Quality must be 'low', 'medium', 'high'
- Compression ratio must be 0-1

---

## Rate Limiting

All endpoints limited by:
- 100 requests/minute per session
- 10 concurrent requests per session
- 30 second timeout per request

Returns `429 Too Many Requests` when exceeded.

---

## Response Times (SLA)

| Operation              | Target | Max  |
|------------------------|--------|------|
| Geometry process       | < 200ms| 500ms|
| Image analysis         | < 1s   | 5s   |
| Animation interpolate  | < 50ms | 200ms|
| AI generation          | < 3s   | 30s  |
| Canvas render          | < 100ms| 500ms|
| Export coordination    | < 1s   | 60s  |

---

## Authentication (Future)

All requests include optional header:
```
Authorization: Bearer <jwt_token>
```

If provided, tied to user project. If not provided, uses session ID.

---

## Versioning

API version in header:
```
X-API-Version: 1.0
```

Changes breaking compatibility will increment major version.

---

## Summary

**All agents must respect this contract:**
- Request/response formats exactly as specified
- Error codes as documented
- Performance targets as baseline
- Validation rules non-negotiable
- No endpoint modifications without team approval

**Any deviations require communication_gate.md discussion.**
