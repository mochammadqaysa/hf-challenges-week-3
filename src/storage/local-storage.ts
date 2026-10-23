/**
 * LazyChef Synchronous LocalStorage Adapter
 * Sub-16ms synchronous state management for active pantry selection, custom items, and payoff summary.
 */

export interface PayoffSummary {
  totalMealsCooked: number;
  totalMinutesSaved: number;
  totalMoneySavedUSD: number;
  totalPansAvoided: number;
  unlockedBadges: string[];
}

export const STORAGE_KEYS = {
  ACTIVE_PANTRY: 'lazychef_active_pantry_ids',
  URGENCY_IDS: 'lazychef_urgency_ids',
  CUSTOM_ITEMS: 'lazychef_custom_ingredients',
  PAYOFF_SUMMARY: 'lazychef_payoff_summary'
} as const;

export const DEFAULT_PAYOFF_SUMMARY: PayoffSummary = {
  totalMealsCooked: 0,
  totalMinutesSaved: 0,
  totalMoneySavedUSD: 0,
  totalPansAvoided: 0,
  unlockedBadges: []
};

// In-memory fallback if localStorage is disabled or throws
const memoryCache: Record<string, string> = {};

function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return memoryCache[key] || null;
  } catch {
    return memoryCache[key] || null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
    memoryCache[key] = value;
  } catch {
    memoryCache[key] = value;
  }
}

export class LocalStorageStore {
  /**
   * Retrieves array of active pantry ingredient IDs.
   */
  public static getActivePantryIds(): string[] {
    const raw = safeGetItem(STORAGE_KEYS.ACTIVE_PANTRY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Sets array of active pantry ingredient IDs.
   */
  public static setActivePantryIds(ids: string[]): void {
    safeSetItem(STORAGE_KEYS.ACTIVE_PANTRY, JSON.stringify(ids));
  }

  /**
   * Retrieves array of "Use Soon" urgency ingredient IDs.
   */
  public static getUrgencyIds(): string[] {
    const raw = safeGetItem(STORAGE_KEYS.URGENCY_IDS);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Sets array of "Use Soon" urgency ingredient IDs.
   */
  public static setUrgencyIds(ids: string[]): void {
    safeSetItem(STORAGE_KEYS.URGENCY_IDS, JSON.stringify(ids));
  }

  /**
   * Retrieves custom user-added ingredients.
   */
  public static getCustomIngredients(): string[] {
    const raw = safeGetItem(STORAGE_KEYS.CUSTOM_ITEMS);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Adds a custom ingredient to storage.
   */
  public static addCustomIngredient(name: string): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    const current = this.getCustomIngredients();
    if (!current.some(item => item.toLowerCase() === trimmed.toLowerCase())) {
      const updated = [...current, trimmed];
      safeSetItem(STORAGE_KEYS.CUSTOM_ITEMS, JSON.stringify(updated));
    }
  }

  /**
   * Removes a custom ingredient from storage.
   */
  public static removeCustomIngredient(name: string): void {
    const current = this.getCustomIngredients();
    const updated = current.filter(item => item.toLowerCase() !== name.toLowerCase().trim());
    safeSetItem(STORAGE_KEYS.CUSTOM_ITEMS, JSON.stringify(updated));
  }

  /**
   * Retrieves the current Payoff Summary.
   */
  public static getPayoffSummary(): PayoffSummary {
    const raw = safeGetItem(STORAGE_KEYS.PAYOFF_SUMMARY);
    if (!raw) return { ...DEFAULT_PAYOFF_SUMMARY };
    try {
      const parsed = JSON.parse(raw);
      return {
        totalMealsCooked: parsed.totalMealsCooked ?? 0,
        totalMinutesSaved: parsed.totalMinutesSaved ?? 0,
        totalMoneySavedUSD: parsed.totalMoneySavedUSD ?? 0,
        totalPansAvoided: parsed.totalPansAvoided ?? 0,
        unlockedBadges: Array.isArray(parsed.unlockedBadges) ? parsed.unlockedBadges : []
      };
    } catch {
      return { ...DEFAULT_PAYOFF_SUMMARY };
    }
  }

  /**
   * Updates the Payoff Summary.
   */
  public static setPayoffSummary(summary: PayoffSummary): void {
    safeSetItem(STORAGE_KEYS.PAYOFF_SUMMARY, JSON.stringify(summary));
  }
}
