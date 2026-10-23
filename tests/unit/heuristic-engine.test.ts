import { describe, it, expect } from 'vitest';
import { DeterministicSlothEngine, HEURISTIC_RULES } from '../../src/core/heuristic-engine';
import { validateSlothRecipe } from '../../src/core/validator';

describe('DeterministicSlothEngine (Offline Heuristic Matching)', () => {
  it('has at least 4 predefined emergency heuristic rules', () => {
    expect(HEURISTIC_RULES.length).toBeGreaterThanOrEqual(4);
  });

  it('matches Garlic Butter Egg Fried Rice when given rice and eggs', () => {
    const { recipe, latencyMs } = DeterministicSlothEngine.generate(['leftover_rice', 'eggs', 'soy_sauce']);
    expect(recipe.title).toContain('Fried Rice');
    expect(recipe.vessel).toBe('1 Skillet');
    expect(recipe.steps.length).toBeLessThanOrEqual(3);
    expect(recipe.cook_time_minutes).toBeLessThanOrEqual(15);
    expect(latencyMs).toBeLessThan(15);
  });

  it('matches Aglio e Olio when given pasta and garlic', () => {
    const { recipe, latencyMs } = DeterministicSlothEngine.generate(['pasta', 'garlic', 'olive_oil']);
    expect(recipe.title).toContain('Aglio e Olio');
    expect(recipe.vessel).toBe('1 Pot');
    expect(recipe.cook_time_minutes).toBeLessThanOrEqual(15);
    expect(latencyMs).toBeLessThan(15);
  });

  it('matches Crispy Fried Eggs on Toast when given eggs and bread', () => {
    const { recipe, latencyMs } = DeterministicSlothEngine.generate(['eggs', 'bread', 'butter']);
    expect(recipe.title).toContain('Crispy Fried Eggs on Toast');
    expect(recipe.vessel).toBe('1 Skillet');
    expect(recipe.steps.length).toBeLessThanOrEqual(3);
    expect(latencyMs).toBeLessThan(15);
  });

  it('generates an appetizing emergency sauté for obscure ingredients', () => {
    const { recipe, latencyMs } = DeterministicSlothEngine.generate(['tofu', 'spinach', 'mushrooms']);
    expect(recipe.title).toContain('Sauté');
    expect(recipe.vessel).toBe('1 Skillet');
    expect(recipe.cook_time_minutes).toBeLessThanOrEqual(15);
    expect(recipe.steps.length).toBeLessThanOrEqual(3);
    expect(latencyMs).toBeLessThan(15);
    expect(() => validateSlothRecipe(recipe)).not.toThrow();
  });

  it('generates a valid recipe even with an empty pantry array', () => {
    const { recipe, latencyMs } = DeterministicSlothEngine.generate([]);
    expect(recipe.title).toBeDefined();
    expect(recipe.steps.length).toBeGreaterThan(0);
    expect(recipe.steps.length).toBeLessThanOrEqual(3);
    expect(latencyMs).toBeLessThan(15);
    expect(() => validateSlothRecipe(recipe)).not.toThrow();
  });

  it('filters grocery gap items already selected by user', () => {
    // Fried rice potential gaps are ['Green Onions', 'Toasted Sesame Oil']
    const { recipe } = DeterministicSlothEngine.generate(['leftover_rice', 'eggs', 'green onions']);
    expect(recipe.grocery_gap).not.toContain('Green Onions');
    expect(recipe.grocery_gap.length).toBeLessThanOrEqual(2);
  });
});
