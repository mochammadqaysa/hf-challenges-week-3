import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  SlothInferenceManager,
  checkWebGPUSupport,
  buildSlothPrompt
} from '../../src/core/inference-manager';
import { LazyChefDBAdapter, resetDBHandle } from '../../src/storage/db';
import { ToxicIngredientError } from '../../src/core/safety-filter';
import type { LazyRecipe } from '../../src/types/recipe';

describe('SlothInferenceManager', () => {
  const sampleValidRecipe: LazyRecipe = {
    title: 'Ollama Butter Garlic Noodles',
    sloth_level: 'Sloth Level 2: 1 Pot, 1 Spoon, Minimal Prep',
    vessel: '1 Pot',
    cook_time_minutes: 12,
    ingredients_used: ['pasta', 'butter', 'garlic'],
    grocery_gap: ['Parmesan'],
    steps: [
      'Boil pasta in pot for 9 minutes.',
      'Drain most water, leaving 2 tbsp in pot.',
      'Stir in butter, garlic, and serve.'
    ],
    lazy_payoff: {
      decision_minutes_saved: 15,
      money_saved_usd: 6.5,
      dishes_saved: 2
    }
  };

  beforeEach(async () => {
    resetDBHandle();
    await LazyChefDBAdapter.clearAll();
    const manager = SlothInferenceManager.getInstance();
    manager.setOllamaEnabled(false);
    manager.setOllamaEndpoint('http://localhost:11434/api/generate');
    manager.setOllamaModel('gemma2:2b');
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  describe('Input Safety Screening (SEC-002, AC-005)', () => {
    it('throws ToxicIngredientError when toxic ingredients are provided to generateRecipe', async () => {
      const manager = SlothInferenceManager.getInstance();
      await expect(
        manager.generateRecipe(['rice', 'eggs', 'bleach'])
      ).rejects.toThrow(ToxicIngredientError);
    });

    it('throws ToxicIngredientError on custom item toxic names', async () => {
      const manager = SlothInferenceManager.getInstance();
      await expect(
        manager.generateRecipe(['c_motor%20oil', 'rice'])
      ).rejects.toThrow(ToxicIngredientError);
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

  describe('Localhost Ollama REST Adapter (TASK-022, AC-004)', () => {
    it('allows configuring ollama endpoint, model, and enabled status', () => {
      const manager = SlothInferenceManager.getInstance();
      expect(manager.isOllamaEnabled()).toBe(false);

      manager.setOllamaEnabled(true);
      expect(manager.isOllamaEnabled()).toBe(true);

      manager.setOllamaEndpoint('http://127.0.0.1:11434/api/generate');
      expect(manager.getOllamaEndpoint()).toBe('http://127.0.0.1:11434/api/generate');

      manager.setOllamaModel('custom-sloth:2b');
      expect(manager.getOllamaModel()).toBe('custom-sloth:2b');
    });

    it('builds a structured prompt for Ollama containing ingredients and sloth constraints', () => {
      const prompt = buildSlothPrompt(['pasta', 'butter', 'garlic'], ['butter']);
      expect(prompt).toContain('LazyChef');
      expect(prompt).toContain('Sloth Constraints');
      expect(prompt).toContain('pasta, butter, garlic');
      expect(prompt).toContain('Urgent items to prioritize: butter');
      expect(prompt).toContain('JSON');
    });

    it('successfully generates and caches recipe via Ollama when enabled and reachable', async () => {
      const manager = SlothInferenceManager.getInstance();
      manager.setOllamaEnabled(true);

      const fakeResponse = {
        response: JSON.stringify(sampleValidRecipe)
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => fakeResponse
      } as Response);

      const result = await manager.generateRecipe(['pasta', 'butter', 'garlic']);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(result.recipe.title).toBe('Ollama Butter Garlic Noodles');
      expect(result.engineUsed).toBe('ollama');

      // Verify cached with 'ollama' engine
      const cached = await LazyChefDBAdapter.getCachedRecipe(
        ['pasta', 'butter', 'garlic'],
        [],
        'ollama'
      );
      expect(cached).not.toBeNull();
      expect(cached?.title).toBe('Ollama Butter Garlic Noodles');
    });

    it('strips markdown json fences returned by Ollama model', async () => {
      const manager = SlothInferenceManager.getInstance();
      manager.setOllamaEnabled(true);

      const fakeMarkdownResponse = {
        response: `\`\`\`json\n${JSON.stringify(sampleValidRecipe)}\n\`\`\``
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => fakeMarkdownResponse
      } as Response);

      const result = await manager.generateRecipe(['pasta', 'butter', 'garlic']);
      expect(result.recipe.title).toBe(sampleValidRecipe.title);
      expect(result.engineUsed).toBe('ollama');
    });

    it('silently falls back to deterministic heuristic engine on network/CORS error', async () => {
      const manager = SlothInferenceManager.getInstance();
      manager.setOllamaEnabled(true);

      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
        new TypeError('Failed to fetch')
      );

      const result = await manager.generateRecipe(['pasta', 'garlic']);
      expect(result.recipe).toBeDefined();
      expect(result.engineUsed).toBe('deterministic');
    });

    it('silently falls back to deterministic engine on HTTP non-200 or empty response', async () => {
      const manager = SlothInferenceManager.getInstance();
      manager.setOllamaEnabled(true);

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({})
      } as Response);

      const result = await manager.generateRecipe(['pasta', 'garlic']);
      expect(result.recipe).toBeDefined();
      expect(result.engineUsed).toBe('deterministic');
    });

    it('silently falls back to deterministic engine when Ollama response violates Sloth constraints', async () => {
      const manager = SlothInferenceManager.getInstance();
      manager.setOllamaEnabled(true);

      // Invalid: 5 steps (exceeds max 3 steps)
      const invalidRecipe = {
        ...sampleValidRecipe,
        steps: ['1', '2', '3', '4', '5']
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ response: JSON.stringify(invalidRecipe) })
      } as Response);

      const result = await manager.generateRecipe(['pasta', 'garlic']);
      expect(result.recipe).toBeDefined();
      // Fell back to deterministic engine
      expect(result.engineUsed).toBe('deterministic');
      expect(result.recipe.steps.length).toBeLessThanOrEqual(3);
    });
  });
});
