/**
 * LazyChef IndexedDB Storage Adapter (LazyChefDB)
 * Uses `idb` for structured offline persistence of pantry items, recipe cache, and payoff history.
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { PantryItem } from '../types/pantry';
import type { LazyRecipe } from '../types/recipe';

export interface CachedRecipe {
  id: string; // Delimited composite key
  ingredientsHash: string;
  recipe: LazyRecipe;
  engineUsed: 'webgpu_gemma2b' | 'wasm_gemma2b' | 'ollama' | 'deterministic';
  generatedAt: number;
}

export interface PayoffEntry {
  id?: number;
  recipeTitle: string;
  vesselUsed: string;
  completedAt: number; // Unix timestamp ms
  decisionMinutesSaved: number; // Benchmark: 15
  moneySavedUSD: number; // Benchmark: 6.50
  pansAvoided: number; // Benchmark: 2
  stepsCompleted: number; // 1 to 3
}

export interface LazyChefDBSchema extends DBSchema {
  pantry_items: {
    key: string;
    value: PantryItem;
    indexes: {
      by_category: string;
      by_urgency: string;
    };
  };
  recipe_cache: {
    key: string;
    value: CachedRecipe;
    indexes: {
      by_generated_at: number;
    };
  };
  payoff_history: {
    key: number;
    value: PayoffEntry;
    indexes: {
      by_completed_at: number;
    };
  };
}

export const DB_NAME = 'LazyChefDB';
export const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<LazyChefDBSchema>> | null = null;

/**
 * Normalizes custom ingredients for collision-free composite keys.
 * Format: c_${encodeURIComponent(name.toLowerCase().trim())}
 */
export function normalizeCustomIngredient(name: string): string {
  return `c_${encodeURIComponent(name.toLowerCase().trim())}`;
}

/**
 * Generates a structured delimited composite cache key:
 * ${sortedIngredients.join('|')}:urgent:${sortedUrgency.join('|')}:${engine}
 */
export function generateRecipeCacheKey(
  ingredients: string[],
  urgency: string[],
  engine: string
): string {
  const sortedIngredients = [...ingredients].sort((a, b) => a.localeCompare(b));
  const sortedUrgency = [...urgency].sort((a, b) => a.localeCompare(b));
  return `${sortedIngredients.join('|')}:urgent:${sortedUrgency.join('|')}:${engine}`;
}

/**
 * Returns or initializes the open IDB database connection.
 */
export function getDB(): Promise<IDBPDatabase<LazyChefDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<LazyChefDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Store 1: pantry_items
        if (!db.objectStoreNames.contains('pantry_items')) {
          const pantryStore = db.createObjectStore('pantry_items', { keyPath: 'id' });
          pantryStore.createIndex('by_category', 'category');
          pantryStore.createIndex('by_urgency', 'shelfLifeUrgency');
        }

        // Store 2: recipe_cache
        if (!db.objectStoreNames.contains('recipe_cache')) {
          const cacheStore = db.createObjectStore('recipe_cache', { keyPath: 'id' });
          cacheStore.createIndex('by_generated_at', 'generatedAt');
        }

        // Store 3: payoff_history
        if (!db.objectStoreNames.contains('payoff_history')) {
          const payoffStore = db.createObjectStore('payoff_history', {
            keyPath: 'id',
            autoIncrement: true
          });
          payoffStore.createIndex('by_completed_at', 'completedAt');
        }
      }
    });
  }
  return dbPromise;
}

/**
 * Resets the cached database connection handle (useful for testing or migration).
 */
export function resetDBHandle(): void {
  dbPromise = null;
}

export class LazyChefDBAdapter {
  /**
   * Retrieves a cached recipe by composite ingredients, urgency, and engine.
   */
  public static async getCachedRecipe(
    ingredients: string[],
    urgency: string[],
    engine: string
  ): Promise<LazyRecipe | null> {
    const key = generateRecipeCacheKey(ingredients, urgency, engine);
    const db = await getDB();
    const entry = await db.get('recipe_cache', key);
    return entry ? entry.recipe : null;
  }

  /**
   * Stores a recipe into the recipe_cache.
   */
  public static async setCachedRecipe(
    ingredients: string[],
    urgency: string[],
    engine: CachedRecipe['engineUsed'],
    recipe: LazyRecipe
  ): Promise<void> {
    const key = generateRecipeCacheKey(ingredients, urgency, engine);
    const db = await getDB();
    const entry: CachedRecipe = {
      id: key,
      ingredientsHash: key,
      recipe,
      engineUsed: engine,
      generatedAt: Date.now()
    };
    await db.put('recipe_cache', entry);
  }

  /**
   * Appends an entry to the payoff_history store.
   */
  public static async addPayoffEntry(entry: Omit<PayoffEntry, 'id'>): Promise<number> {
    const db = await getDB();
    const id = await db.add('payoff_history', entry as PayoffEntry);
    return id as number;
  }

  /**
   * Retrieves all payoff entries sorted chronologically.
   */
  public static async getAllPayoffEntries(): Promise<PayoffEntry[]> {
    const db = await getDB();
    return db.getAllFromIndex('payoff_history', 'by_completed_at');
  }

  /**
   * Retrieves all stored pantry items.
   */
  public static async getPantryItems(): Promise<PantryItem[]> {
    const db = await getDB();
    return db.getAll('pantry_items');
  }

  /**
   * Saves or updates a pantry item in IndexedDB.
   */
  public static async savePantryItem(item: PantryItem): Promise<void> {
    const db = await getDB();
    await db.put('pantry_items', item);
  }

  /**
   * Deletes a pantry item by ID from IndexedDB.
   */
  public static async deletePantryItem(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('pantry_items', id);
  }

  /**
   * Clears all stores in the database.
   */
  public static async clearAll(): Promise<void> {
    const db = await getDB();
    const tx = db.transaction(['pantry_items', 'recipe_cache', 'payoff_history'], 'readwrite');
    await Promise.all([
      tx.objectStore('pantry_items').clear(),
      tx.objectStore('recipe_cache').clear(),
      tx.objectStore('payoff_history').clear(),
      tx.done
    ]);
  }
}
