/**
 * Sloth Inference Manager
 * Coordinates model lifecycle, WebGPU pre-flight feature gating,
 * background weight streaming, IndexedDB recipe caching, and instant heuristic fallback.
 */

import { DeterministicSlothEngine } from './heuristic-engine';
import { LazyChefDBAdapter, type CachedRecipe } from '../storage/db';
import { SafetyFilter } from './safety-filter';
import { validateSlothRecipe } from './validator';
import type { LazyRecipe } from '../types/recipe';
import type {
  WorkerInboundMessage,
  WorkerOutboundMessage
} from '../types/messages';

/**
 * Constructs structured prompt for Gemma 2B enforcing Sloth Constraints.
 */
export function buildSlothPrompt(ingredients: string[], urgency: string[] = []): string {
  const urgencySection =
    urgency.length > 0 ? `\nUrgent items to prioritize: ${urgency.join(', ')}.` : '';

  return `You are LazyChef, a zero-stress culinary autopilot.
Recommend EXACTLY ONE meal that satisfies the Sloth Constraints:
1. Exactly 1 cooking vessel (one of: "1 Skillet", "1 Pot", "1 Sheet Pan", "1 Microwave Bowl").
2. Exactly 1 to 3 cooking steps.
3. Total cooking time <= 15 minutes.

Available pantry ingredients: ${ingredients.join(', ')}.${urgencySection}

Respond ONLY with a valid JSON object matching this schema:
{
  "title": "string",
  "sloth_level": "Sloth Level 1: 1 Pan, 1 Spatula, 0 Knives" | "Sloth Level 2: 1 Pot, 1 Spoon, Minimal Prep" | "Sloth Level 3: 1 Sheet-Pan, Dump & Bake",
  "vessel": "1 Skillet" | "1 Pot" | "1 Sheet Pan" | "1 Microwave Bowl",
  "cook_time_minutes": number (1 to 15),
  "ingredients_used": string[],
  "grocery_gap": string[] (0 to 2 items),
  "steps": string[] (1 to 3 items),
  "lazy_payoff": {
    "decision_minutes_saved": 15,
    "money_saved_usd": 6.5,
    "dishes_saved": 2
  }
}`;
}

export type EngineStatus =
  | 'checking'
  | 'unsupported_webgpu'
  | 'streaming_model'
  | 'ready_webgpu'
  | 'error_fallback';

export interface ModelStreamingProgress {
  file: string;
  loaded: number;
  total: number;
  progress: number;
}

export type StatusListener = (status: EngineStatus) => void;
export type ProgressListener = (progress: ModelStreamingProgress) => void;

interface NavigatorWithGPU {
  gpu?: {
    requestAdapter: () => Promise<unknown>;
  };
}

/**
 * Checks whether WebGPU is supported by the current browser environment.
 * Performs both `navigator.gpu` existence check and adapter acquisition.
 */
