/**
 * Dedicated Web Worker: WebGPU Gemma 2B Inference Pipeline
 * Handles background model weight streaming and local tensor generation.
 */

import { pipeline, env } from '@huggingface/transformers';
import { validateSlothRecipe } from '../core/validator';
import type { WorkerInboundMessage, WorkerOutboundMessage } from '../types/messages';
import type { LazyRecipe } from '../types/recipe';

// Configure transformers.js for client-side WebGPU execution
env.allowLocalModels = false;
env.useBrowserCache = true;

const DEFAULT_MODEL_ID = 'onnx-community/gemma-2-2b-it-webgpu';

// Pipeline generator instance
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let generator: any = null;
let isInitializing = false;
let currentRequestId: string | null = null;

/**
 * Extracts and parses a JSON object from raw LLM output,
 * stripping markdown fences and conversational wrappers.
 */
export function extractAndParseRecipeJson(rawText: string): unknown {
  let cleaned = rawText.trim();

  // Strip markdown code fences if present
  const fenceRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const fenceMatch = cleaned.match(fenceRegex);
  if (fenceMatch && fenceMatch[1]) {
    cleaned = fenceMatch[1].trim();
  }

  // Find outermost curly braces
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  return JSON.parse(cleaned);
}

/**
 * Formats structured prompt for Gemma 2B instruction tuning.
 */
export function buildGemmaPrompt(ingredients: string[], urgency: string[]): string {
  const urgencySection =
    urgency.length > 0
      ? `\nPRIORITY (Must Use Soon): ${urgency.join(', ')}`
      : '';

  return `<bos><start_of_turn>user
You are LazyChef, an extreme minimalist culinary assistant adhering strictly to Sloth Constraints.
Recommend exactly ONE delicious, practical meal using ONLY the provided pantry ingredients.

CRITICAL SLOTH CONSTRAINTS:
1. Exactly ONE vessel: choose from "1 Skillet", "1 Pot", "1 Sheet Pan", or "1 Microwave Bowl".
2. Exactly 1 to 3 instructions in "steps". Keep them concise, imperative, and actionable.
3. Total cooking and preparation time must be 15 minutes or less ("cook_time_minutes": <= 15).
4. Output valid JSON adhering to this exact schema with NO extra text or markdown formatting:
{
  "title": "Short Appetizing Meal Name",
  "sloth_level": "Sloth Level 1: 1 Pan, 1 Spatula, 0 Knives",
  "vessel": "1 Skillet",
  "cook_time_minutes": 10,
  "ingredients_used": ["ingredient 1", "ingredient 2"],
  "grocery_gap": ["optional staple 1"],
  "steps": [
    "Step 1 imperative instruction.",
    "Step 2 imperative instruction.",
    "Step 3 imperative instruction."
  ],
  "lazy_payoff": {
    "decision_minutes_saved": 15,
    "money_saved_usd": 6.5,
    "dishes_saved": 2
  }
}

Available Pantry Items: ${ingredients.join(', ')}${urgencySection}
<end_of_turn>
<start_of_turn>model
`;
}

function postOutboundMessage(msg: WorkerOutboundMessage): void {
  if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
    self.postMessage(msg);
  }
}

/**
 * Initializes the transformers.js text generation pipeline.
 */
