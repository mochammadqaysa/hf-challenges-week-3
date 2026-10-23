/**
 * LazyChef Core Domain Contracts - Pantry Inventory & Categories
 */

export type IngredientCategory =
  | 'protein'
  | 'carb'
  | 'vegetable'
  | 'aromatic_sauce'
  | 'dairy_fat'
  | 'staple';

export type ShelfLifeUrgency = 'normal' | 'use_soon';

export interface PantryItem {
  id: string;
  name: string;
  category: IngredientCategory;
  shelfLifeUrgency: ShelfLifeUrgency;
  addedAt: number;
  updatedAt: number;
  isCustom?: boolean;
}

export interface PresetPantryCategory {
  id: IngredientCategory;
  label: string;
  icon: string;
  items: Array<{ id: string; name: string }>;
}

export const PRESET_PANTRY_CATEGORIES: readonly PresetPantryCategory[] = [
  {
    id: 'protein',
    label: 'Proteins',
    icon: '🥩',
    items: [
      { id: 'eggs', name: 'Eggs' },
      { id: 'tofu', name: 'Tofu' },
      { id: 'canned_tuna', name: 'Canned Tuna' },
      { id: 'chicken_breast', name: 'Chicken Breast' },
      { id: 'sausage', name: 'Sausage' },
      { id: 'canned_beans', name: 'Canned Beans' }
    ]
  },
  {
    id: 'carb',
    label: 'Carbs',
    icon: '🍚',
    items: [
      { id: 'leftover_rice', name: 'Leftover Rice' },
      { id: 'pasta', name: 'Pasta' },
      { id: 'bread', name: 'Bread' },
      { id: 'tortilla', name: 'Tortilla' },
      { id: 'instant_ramen', name: 'Instant Ramen' },
      { id: 'potato', name: 'Potato' }
    ]
  },
  {
    id: 'vegetable',
    label: 'Veggies',
    icon: '🥬',
    items: [
      { id: 'spinach', name: 'Spinach' },
      { id: 'onion', name: 'Onion' },
      { id: 'tomato', name: 'Tomato' },
      { id: 'broccoli', name: 'Broccoli' },
      { id: 'mushrooms', name: 'Mushrooms' },
      { id: 'frozen_veggies', name: 'Frozen Veggies' }
    ]
  },
  {
    id: 'aromatic_sauce',
    label: 'Aromatics & Sauces',
    icon: '🧄',
    items: [
      { id: 'garlic', name: 'Garlic' },
      { id: 'soy_sauce', name: 'Soy Sauce' },
      { id: 'olive_oil', name: 'Olive Oil' },
      { id: 'hot_sauce', name: 'Hot Sauce' },
      { id: 'chili_flakes', name: 'Chili Flakes' },
      { id: 'sesame_oil', name: 'Sesame Oil' }
    ]
  },
  {
    id: 'dairy_fat',
    label: 'Dairy & Fats',
    icon: '🧀',
    items: [
      { id: 'butter', name: 'Butter' },
      { id: 'cheddar_cheese', name: 'Cheddar Cheese' },
      { id: 'parmesan', name: 'Parmesan' },
      { id: 'milk', name: 'Milk' },
      { id: 'cream_cheese', name: 'Cream Cheese' }
    ]
  },
  {
    id: 'staple',
    label: 'Staples',
    icon: '🧂',
    items: [
      { id: 'salt', name: 'Salt' },
      { id: 'black_pepper', name: 'Black Pepper' },
      { id: 'sugar', name: 'Sugar' },
      { id: 'cooking_oil', name: 'Cooking Oil' }
    ]
  }
] as const;
