import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageStore, DEFAULT_PAYOFF_SUMMARY } from '../../src/storage/local-storage';

describe('LocalStorageStore', () => {
  beforeEach(() => {
    LocalStorageStore.setActivePantryIds([]);
    LocalStorageStore.setUrgencyIds([]);
    LocalStorageStore.setPayoffSummary(DEFAULT_PAYOFF_SUMMARY);
  });

  it('saves and retrieves active pantry IDs', () => {
    expect(LocalStorageStore.getActivePantryIds()).toEqual([]);
    LocalStorageStore.setActivePantryIds(['eggs', 'leftover_rice']);
    expect(LocalStorageStore.getActivePantryIds()).toEqual(['eggs', 'leftover_rice']);
  });

  it('saves and retrieves urgency IDs', () => {
    expect(LocalStorageStore.getUrgencyIds()).toEqual([]);
    LocalStorageStore.setUrgencyIds(['eggs']);
    expect(LocalStorageStore.getUrgencyIds()).toEqual(['eggs']);
  });

  it('handles custom ingredients correctly', () => {
    LocalStorageStore.addCustomIngredient('Kimchi');
    expect(LocalStorageStore.getCustomIngredients()).toContain('Kimchi');

    // Case-insensitive duplicate check
    LocalStorageStore.addCustomIngredient('kimchi');
    expect(LocalStorageStore.getCustomIngredients().filter(x => x.toLowerCase() === 'kimchi').length).toBe(1);

    LocalStorageStore.removeCustomIngredient('Kimchi');
    expect(LocalStorageStore.getCustomIngredients()).not.toContain('Kimchi');
  });

  it('persists payoff summary correctly', () => {
    const summary = {
      totalMealsCooked: 3,
      totalMinutesSaved: 45,
      totalMoneySavedUSD: 19.5,
      totalPansAvoided: 6,
      unlockedBadges: ['First Sloth Meal']
    };
    LocalStorageStore.setPayoffSummary(summary);
    expect(LocalStorageStore.getPayoffSummary()).toEqual(summary);
  });
});
