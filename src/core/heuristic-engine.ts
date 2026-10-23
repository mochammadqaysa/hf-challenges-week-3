/**
 * LazyChef Deterministic Heuristic Engine
 * High-flavor, zero-latency (<15ms) emergency Sloth Recipe generator.
 */

import { LazyRecipe, AllowedVessel } from '../types/recipe';
import { validateSlothRecipe } from './validator';

export interface HeuristicRule {
  id: string;
  requiredCore: string[];
  complementary: string[];
  recipe: Omit<LazyRecipe, 'grocery_gap' | 'ingredients_used'>;
  potentialGaps: string[];
}

export const HEURISTIC_RULES: readonly HeuristicRule[] = [
  {
    id: 'fried-rice',
    requiredCore: ['rice', 'leftover rice', 'leftover_rice', 'cooked rice'],
    complementary: ['egg', 'eggs', 'soy sauce', 'soy_sauce', 'butter', 'garlic', 'oil', 'cooking_oil', 'sesame_oil'],
    recipe: {
      title: '10-Minute Garlic Butter Egg Fried Rice',
      sloth_level: 'Sloth Level 1: 1 Pan, 1 Spatula, 0 Knives',
      vessel: '1 Skillet',
      cook_time_minutes: 9,
      steps: [
        'Melt butter in a skillet over medium heat, crack in eggs, and scramble loosely for 1 minute.',
        'Dump cold leftover rice directly into the skillet, breaking clumps with a spatula, and drizzle with soy sauce.',
        'Toss vigorously on high heat for 3 minutes until steaming and slightly crisped. Eat directly from the pan or bowl!'
      ],
      lazy_payoff: { decision_minutes_saved: 15, money_saved_usd: 6.5, dishes_saved: 2 }
    },
    potentialGaps: ['Green Onions', 'Toasted Sesame Oil']
  },
  {
    id: 'midnight-aglio-olio',
    requiredCore: ['pasta', 'spaghetti', 'noodles', 'instant_ramen', 'ramen'],
    complementary: ['garlic', 'oil', 'olive oil', 'olive_oil', 'butter', 'cheese', 'parmesan', 'chili_flakes'],
    recipe: {
      title: '12-Minute One-Pan Midnight Aglio e Olio',
      sloth_level: 'Sloth Level 1: 1 Pan, 1 Spatula, 0 Knives',
      vessel: '1 Pot',
      cook_time_minutes: 12,
      steps: [
        'Boil pasta in a shallow pot with minimal water and salt until al dente (about 8 minutes).',
        'Push pasta to one side of the pot, add olive oil and crushed garlic to the water reduction for 2 minutes.',
        'Stir everything together vigorously until a glossy emulsion coats the pasta. Serve immediately.'
      ],
      lazy_payoff: { decision_minutes_saved: 15, money_saved_usd: 6.5, dishes_saved: 2 }
    },
    potentialGaps: ['Red Pepper Flakes', 'Parmesan Cheese']
  },
  {
    id: 'survival-egg',
    requiredCore: ['egg', 'eggs'],
    complementary: ['bread', 'toast', 'tortilla', 'cheese', 'cheddar_cheese', 'butter', 'sausage'],
    recipe: {
      title: '6-Minute Golden Crispy Fried Eggs on Toast',
      sloth_level: 'Sloth Level 1: 1 Pan, 1 Spatula, 0 Knives',
      vessel: '1 Skillet',
      cook_time_minutes: 6,
      steps: [
        'Heat a dab of butter or oil in a skillet over high heat until sizzling.',
        'Crack eggs directly into the pan; slide bread slices into the empty side of the pan to toast.',
        'Flip toast once, baste egg whites with sizzling butter for 2 minutes, and slide everything onto a plate.'
      ],
      lazy_payoff: { decision_minutes_saved: 15, money_saved_usd: 6.5, dishes_saved: 2 }
    },
    potentialGaps: ['Hot Sauce', 'Black Pepper']
  },
  {
    id: 'cheesy-tortilla-melt',
    requiredCore: ['tortilla', 'bread', 'potato'],
    complementary: ['cheese', 'cheddar_cheese', 'butter', 'sausage', 'canned_tuna', 'spinach', 'tomato'],
    recipe: {
      title: '7-Minute Crispy Skillet Cheesy Melt',
      sloth_level: 'Sloth Level 1: 1 Pan, 1 Spatula, 0 Knives',
      vessel: '1 Skillet',
      cook_time_minutes: 7,
      steps: [
        'Place tortilla or bread in a dry skillet over medium-low heat.',
        'Layer cheese and fillings onto one half, then fold over into a crisp pocket.',
        'Grill for 3 minutes per side until golden brown and molten in the center. Enjoy hot!'
      ],
      lazy_payoff: { decision_minutes_saved: 15, money_saved_usd: 6.5, dishes_saved: 2 }
    },
    potentialGaps: ['Salsa Dip', 'Smoked Paprika']
  }
];

