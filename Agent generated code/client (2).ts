// [Claude.A14] Typed fetch client for the Advanced AI Engine backend.
// Every method returns the unwrapped `data` field on success and throws
// an AIClientError on failure/timeout/rate-limit, so calling hooks don't
// need to repeat the same success/error branching everywhere.

import type {
  AIResponse,
  AnalyzeReferenceRequest,
  AnalyzeReferenceResponse,
  ConvertFormatRequest,
  DesignGenerationProgress,
  ExecuteCommandRequest,
  ExecuteCommandResponse,
  GenerateAnimationRequest,
  GenerateCodeRequest,
  GenerateDesignRequest,
  GenerateDesignResponse,
  GenerateShaderRequest,
  GeneratedAnimation,
  GeneratedCode,
  GeneratedShader,
  OptimizeRequest,
  OptimizeResponse,
  RefineRequest,
  SuggestRequest,
  SuggestResponse,
  TransferStyleRequest,
  TransferStyleResponse,
} from "./types";

export class AIClientError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = "AIClientError";
    this.status = status;
    this.detail = detail;
  }
}

export interface AIClientConfig {
  baseUrl: string;
  userId?: string;
  fetchImpl?: typeof fetch;
}

export class AIClient {
  private baseUrl: string;
  private userId?: string;
  private fetchImpl: typeof fetch;

  constructor(config: AIClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.userId = config.userId;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  private async post<TResponse>(path: string, body: unknown, signal?: AbortSignal): Promise<TResponse> {
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.userId ? { "X-User-Id": this.userId } : {}),
      },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      let detail: unknown;
      try {
        detail = await res.json();
      } catch {
        detail = await res.text();
      }
      throw new AIClientError(`AI request failed: ${res.status}`, res.status, detail);
    }

    const json = (await res.json()) as AIResponse<TResponse>;
    if (!json.success) {
      throw new AIClientError(json.error ?? "AI request returned an error", res.status, json);
    }
    return json.data as TResponse;
  }

  // --- 1. Design generation -----------------------------------------------
  generateDesign(request: GenerateDesignRequest, signal?: AbortSignal) {
    return this.post<GenerateDesignResponse>("/api/ai/generate-design", request, signal);
  }

  /**
   * Streams progress via SSE. Yields DesignGenerationProgress frames as
   * they arrive; the final frame has status "done" | "error" | "cancelled".
   */
  async *streamGenerateDesign(
    request: GenerateDesignRequest,
    signal?: AbortSignal
  ): AsyncGenerator<DesignGenerationProgress> {
    const res = await this.fetchImpl(`${this.baseUrl}/api/ai/generate-design/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.userId ? { "X-User-Id": this.userId } : {}),
      },
      body: JSON.stringify(request),
      signal,
    });

    if (!res.ok || !res.body) {
      throw new AIClientError(`Stream request failed: ${res.status}`, res.status);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";

      for (const rawEvent of events) {
        const dataLine = rawEvent.split("\n").find((l) => l.startsWith("data:"));
        if (!dataLine) continue;
        try {
          const parsed = JSON.parse(dataLine.slice(5).trim());
          yield parsed as DesignGenerationProgress;
        } catch {
          // ignore malformed SSE frame
        }
      }
    }
  }

  cancelTask(taskId: string) {
    return this.post<{ cancelled: boolean; taskId: string }>(`/api/ai/tasks/${taskId}/cancel`, {});
  }

  // --- 2. Reference analysis -----------------------------------------------
  analyzeReference(request: AnalyzeReferenceRequest, signal?: AbortSignal) {
    return this.post<AnalyzeReferenceResponse>("/api/ai/analyze-reference", request, signal);
  }

  // --- 3. Animation ----------------------------------------------------------
  async generateAnimation(request: GenerateAnimationRequest, signal?: AbortSignal) {
    const data = await this.post<{ animation: GeneratedAnimation }>(
      "/api/ai/generate-animation",
      request,
      signal
    );
    return data.animation;
  }

  // --- 4. Shader --------------------------------------------------------
  async generateShader(request: GenerateShaderRequest, signal?: AbortSignal) {
    const data = await this.post<{ shader: GeneratedShader }>("/api/ai/generate-shader", request, signal);
    return data.shader;
  }

  // --- 5. Code generation --------------------------------------------------
  generateCode(request: GenerateCodeRequest, signal?: AbortSignal) {
    return this.post<GeneratedCode>("/api/ai/generate-code", request, signal);
  }

  // --- 6. Style transfer --------------------------------------------------
  transferStyle(request: TransferStyleRequest, signal?: AbortSignal) {
    return this.post<TransferStyleResponse>("/api/ai/transfer-style", request, signal);
  }

  // --- 7. Format conversion ------------------------------------------------
  convertFormat(request: ConvertFormatRequest, signal?: AbortSignal) {
    return this.post<Record<string, unknown>>("/api/ai/convert-format", request, signal);
  }

  // --- 8. Refinement ----------------------------------------------------
  refine(request: RefineRequest, signal?: AbortSignal) {
    return this.post<Record<string, unknown>>("/api/ai/refine", request, signal);
  }

  undoRefinement(designId: string) {
    return this.post<Record<string, unknown>>(`/api/ai/refine/${designId}/undo`, {});
  }

  // --- 9. Suggestions -----------------------------------------------------
  suggest(request: SuggestRequest, signal?: AbortSignal) {
    return this.post<SuggestResponse>("/api/ai/suggest", request, signal);
  }

  // --- 10. NLP commands ---------------------------------------------------
  executeCommand(request: ExecuteCommandRequest, signal?: AbortSignal) {
    return this.post<ExecuteCommandResponse>("/api/ai/execute-command", request, signal);
  }

  // --- 11. Optimization ---------------------------------------------------
  optimize(request: OptimizeRequest, signal?: AbortSignal) {
    return this.post<OptimizeResponse>("/api/ai/optimize", request, signal);
  }

  // --- Status / models -----------------------------------------------------
  async getStatus() {
    const res = await this.fetchImpl(`${this.baseUrl}/api/ai/status`);
    return res.json();
  }

  async listModels() {
    const res = await this.fetchImpl(`${this.baseUrl}/api/ai/models`);
    return res.json();
  }
}

let _defaultClient: AIClient | null = null;

export function getAIClient(config?: Partial<AIClientConfig>): AIClient {
  if (!_defaultClient || config) {
    _defaultClient = new AIClient({
      baseUrl: config?.baseUrl ?? process.env.NEXT_PUBLIC_AI_ENGINE_URL ?? "http://localhost:8001",
      userId: config?.userId,
      fetchImpl: config?.fetchImpl,
    });
  }
  return _defaultClient;
}