export async function checkWebGPUSupport(): Promise<boolean> {
  if (typeof navigator === 'undefined') {
    return false;
  }
  const nav = navigator as unknown as NavigatorWithGPU;
  if (!nav.gpu) {
    return false;
  }
  try {
    const adapter = await nav.gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}

export class SlothInferenceManager {
  private static instance: SlothInferenceManager | null = null;

  private status: EngineStatus = 'checking';
  private progress: ModelStreamingProgress | null = null;
  private worker: Worker | null = null;
  private ollamaEnabled = false;
  private ollamaEndpoint = 'http://localhost:11434/api/generate';
  private ollamaModel = 'gemma2:2b';
  private pendingRequests = new Map<
    string,
    {
      resolve: (recipe: LazyRecipe) => void;
      reject: (err: Error) => void;
      timeoutId: ReturnType<typeof setTimeout>;
    }
  >();

  private statusListeners = new Set<StatusListener>();
  private progressListeners = new Set<ProgressListener>();

  private constructor() {}

  public static getInstance(): SlothInferenceManager {
    if (!SlothInferenceManager.instance) {
      SlothInferenceManager.instance = new SlothInferenceManager();
    }
    return SlothInferenceManager.instance;
  }

  public isOllamaEnabled(): boolean {
    return this.ollamaEnabled;
  }

  public setOllamaEnabled(enabled: boolean): void {
    this.ollamaEnabled = enabled;
  }

  public getOllamaEndpoint(): string {
    return this.ollamaEndpoint;
  }

  public setOllamaEndpoint(endpoint: string): void {
    this.ollamaEndpoint = endpoint;
  }

  public getOllamaModel(): string {
    return this.ollamaModel;
  }

  public setOllamaModel(model: string): void {
    this.ollamaModel = model;
  }

  public getStatus(): EngineStatus {
    return this.status;
  }

  public getProgress(): ModelStreamingProgress | null {
    return this.progress;
  }

  public onStatusChange(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  public onProgressChange(listener: ProgressListener): () => void {
    this.progressListeners.add(listener);
    if (this.progress) listener(this.progress);
    return () => this.progressListeners.delete(listener);
  }

  private setStatus(newStatus: EngineStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      for (const listener of this.statusListeners) {
        try {
          listener(this.status);
        } catch (e) {
          console.error('Error in status listener:', e);
        }
      }
    }
  }

  private setProgress(progress: ModelStreamingProgress): void {
    this.progress = progress;
    for (const listener of this.progressListeners) {
      try {
        listener(this.progress);
      } catch (e) {
        console.error('Error in progress listener:', e);
      }
    }
  }

  /**
   * Initializes background streaming of Gemma 2B weights.
   * Suppresses download entirely if WebGPU is unsupported.
   */
  public async initBackgroundPipeline(): Promise<void> {
    const hasWebGPU = await checkWebGPUSupport();
    if (!hasWebGPU) {
      this.setStatus('unsupported_webgpu');
      return;
    }

    try {
      this.setStatus('streaming_model');
      this.worker = new Worker(
        new URL('../workers/inference.worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (e: MessageEvent<WorkerOutboundMessage>) => {
        this.handleWorkerMessage(e.data);
      };

      this.worker.onerror = (err) => {
        console.warn('Web Worker error, falling back to heuristic engine:', err);
        this.setStatus('error_fallback');
      };

      // Dispatch initialization command
      const initMsg: WorkerInboundMessage = { type: 'INIT_PIPELINE' };
      this.worker.postMessage(initMsg);
    } catch (err) {
      console.warn('Failed to spawn Web Worker:', err);
      this.setStatus('error_fallback');
    }
  }

  private handleWorkerMessage(msg: WorkerOutboundMessage): void {
    switch (msg.type) {
      case 'MODEL_STREAM_PROGRESS':
        this.setProgress({
          file: msg.file,
          loaded: msg.loaded,
          total: msg.total,
          progress: msg.progress
        });
        break;

      case 'MODEL_READY':
        this.setStatus('ready_webgpu');
        break;

      case 'RECIPE_SUCCESS': {
        const handler = this.pendingRequests.get(msg.requestId);
        if (handler) {
          clearTimeout(handler.timeoutId);
          this.pendingRequests.delete(msg.requestId);
          handler.resolve(msg.recipe);
        }
        break;
      }

      case 'ERROR': {
        if (msg.code === 'WEBGPU_UNAVAILABLE' || msg.code === 'DOWNLOAD_FAILED') {
          this.setStatus('error_fallback');
        }
        if (msg.requestId) {
          const handler = this.pendingRequests.get(msg.requestId);
          if (handler) {
            clearTimeout(handler.timeoutId);
            this.pendingRequests.delete(msg.requestId);
            handler.reject(new Error(msg.message));
          }
        }
        break;
      }
    }
  }

  /**
   * Generates a single LazyRecipe adhering to Sloth Constraints.
   * Validates ingredient safety (SEC-002), checks IndexedDB cache,
   * dispatches to WebGPU worker if ready, tries Localhost Ollama if enabled,
   * or falls back to DeterministicSlothEngine in <15ms.
   */
  public async generateRecipe(
    ingredients: string[],
    urgency: string[] = []
  ): Promise<{ recipe: LazyRecipe; engineUsed: CachedRecipe['engineUsed'] }> {
    // Validate safety of inputs first (SEC-002, AC-005)
    SafetyFilter.validateIngredients(ingredients);

    const activeEngineType: CachedRecipe['engineUsed'] =
      this.status === 'ready_webgpu'
        ? 'webgpu_gemma2b'
        : this.ollamaEnabled
        ? 'ollama'
        : 'deterministic';

    // 1. Check IndexedDB cache first
    try {
      const cached = await LazyChefDBAdapter.getCachedRecipe(
        ingredients,
        urgency,
        activeEngineType
      );
      if (cached) {
        return { recipe: cached, engineUsed: activeEngineType };
      }
    } catch (e) {
      console.warn('Cache lookup failed, proceeding to generation:', e);
    }

    // 2. If WebGPU is ready, attempt generation in worker
    if (this.status === 'ready_webgpu' && this.worker) {
      try {
        const recipe = await this.generateViaWorker(ingredients, urgency);
        await LazyChefDBAdapter.setCachedRecipe(
          ingredients,
          urgency,
          'webgpu_gemma2b',
          recipe
        ).catch((e) => console.warn('Failed to cache WebGPU recipe:', e));
        return { recipe, engineUsed: 'webgpu_gemma2b' };
      } catch (err) {
        console.warn('WebGPU generation failed, falling back to next engine:', err);
      }
    }

    // 3. Optional Localhost Ollama REST Adapter (TASK-022)
    if (this.ollamaEnabled) {
      try {
        const recipe = await this.generateViaOllama(ingredients, urgency);
        await LazyChefDBAdapter.setCachedRecipe(
          ingredients,
          urgency,
          'ollama',
          recipe
        ).catch((e) => console.warn('Failed to cache Ollama recipe:', e));
        return { recipe, engineUsed: 'ollama' };
      } catch (err) {
        console.warn(
          'Ollama unavailable or failed, silently falling back to deterministic heuristic engine:',
          err
        );
      }
    }

    // 4. Fallback: Instant Deterministic Heuristic Engine (<15ms)
    const { recipe: fallbackRecipe } = DeterministicSlothEngine.generate(ingredients, urgency);
    await LazyChefDBAdapter.setCachedRecipe(
      ingredients,
      urgency,
      'deterministic',
      fallbackRecipe
    ).catch((e) => console.warn('Failed to cache heuristic recipe:', e));

    return { recipe: fallbackRecipe, engineUsed: 'deterministic' };
  }

  /**
   * Generates a recipe via Localhost Ollama REST adapter (TASK-022).
   * Enforces 3.5s timeout and validates JSON output against validateSlothRecipe.
   */
  public async generateViaOllama(
    ingredients: string[],
    urgency: string[] = []
  ): Promise<LazyRecipe> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    try {
      const prompt = buildSlothPrompt(ingredients, urgency);
      const res = await fetch(this.ollamaEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.ollamaModel,
          prompt,
          format: 'json',
          stream: false,
          options: {
            temperature: 0.2,
            top_p: 0.9
          }
        }),
        signal: controller.signal
      });

      if (!res.ok) {
        throw new Error(`Ollama HTTP error ${res.status}`);
      }

      const data = (await res.json()) as { response?: string };
      if (!data.response) {
        throw new Error('Ollama returned empty response payload');
      }

      let cleaned = data.response.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();
      }

      const parsed = JSON.parse(cleaned);
      return validateSlothRecipe(parsed);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private generateViaWorker(
    ingredients: string[],
    urgency: string[]
  ): Promise<LazyRecipe> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not available'));
        return;
      }

      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // 15-second generation timeout safeguard
      const timeoutId = setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId);
          if (this.worker) {
            const abortMsg: WorkerInboundMessage = {
              type: 'ABORT_GENERATION',
              requestId
            };
            this.worker.postMessage(abortMsg);
          }
          reject(new Error('Generation request timed out after 15s.'));
        }
      }, 15000);

      this.pendingRequests.set(requestId, { resolve, reject, timeoutId });

      const msg: WorkerInboundMessage = {
        type: 'GENERATE_RECIPE',
        requestId,
        pantryIngredients: ingredients,
        urgencyItems: urgency
      };

      this.worker.postMessage(msg);
    });
  }
}