export class DeterministicSlothEngine {
  /**
   * Generates a validated LazyRecipe deterministically from active pantry ingredients.
   * Execution completes in <15ms.
   */
  public static generate(
    rawIngredients: string[],
    urgencyItems: string[] = []
  ): { recipe: LazyRecipe; latencyMs: number } {
    const startTime = performance.now();

    const normalizedIngredients = rawIngredients.map(item =>
      item.toLowerCase().trim().replace(/[-_]/g, ' ')
    );
    const normalizedUrgency = urgencyItems.map(item =>
      item.toLowerCase().trim().replace(/[-_]/g, ' ')
    );

    // Score rules based on overlap
    let bestRule: HeuristicRule | null = null;
    let highestScore = -1;

    for (const rule of HEURISTIC_RULES) {
      let score = 0;
      let hasCoreMatch = false;

      for (const core of rule.requiredCore) {
        const cleanCore = core.toLowerCase().replace(/[-_]/g, ' ');
        if (normalizedIngredients.some(ing => ing.includes(cleanCore) || cleanCore.includes(ing))) {
          score += 5;
          hasCoreMatch = true;
          // Urgency bonus if core item needs to be used soon
          if (normalizedUrgency.some(u => u.includes(cleanCore) || cleanCore.includes(u))) {
            score += 3;
          }
        }
      }

      for (const comp of rule.complementary) {
        const cleanComp = comp.toLowerCase().replace(/[-_]/g, ' ');
        if (normalizedIngredients.some(ing => ing.includes(cleanComp) || cleanComp.includes(ing))) {
          score += 2;
        }
      }

      if (hasCoreMatch && score > highestScore) {
        highestScore = score;
        bestRule = rule;
      }
    }

    let recipeToValidate: Partial<LazyRecipe>;

    if (bestRule && highestScore > 0) {
      // Build recipe from matched rule
      const groceryGap = bestRule.potentialGaps
        .filter(gap => !normalizedIngredients.some(ing => ing.includes(gap.toLowerCase())))
        .slice(0, 2);

      const ingredientsUsed = rawIngredients.length > 0
        ? rawIngredients.slice(0, 4)
        : ['Pantry Staples'];

      recipeToValidate = {
        ...bestRule.recipe,
        ingredients_used: ingredientsUsed,
        grocery_gap: groceryGap
      };
    } else {
      // Universal Emergency Fallback Sauté
      const primaryItems = rawIngredients.length > 0
        ? rawIngredients.slice(0, 3)
        : ['Eggs', 'Butter', 'Salt'];

      recipeToValidate = {
        title: `8-Minute Sloth ${primaryItems[0] || 'Pantry'} Sauté`,
        sloth_level: 'Sloth Level 1: 1 Pan, 1 Spatula, 0 Knives',
        vessel: '1 Skillet' as AllowedVessel,
        cook_time_minutes: 8,
        ingredients_used: primaryItems,
        grocery_gap: ['Garlic Powder', 'Soy Sauce'],
        steps: [
          `Heat a dab of cooking oil or butter in your skillet until shimmering.`,
          `Toss in ${primaryItems.join(' and ')} over medium-high heat with a pinch of salt.`,
          `Sauté quickly for 4 to 5 minutes until tender and fragrant. Eat directly from the pan!`
        ],
        lazy_payoff: {
          decision_minutes_saved: 15,
          money_saved_usd: 6.5,
          dishes_saved: 2
        }
      };
    }

    const validatedRecipe = validateSlothRecipe(recipeToValidate);
    const latencyMs = Number((performance.now() - startTime).toFixed(2));

    return {
      recipe: validatedRecipe,
      latencyMs
    };
  }
}