export async function initializePipeline(modelId: string = DEFAULT_MODEL_ID): Promise<void> {
  if (generator) {
    postOutboundMessage({ type: 'MODEL_READY', device: 'webgpu', modelId });
    return;
  }

  if (isInitializing) return;
  isInitializing = true;

  try {
    generator = await pipeline('text-generation', modelId, {
      device: 'webgpu',
      dtype: 'q4f16',
      progress_callback: (info: {
        status?: string;
        file?: string;
        loaded?: number;
        total?: number;
        progress?: number;
      }) => {
        const loaded = info.loaded ?? 0;
        const total = info.total ?? 0;
        const rawProgress = info.progress ?? (total > 0 ? (loaded / total) * 100 : 0);
        postOutboundMessage({
          type: 'MODEL_STREAM_PROGRESS',
          file: info.file ?? 'gemma-2-2b-q4f16',
          loaded,
          total,
          progress: Math.min(100, Math.round(rawProgress))
        });
      }
    });

    isInitializing = false;
    postOutboundMessage({
      type: 'MODEL_READY',
      device: 'webgpu',
      modelId
    });
  } catch (err: unknown) {
    isInitializing = false;
    generator = null;
    const message = err instanceof Error ? err.message : String(err);
    const isGpuError =
      message.toLowerCase().includes('webgpu') ||
      message.toLowerCase().includes('adapter') ||
      message.toLowerCase().includes('device');

    postOutboundMessage({
      type: 'ERROR',
      code: isGpuError ? 'WEBGPU_UNAVAILABLE' : 'DOWNLOAD_FAILED',
      message: `Model pipeline initialization failed: ${message}`
    });
  }
}

/**
 * Executes recipe generation.
 */
export async function generateRecipe(
  requestId: string,
  pantryIngredients: string[],
  urgencyItems: string[]
): Promise<void> {
  if (!generator) {
    postOutboundMessage({
      type: 'ERROR',
      requestId,
      code: 'GENERATION_FAILED',
      message: 'Model is not initialized yet.'
    });
    return;
  }

  currentRequestId = requestId;
  const startTime = Date.now();

  try {
    const prompt = buildGemmaPrompt(pantryIngredients, urgencyItems);

    const result = await generator(prompt, {
      max_new_tokens: 350,
      temperature: 0.1,
      top_p: 0.9,
      return_full_text: false
    });

    if (currentRequestId !== requestId) {
      // Generation was aborted
      return;
    }

    const generatedText = Array.isArray(result)
      ? result[0]?.generated_text ?? ''
      : (result as { generated_text?: string })?.generated_text ?? '';

    // Extract JSON and validate Sloth Constraints
    let rawJson: unknown;
    try {
      rawJson = extractAndParseRecipeJson(generatedText);
    } catch {
      postOutboundMessage({
        type: 'ERROR',
        requestId,
        code: 'SCHEMA_INVALID',
        message: 'Generated output did not contain valid JSON.'
      });
      return;
    }

    // Default lazy_payoff if omitted
    if (typeof rawJson === 'object' && rawJson !== null) {
      const obj = rawJson as Record<string, unknown>;
      if (!obj.lazy_payoff) {
        obj.lazy_payoff = {
          decision_minutes_saved: 15,
          money_saved_usd: 6.5,
          dishes_saved: 2
        };
      }
    }

    const validatedRecipe: LazyRecipe = validateSlothRecipe(rawJson);
    const duration = Date.now() - startTime;

    postOutboundMessage({
      type: 'RECIPE_SUCCESS',
      requestId,
      recipe: validatedRecipe,
      inferenceDurationMs: duration
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    postOutboundMessage({
      type: 'ERROR',
      requestId,
      code: 'SCHEMA_INVALID',
      message: `Failed Sloth validation: ${message}`
    });
  } finally {
    if (currentRequestId === requestId) {
      currentRequestId = null;
    }
  }
}

// Attach inbound message listener
if (typeof self !== 'undefined' && 'addEventListener' in self) {
  self.addEventListener('message', async (e: Event) => {
    const msg = (e as MessageEvent<WorkerInboundMessage>).data;
    if (!msg || typeof msg !== 'object') return;

    switch (msg.type) {
      case 'INIT_PIPELINE':
        await initializePipeline(msg.modelId);
        break;
      case 'GENERATE_RECIPE':
        await generateRecipe(msg.requestId, msg.pantryIngredients, msg.urgencyItems);
        break;
      case 'ABORT_GENERATION':
        if (currentRequestId === msg.requestId) {
          currentRequestId = null;
        }
        break;
    }
  });
}
