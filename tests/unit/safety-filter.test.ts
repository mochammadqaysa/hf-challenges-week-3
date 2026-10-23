import { describe, it, expect } from 'vitest';
import {
  SafetyFilter,
  ToxicIngredientError,
  TOXIC_BLOCKLIST,
  FRIENDLY_TOXIC_WARNING
} from '../../src/core/safety-filter';

describe('SafetyFilter (Lexical Screening & Dual-Layer Guard)', () => {
  it('exports FRIENDLY_TOXIC_WARNING matching AC-005 word-for-word', () => {
    expect(FRIENDLY_TOXIC_WARNING).toBe(
      'LazyChef only cooks safe, edible pantry ingredients! 🥣'
    );
  });

  it('exports a non-empty TOXIC_BLOCKLIST with standard toxic categories', () => {
    expect(TOXIC_BLOCKLIST.length).toBeGreaterThan(25);
    expect(TOXIC_BLOCKLIST).toContain('bleach');
    expect(TOXIC_BLOCKLIST).toContain('detergent');
    expect(TOXIC_BLOCKLIST).toContain('motor oil');
    expect(TOXIC_BLOCKLIST).toContain('cyanide');
    expect(TOXIC_BLOCKLIST).toContain('tylenol');
  });

  describe('Edible Food Items (Positive Cases)', () => {
    const safePantryItems = [
      'Eggs',
      'Rice',
      'Leftover rice',
      'Garlic',
      'Butter',
      'Olive oil',
      'Tofu',
      'Canned tuna',
      'Sausage',
      'Spinach',
      'Onions',
      'Tomatoes',
      'Broccoli',
      'Mushrooms',
      'Parmesan cheese',
      'Milk',
      'Soy sauce',
      'Black pepper',
      'Salt',
      'Bleached flour', // Word-boundary check: "bleach" must not flag "bleached"
      'Baking soda'
    ];

    it.each(safePantryItems)('permits safe food item "%s"', (item) => {
      const result = SafetyFilter.checkSafety(item);
      expect(result.isSafe).toBe(true);
      expect(result.flaggedTerm).toBeUndefined();
      expect(SafetyFilter.isSafe(item)).toBe(true);
    });

    it('validates array of safe ingredients without throwing', () => {
      expect(() => {
        SafetyFilter.validateIngredients(['rice', 'eggs', 'garlic', 'soy_sauce']);
      }).not.toThrow();
    });

    it('handles empty input, whitespace, and empty arrays safely', () => {
      expect(SafetyFilter.isSafe('')).toBe(true);
      expect(SafetyFilter.isSafe('   ')).toBe(true);
      expect(SafetyFilter.isSafe([])).toBe(true);
    });
  });

  describe('Toxic and Inedible Items (Negative Cases)', () => {
    const toxicItems = [
      'bleach',
      'BLEACH',
      'liquid detergent',
      'dish soap',
      'motor oil',
      'draino',
      'windex',
      'clorox wipes',
      'plastic shards',
      'styrofoam',
      'cyanide powder',
      'arsenic',
      'rat poison',
      'paint thinner',
      'battery acid',
      'super glue',
      'mercury',
      'asbestos',
      'paracetamol',
      'ibuprofen',
      'aspirin',
      'tylenol',
      'fentanyl'
    ];

    it.each(toxicItems)('flags toxic item "%s"', (item) => {
      const result = SafetyFilter.checkSafety(item);
      expect(result.isSafe).toBe(false);
      expect(result.flaggedTerm).toBeDefined();
      expect(SafetyFilter.isSafe(item)).toBe(false);
    });

    it('intercepts toxic custom item encoded with "c_" prefix', () => {
      const customToxic = 'c_motor%20oil';
      const result = SafetyFilter.checkSafety(customToxic);
      expect(result.isSafe).toBe(false);
      expect(result.flaggedTerm).toBe('motor oil');
    });

    it('handles custom items where decodeURIComponent might fail gracefully', () => {
      // Malformed URI component (%99)
      const malformedCustom = 'c_bleach%99';
      const result = SafetyFilter.checkSafety(malformedCustom);
      expect(result.isSafe).toBe(false);
    });

    it('flags toxic item mixed inside an otherwise healthy pantry list', () => {
      const mixedPantry = ['Eggs', 'Leftover Rice', 'Bleach', 'Soy Sauce'];
      const result = SafetyFilter.checkSafety(mixedPantry);
      expect(result.isSafe).toBe(false);
      expect(result.flaggedTerm).toBe('bleach');
      expect(result.matchedText).toBe('Bleach');
    });

    it('throws ToxicIngredientError from validateIngredients on toxic inputs', () => {
      expect(() => {
        SafetyFilter.validateIngredients(['Chicken breast', 'Detergent']);
      }).toThrowError(ToxicIngredientError);

      try {
        SafetyFilter.validateIngredients(['Detergent']);
      } catch (err) {
        expect(err).toBeInstanceOf(ToxicIngredientError);
        const toxicErr = err as ToxicIngredientError;
        expect(toxicErr.name).toBe('ToxicIngredientError');
        expect(toxicErr.blockedTerm).toBe('detergent');
        expect(toxicErr.originalInput).toBe('Detergent');
      }
    });

    it('matches plural forms using word boundaries (e.g. detergents, soaps, plastics)', () => {
      expect(SafetyFilter.isSafe('detergents')).toBe(false);
      expect(SafetyFilter.isSafe('soaps')).toBe(false);
      expect(SafetyFilter.isSafe('plastics')).toBe(false);
    });
  });
});
