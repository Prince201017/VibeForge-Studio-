// [Claude.A14] React hooks wrapping lib/ai/client.ts.
// Each hook owns its own loading/error/data state and an AbortController
// so callers get cancel-on-unmount / cancel-on-refire for free, matching
// the spec's "Cancellation support" requirement on the frontend side too.

import { useCallback, useEffect, useRef, useState } from "react";
import { AIClient, AIClientError, getAIClient } from "./client";
import type {
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

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: AIClientError | Error | null;
}

function useAIClient(client?: AIClient): AIClient {
  return client ?? getAIClient();
}

/**
 * Generic factory used by all the concrete hooks below so each one stays a
 * one-liner instead of re-implementing state/abort plumbing.
 */
function useAIAction<TRequest, TResponse>(
  action: (client: AIClient, request: TRequest, signal: AbortSignal) => Promise<TResponse>,
  client?: AIClient
) {
  const aiClient = useAIClient(client);
  const [state, setState] = useState<AsyncState<TResponse>>({ data: null, loading: false, error: null });
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(
    async (request: TRequest) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({ data: null, loading: true, error: null });
      try {
        const data = await action(aiClient, request, controller.signal);
        setState({ data, loading: false, error: null });
        return data;
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          setState((s) => ({ ...s, loading: false }));
          return null;
        }
        setState({ data: null, loading: false, error: error as Error });
        throw error;
      }
    },
    [aiClient, action]
  );

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { ...state, run, cancel };
}

// --- 1. Design generation ---------------------------------------------------
export function useAIGenerate(client?: AIClient) {
  return useAIAction<GenerateDesignRequest, GenerateDesignResponse>(
    (c, req, signal) => c.generateDesign(req, signal),
    client
  );
}

/** Streaming variant with live progress updates for long-running generations. */
export function useAIGenerateStream(client?: AIClient) {
  const aiClient = useAIClient(client);
  const [progress, setProgress] = useState<DesignGenerationProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const run = useCallback(
    async (request: GenerateDesignRequest) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      setProgress(null);

      try {
        for await (const frame of aiClient.streamGenerateDesign(request, controller.signal)) {
          setProgress(frame);
          if (frame.status === "done" || frame.status === "error" || frame.status === "cancelled") {
            break;
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") setError(err as Error);
      } finally {
        setLoading(false);
      }
    },
    [aiClient]
  );

  const cancel = useCallback(async () => {
    if (progress?.taskId) {
      await aiClient.cancelTask(progress.taskId).catch(() => undefined);
    }
    abortRef.current?.abort();
  }, [aiClient, progress?.taskId]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { progress, loading, error, run, cancel };
}

// --- 2. Reference analysis ---------------------------------------------------
export function useAnalyzeReference(client?: AIClient) {
  return useAIAction<AnalyzeReferenceRequest, AnalyzeReferenceResponse>(
    (c, req, signal) => c.analyzeReference(req, signal),
    client
  );
}

// --- 3. Animation ------------------------------------------------------------
export function useGenerateAnimation(client?: AIClient) {
  return useAIAction<GenerateAnimationRequest, GeneratedAnimation>(
    (c, req, signal) => c.generateAnimation(req, signal),
    client
  );
}

// --- 4. Shader ----------------------------------------------------------------
export function useGenerateShader(client?: AIClient) {
  return useAIAction<GenerateShaderRequest, GeneratedShader>(
    (c, req, signal) => c.generateShader(req, signal),
    client
  );
}

// --- 5. Code generation --------------------------------------------------------
export function useGenerateCode(client?: AIClient) {
  return useAIAction<GenerateCodeRequest, GeneratedCode>(
    (c, req, signal) => c.generateCode(req, signal),
    client
  );
}

// --- 6. Style transfer ----------------------------------------------------------
export function useTransferStyle(client?: AIClient) {
  return useAIAction<TransferStyleRequest, TransferStyleResponse>(
    (c, req, signal) => c.transferStyle(req, signal),
    client
  );
}

// --- 7. Format conversion ----------------------------------------------------
export function useConvertFormat(client?: AIClient) {
  return useAIAction<ConvertFormatRequest, Record<string, unknown>>(
    (c, req, signal) => c.convertFormat(req, signal),
    client
  );
}

// --- 8. Refinement -------------------------------------------------------------
export function useRefineDesign(client?: AIClient) {
  const action = useAIAction<RefineRequest, Record<string, unknown>>(
    (c, req, signal) => c.refine(req, signal),
    client
  );
  const aiClient = useAIClient(client);

  const undo = useCallback(
    async (designId: string) => {
      return aiClient.undoRefinement(designId);
    },
    [aiClient]
  );

  return { ...action, undo };
}

// --- 9. Suggestions -------------------------------------------------------
export function useSuggest(client?: AIClient) {
  return useAIAction<SuggestRequest, SuggestResponse>((c, req, signal) => c.suggest(req, signal), client);
}

// --- 10. NLP commands ----------------------------------------------------------
export function useExecuteCommand(client?: AIClient) {
  return useAIAction<ExecuteCommandRequest, ExecuteCommandResponse>(
    (c, req, signal) => c.executeCommand(req, signal),
    client
  );
}

// --- 11. Optimization ------------------------------------------------------
export function useOptimize(client?: AIClient) {
  return useAIAction<OptimizeRequest, OptimizeResponse>((c, req, signal) => c.optimize(req, signal), client);
}

// --- Status ---------------------------------------------------------------
export function useAIStatus(client?: AIClient) {
  const aiClient = useAIClient(client);
  const [status, setStatus] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    aiClient
      .getStatus()
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [aiClient]);

  return { status, loading };
}
