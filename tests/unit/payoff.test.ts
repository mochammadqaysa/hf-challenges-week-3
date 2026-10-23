import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { PayoffEngine } from '../../src/core/payoff-engine';
import { LocalStorageStore, DEFAULT_PAYOFF_SUMMARY } from '../../src/storage/local-storage';
import { LazyChefDBAdapter, resetDBHandle } from '../../src/storage/db';
import type { LazyRecipe } from '../../src/types/recipe';

describe('PayoffEngine', () => {
  beforeEach(async () => {
    resetDBHandle();
    await LazyChefDBAdapter.clearAll();
    LocalStorageStore.setPayoffSummary(DEFAULT_PAYOFF_SUMMARY);
  });

  const mockRecipe: LazyRecipe = {
    title: 'Garlic Butter Egg Fried Rice',
    sloth_level: 'Sloth Level 1: 1 Pan, 1 Spatula, 0 Knives',
    vessel: '1 Skillet',
    cook_time_minutes: 9,
    ingredients_used: ['Leftover Rice', 'Eggs'],
    grocery_gap: ['Green Onions'],
    steps: ['Step 1', 'Step 2', 'Step 3'],
    lazy_payoff: {
      decision_minutes_saved: 15,
      money_saved_usd: 6.5,
      dishes_saved: 2
    }
  };

  describe('calculateUpdatedSummary', () => {
    it('accurately accumulates +15 min, +$6.50, and +2 pans', () => {
      const { updatedSummary, newlyUnlockedBadges } = PayoffEngine.calculateUpdatedSummary(
        DEFAULT_PAYOFF_SUMMARY,
        mockRecipe
      );

      expect(updatedSummary.totalMealsCooked).toBe(1);
      expect(updatedSummary.totalMinutesSaved).toBe(15);
      expect(updatedSummary.totalMoneySavedUSD).toBe(6.5);
      expect(updatedSummary.totalPansAvoided).toBe(2);
      expect(newlyUnlockedBadges).toContain('First Sloth Meal');
    });

    it('unlocks higher tier badges at corresponding milestones', () => {
      let summary = { ...DEFAULT_PAYOFF_SUMMARY };

      // Simulate 5 meals
      for (let i = 0; i < 5; i++) {
        const res = PayoffEngine.calculateUpdatedSummary(summary, mockRecipe);
        summary = res.updatedSummary;
      }

      expect(summary.totalMealsCooked).toBe(5);
      expect(summary.totalPansAvoided).toBe(10);
      expect(summary.unlockedBadges).toContain('Dish Spared Master');
      expect(summary.unlockedBadges).toContain('Dinner Autopilot');
      expect(summary.unlockedBadges).toContain('Time Millionaire');
    });
  });

  describe('recordMealCompleted', () => {
    it('atomically records meal to LocalStorage and IndexedDB', async () => {
      const result = await PayoffEngine.recordMealCompleted(mockRecipe, 3);

      expect(result.summary.totalMealsCooked).toBe(1);
      expect(result.summary.totalMinutesSaved).toBe(15);
      expect(result.newBadges).toContain('First Sloth Meal');
      expect(result.historyEntryId).toBeDefined();

      // Check LocalStorage sync
      const storedSummary = LocalStorageStore.getPayoffSummary();
      expect(storedSummary.totalMealsCooked).toBe(1);
      expect(storedSummary.totalMoneySavedUSD).toBe(6.5);

      // Check IndexedDB sync
      const history = await LazyChefDBAdapter.getAllPayoffEntries();
      expect(history).toHaveLength(1);
      expect(history[0].recipeTitle).toBe(mockRecipe.title);
      expect(history[0].decisionMinutesSaved).toBe(15);
      expect(history[0].moneySavedUSD).toBe(6.5);
      expect(history[0].pansAvoided).toBe(2);
    });
  });
});
