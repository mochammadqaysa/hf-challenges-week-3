import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  SlothInferenceManager,
  checkWebGPUSupport
} from '../../src/core/inference-manager';
import { LazyChefDBAdapter, resetDBHandle } from '../../src/storage/db';

describe('SlothInferenceManager', () => {
  beforeEach(async () => {
    resetDBHandle();
    await LazyChefDBAdapter.clearAll();
  });

  describe('WebGPU Feature Gating', () => {
    it('detects missing WebGPU in Node test environment and returns false', async () => {
      const supported = await checkWebGPUSupport();
      expect(supported).toBe(false);
    });

    it('sets status to unsupported_webgpu when WebGPU is absent', async () => {
      const manager = SlothInferenceManager.getInstance();
      await manager.initBackgroundPipeline();
      expect(manager.getStatus()).toBe('unsupported_webgpu');
    });
  });

  describe('Recipe Generation Routing & Caching', () => {
    it('routes to deterministic engine and saves recipe to cache', async () => {
      const manager = SlothInferenceManager.getInstance();
      const result = await manager.generateRecipe(['eggs', 'leftover rice']);

      expect(result.recipe).toBeDefined();
      expect(result.recipe.cook_time_minutes).toBeLessThanOrEqual(15);
      expect(result.recipe.steps.length).toBeLessThanOrEqual(3);
      expect(result.engineUsed).toBe('deterministic');

      // Verify cached in LazyChefDB
      const cached = await LazyChefDBAdapter.getCachedRecipe(
        ['eggs', 'leftover rice'],
        [],
        'deterministic'
      );
      expect(cached).not.toBeNull();
      expect(cached?.title).toBe(result.recipe.title);
    });

    it('returns cached recipe on repeat generation request', async () => {
      const manager = SlothInferenceManager.getInstance();
      const firstResult = await manager.generateRecipe(['pasta', 'garlic']);
      const secondResult = await manager.generateRecipe(['garlic', 'pasta']);

      expect(secondResult.recipe.title).toBe(firstResult.recipe.title);
      expect(secondResult.engineUsed).toBe('deterministic');
    });
  });
});
