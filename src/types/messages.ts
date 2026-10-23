/**
 * Typed Web Worker Inbound and Outbound IPC Message Contracts
 * Adheres strictly to Section 4.4 of LazyChef Technical Specification.
 */

import type { LazyRecipe } from './recipe';

export type WorkerInboundMessage =
  | { type: 'INIT_PIPELINE'; modelId?: string }
  | {
      type: 'GENERATE_RECIPE';
      requestId: string;
      pantryIngredients: string[];
      urgencyItems: string[];
    }
  | { type: 'ABORT_GENERATION'; requestId: string };

export type WorkerOutboundMessage =
  | {
      type: 'MODEL_STREAM_PROGRESS';
      file: string;
      loaded: number;
      total: number;
      progress: number; // 0 to 100 percentage
    }
  | {
      type: 'MODEL_READY';
      device: 'webgpu' | 'wasm';
      modelId: string;
    }
  | {
      type: 'RECIPE_STREAM_TOKEN';
      requestId: string;
      token: string;
    }
  | {
      type: 'RECIPE_SUCCESS';
      requestId: string;
      recipe: LazyRecipe;
      inferenceDurationMs: number;
    }
  | {
      type: 'ERROR';
      requestId?: string;
      code: 'WEBGPU_UNAVAILABLE' | 'DOWNLOAD_FAILED' | 'GENERATION_FAILED' | 'SCHEMA_INVALID';
      message: string;
    };
