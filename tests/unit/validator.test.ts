import { describe, it, expect } from 'vitest';
import { validateSlothRecipe, SlothValidationError } from '../../src/core/validator';
import { LazyRecipe } from '../../src/types/recipe';

describe('validateSlothRecipe (Sloth Constraint Enforcement)', () => {
  const validRecipe: LazyRecipe = {
    title: '10-Minute Garlic Butter Egg Fried Rice',
    sloth_level: 'Sloth Level 1: 1 Pan, 1 Spatula, 0 Knives',
    vessel: '1 Skillet',
    cook_time_minutes: 10,
    ingredients_used: ['Rice', 'Eggs', 'Butter', 'Garlic'],
    grocery_gap: ['Green Onions'],
    steps: [
      'Melt butter and scramble eggs loosely in skillet.',
      'Add rice and garlic, stirring on high heat.',
      'Drizzle soy sauce and serve directly.'
    ],
    lazy_payoff: {
      decision_minutes_saved: 15,
      money_saved_usd: 6.5,
      dishes_saved: 2
    }
  };

  it('accepts a fully compliant Sloth Recipe', () => {
    const result = validateSlothRecipe(validRecipe);
    expect(result.title).toBe(validRecipe.title);
    expect(result.vessel).toBe('1 Skillet');
    expect(result.steps.length).toBe(3);
    expect(result.cook_time_minutes).toBe(10);
  });

  it('rejects non-object or null inputs', () => {
    expect(() => validateSlothRecipe(null)).toThrow(SlothValidationError);
    expect(() => validateSlothRecipe(undefined)).toThrow(SlothValidationError);
    expect(() => validateSlothRecipe('string')).toThrow(SlothValidationError);
    expect(() => validateSlothRecipe(123)).toThrow(SlothValidationError);
  });

  it('rejects empty or excessively long titles', () => {
    expect(() => validateSlothRecipe({ ...validRecipe, title: '' })).toThrow(SlothValidationError);
    expect(() => validateSlothRecipe({ ...validRecipe, title: '   ' })).toThrow(SlothValidationError);
    expect(() => validateSlothRecipe({ ...validRecipe, title: 'A'.repeat(81) })).toThrow(SlothValidationError);
  });

  it('enforces the strict 1-vessel constraint', () => {
    expect(() => validateSlothRecipe({ ...validRecipe, vessel: '2 Pots' })).toThrow(SlothValidationError);
    expect(() => validateSlothRecipe({ ...validRecipe, vessel: 'Oven Roaster' })).toThrow(SlothValidationError);
    expect(validateSlothRecipe({ ...validRecipe, vessel: '1 Pot' }).vessel).toBe('1 Pot');
    expect(validateSlothRecipe({ ...validRecipe, vessel: '1 Sheet Pan' }).vessel).toBe('1 Sheet Pan');
    expect(validateSlothRecipe({ ...validRecipe, vessel: '1 Microwave Bowl' }).vessel).toBe('1 Microwave Bowl');
  });

  it('enforces the 1 to 3 steps boundary', () => {
    // 0 steps -> reject
    expect(() => validateSlothRecipe({ ...validRecipe, steps: [] })).toThrow(SlothValidationError);
    // 1 step -> accept
    expect(validateSlothRecipe({ ...validRecipe, steps: ['Cook it.'] }).steps.length).toBe(1);
    // 2 steps -> accept
    expect(validateSlothRecipe({ ...validRecipe, steps: ['Step 1', 'Step 2'] }).steps.length).toBe(2);
    // 3 steps -> accept
    expect(validateSlothRecipe({ ...validRecipe, steps: ['Step 1', 'Step 2', 'Step 3'] }).steps.length).toBe(3);
    // 4 steps -> reject
    expect(() => validateSlothRecipe({ ...validRecipe, steps: ['S1', 'S2', 'S3', 'S4'] })).toThrow(SlothValidationError);
    // empty string in steps -> reject
    expect(() => validateSlothRecipe({ ...validRecipe, steps: ['S1', '   '] })).toThrow(SlothValidationError);
  });

  it('enforces the <= 15 minutes cook time boundary', () => {
    // 0 minutes -> reject
    expect(() => validateSlothRecipe({ ...validRecipe, cook_time_minutes: 0 })).toThrow(SlothValidationError);
    // negative minutes -> reject
    expect(() => validateSlothRecipe({ ...validRecipe, cook_time_minutes: -5 })).toThrow(SlothValidationError);
    // 1 minute -> accept
    expect(validateSlothRecipe({ ...validRecipe, cook_time_minutes: 1 }).cook_time_minutes).toBe(1);
    // 15 minutes -> accept
    expect(validateSlothRecipe({ ...validRecipe, cook_time_minutes: 15 }).cook_time_minutes).toBe(15);
    // 16 minutes -> reject
    expect(() => validateSlothRecipe({ ...validRecipe, cook_time_minutes: 16 })).toThrow(SlothValidationError);
    // Non-integer -> reject
    expect(() => validateSlothRecipe({ ...validRecipe, cook_time_minutes: 10.5 })).toThrow(SlothValidationError);
  });

  it('requires at least 1 ingredient used', () => {
    expect(() => validateSlothRecipe({ ...validRecipe, ingredients_used: [] })).toThrow(SlothValidationError);
  });

  it('restricts grocery gap to 0-2 items', () => {
    expect(validateSlothRecipe({ ...validRecipe, grocery_gap: [] }).grocery_gap).toEqual([]);
    expect(validateSlothRecipe({ ...validRecipe, grocery_gap: ['Garlic', 'Chili'] }).grocery_gap.length).toBe(2);
    expect(() => validateSlothRecipe({ ...validRecipe, grocery_gap: ['A', 'B', 'C'] })).toThrow(SlothValidationError);
  });

  it('falls back to default sloth level and deterministic payoff if omitted', () => {
    const rawWithoutDefaults = {
      title: 'Simple Egg Skillet',
      vessel: '1 Skillet',
      cook_time_minutes: 5,
      ingredients_used: ['Egg'],
      steps: ['Crack and fry egg in butter for 3 minutes.']
    };
    const validated = validateSlothRecipe(rawWithoutDefaults);
    expect(validated.sloth_level).toBe('Sloth Level 1: 1 Pan, 1 Spatula, 0 Knives');
    expect(validated.lazy_payoff.decision_minutes_saved).toBe(15);
    expect(validated.lazy_payoff.money_saved_usd).toBe(6.5);
    expect(validated.lazy_payoff.dishes_saved).toBe(2);
  });
});
