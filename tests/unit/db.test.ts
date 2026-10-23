import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  LazyChefDBAdapter,
  generateRecipeCacheKey,
  normalizeCustomIngredient,
  resetDBHandle
} from '../../src/storage/db';
import type { LazyRecipe } from '../../src/types/recipe';
import type { PantryItem } from '../../src/types/pantry';

describe('LazyChefDB IndexedDB Adapter', () => {
  beforeEach(async () => {
    resetDBHandle();
    await LazyChefDBAdapter.clearAll();
  });

  describe('Key normalization and generation', () => {
    it('normalizes custom ingredient names consistently', () => {
      const normalized = normalizeCustomIngredient('  Kimchi Paste  ');
      expect(normalized).toBe('c_kimchi%20paste');
    });

    it('generates consistent delimited composite cache keys regardless of ingredient order', () => {
      const key1 = generateRecipeCacheKey(['rice', 'egg'], ['egg'], 'deterministic');
      const key2 = generateRecipeCacheKey(['egg', 'rice'], ['egg'], 'deterministic');
      expect(key1).toBe('egg|rice:urgent:egg:deterministic');
      expect(key1).toBe(key2);
    });
  });

  describe('Recipe Cache Store', () => {
    const mockRecipe: LazyRecipe = {
      title: 'Quick Garlic Fried Rice',
      sloth_level: 'Sloth Level 1: 1 Pan, 1 Spatula, 0 Knives',
      vessel: '1 Skillet',
      cook_time_minutes: 8,
      ingredients_used: ['rice', 'garlic'],
      grocery_gap: ['spring onion'],
      steps: ['Heat pan with oil.', 'Add rice and garlic, fry 5 min.', 'Serve hot.'],
      lazy_payoff: {
        decision_minutes_saved: 15,
        money_saved_usd: 6.5,
        dishes_saved: 2
      }
    };

    it('returns null on cache miss', async () => {
      const cached = await LazyChefDBAdapter.getCachedRecipe(
        ['rice', 'garlic'],
        [],
        'deterministic'
      );
      expect(cached).toBeNull();
    });

    it('stores and retrieves cached recipes correctly', async () => {
      await LazyChefDBAdapter.setCachedRecipe(
        ['rice', 'garlic'],
        ['garlic'],
        'deterministic',
        mockRecipe
      );

      const retrieved = await LazyChefDBAdapter.getCachedRecipe(
        ['garlic', 'rice'], // Different ordering
        ['garlic'],
        'deterministic'
      );

      expect(retrieved).not.toBeNull();
      expect(retrieved?.title).toBe(mockRecipe.title);
      expect(retrieved?.cook_time_minutes).toBe(8);
      expect(retrieved?.vessel).toBe('1 Skillet');
    });
  });

  describe('Payoff History Store', () => {
    it('adds and retrieves payoff entries in chronological order', async () => {
      const entry1 = {
        recipeTitle: 'Egg Toast',
        vesselUsed: '1 Skillet',
        completedAt: 1000,
        decisionMinutesSaved: 15,
        moneySavedUSD: 6.5,
        pansAvoided: 2,
        stepsCompleted: 3
      };
      const entry2 = {
        recipeTitle: 'Garlic Rice',
        vesselUsed: '1 Skillet',
        completedAt: 2000,
        decisionMinutesSaved: 15,
        moneySavedUSD: 6.5,
        pansAvoided: 2,
        stepsCompleted: 3
      };

      const id1 = await LazyChefDBAdapter.addPayoffEntry(entry1);
      const id2 = await LazyChefDBAdapter.addPayoffEntry(entry2);

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();

      const all = await LazyChefDBAdapter.getAllPayoffEntries();
      expect(all).toHaveLength(2);
      expect(all[0].recipeTitle).toBe('Egg Toast');
      expect(all[1].recipeTitle).toBe('Garlic Rice');
    });
  });

  describe('Pantry Items Store', () => {
    it('saves, retrieves, and deletes pantry items', async () => {
      const item: PantryItem = {
        id: 'eggs',
        name: 'Eggs',
        category: 'protein',
        shelfLifeUrgency: 'use_soon',
        addedAt: Date.now(),
        updatedAt: Date.now()
      };

      await LazyChefDBAdapter.savePantryItem(item);
      let items = await LazyChefDBAdapter.getPantryItems();
      expect(items).toHaveLength(1);
      expect(items[0].id).toBe('eggs');
      expect(items[0].shelfLifeUrgency).toBe('use_soon');

      await LazyChefDBAdapter.deletePantryItem('eggs');
      items = await LazyChefDBAdapter.getPantryItems();
      expect(items).toHaveLength(0);
    });
  });
});
