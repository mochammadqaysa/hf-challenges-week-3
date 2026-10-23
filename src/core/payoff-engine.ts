/**
 * The Lazy Payoff Engine
 * Deterministically accumulates cumulative savings (+15 min, +$6.50, +2 pans)
 * and evaluates milestone gamified badges.
 */

import { LocalStorageStore, type PayoffSummary } from '../storage/local-storage';
import { LazyChefDBAdapter, type PayoffEntry } from '../storage/db';
import type { LazyRecipe } from '../types/recipe';

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  criterion: (summary: PayoffSummary) => boolean;
}

export const MILESTONE_BADGES: readonly BadgeDefinition[] = [
  {
    id: 'first_sloth_meal',
    name: 'First Sloth Meal',
    description: 'Cooked your very first zero-stress Sloth meal!',
    icon: '🦥',
    criterion: (s) => s.totalMealsCooked >= 1
  },
  {
    id: 'dish_spared_master',
    name: 'Dish Spared Master',
    description: 'Saved 10+ dirty pans from the sink',
    icon: '✨',
    criterion: (s) => s.totalPansAvoided >= 10
  },
  {
    id: 'dinner_autopilot',
    name: 'Dinner Autopilot',
    description: 'Cooked 5 meals effortlessly on autopilot',
    icon: '🚀',
    criterion: (s) => s.totalMealsCooked >= 5
  },
  {
    id: 'time_millionaire',
    name: 'Time Millionaire',
    description: 'Reclaimed 60+ minutes of dinner paralysis',
    icon: '⏳',
    criterion: (s) => s.totalMinutesSaved >= 60
  },
  {
    id: 'sloth_royalty',
    name: 'Sloth Royalty',
    description: 'Master of lazy cooking: 10+ Sloth meals completed',
    icon: '👑',
    criterion: (s) => s.totalMealsCooked >= 10
  }
];

export class PayoffEngine {
  /**
   * Evaluates which milestone badges are unlocked for a given summary.
   */
  public static evaluateBadges(summary: PayoffSummary): string[] {
    const unlocked: string[] = [];
    for (const badge of MILESTONE_BADGES) {
      if (badge.criterion(summary)) {
        unlocked.push(badge.name);
      }
    }
    return unlocked;
  }

  /**
   * Computes the new payoff summary from an existing summary and a completed recipe.
   */
  public static calculateUpdatedSummary(
    current: PayoffSummary,
    recipe: LazyRecipe
  ): { updatedSummary: PayoffSummary; newlyUnlockedBadges: string[] } {
    const minutesSaved = recipe.lazy_payoff?.decision_minutes_saved ?? 15;
    const moneySaved = recipe.lazy_payoff?.money_saved_usd ?? 6.5;
    const pansAvoided = recipe.lazy_payoff?.dishes_saved ?? 2;

    const updatedSummary: PayoffSummary = {
      totalMealsCooked: current.totalMealsCooked + 1,
      totalMinutesSaved: current.totalMinutesSaved + minutesSaved,
      totalMoneySavedUSD: Number((current.totalMoneySavedUSD + moneySaved).toFixed(2)),
      totalPansAvoided: current.totalPansAvoided + pansAvoided,
      unlockedBadges: []
    };

    const allUnlocked = this.evaluateBadges(updatedSummary);
    updatedSummary.unlockedBadges = allUnlocked;

    const newlyUnlockedBadges = allUnlocked.filter(
      (badge) => !current.unlockedBadges.includes(badge)
    );

    return { updatedSummary, newlyUnlockedBadges };
  }

  /**
   * Atomically records a completed meal:
   * 1. Updates and saves `lazychef_payoff_summary` in LocalStorage.
   * 2. Appends an immutable `PayoffEntry` in IndexedDB `payoff_history`.
   */
  public static async recordMealCompleted(
    recipe: LazyRecipe,
    stepsCompleted: number = 3
  ): Promise<{ summary: PayoffSummary; newBadges: string[]; historyEntryId: number }> {
    const currentSummary = LocalStorageStore.getPayoffSummary();
    const { updatedSummary, newlyUnlockedBadges } = this.calculateUpdatedSummary(
      currentSummary,
      recipe
    );

    // Save to LocalStorage
    LocalStorageStore.setPayoffSummary(updatedSummary);

    // Save to IndexedDB
    const historyEntry: Omit<PayoffEntry, 'id'> = {
      recipeTitle: recipe.title,
      vesselUsed: recipe.vessel,
      completedAt: Date.now(),
      decisionMinutesSaved: recipe.lazy_payoff?.decision_minutes_saved ?? 15,
      moneySavedUSD: recipe.lazy_payoff?.money_saved_usd ?? 6.5,
      pansAvoided: recipe.lazy_payoff?.dishes_saved ?? 2,
      stepsCompleted
    };

    const historyEntryId = await LazyChefDBAdapter.addPayoffEntry(historyEntry);

    return {
      summary: updatedSummary,
      newBadges: newlyUnlockedBadges,
      historyEntryId
    };
  }
}
