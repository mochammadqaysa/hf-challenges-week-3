/**
 * LazyChef Dual-Layer Safety Filter
 * Layer 1: Fast lexical blocklist screening against toxic, inedible, or hazardous items.
 * Enforces SEC-002 and AC-005.
 */

export class ToxicIngredientError extends Error {
  constructor(public readonly blockedTerm: string, public readonly originalInput: string) {
    super(`Safety Violation: Inedible or toxic item detected ("${blockedTerm}").`);
    this.name = 'ToxicIngredientError';
  }
}

export const FRIENDLY_TOXIC_WARNING = 'LazyChef only cooks safe, edible pantry ingredients! 🥣';

/**
 * Categorized blocklist of inedible and toxic materials:
 * - Cleaning supplies / household chemicals
 * - Petroleum products / automotive fluids
 * - Inedible polymers / synthetic materials / industrial poisons
 * - Medications / pharmaceuticals / regulated narcotics
 */
export const TOXIC_BLOCKLIST: readonly string[] = [
  // Cleaning chemicals & household toxins
  'bleach',
  'detergent',
  'dish soap',
  'soap',
  'ammonia',
  'draino',
  'drano',
  'windex',
  'clorox',
  'lysol',
  'disinfectant',
  'cleanser',
  'battery acid',
  'borax',
  'lye',
  'acetone',
  'rubbing alcohol',
  'isopropyl',
  'hand sanitizer',

  // Petroleum & automotive fluids
  'petroleum',
  'gasoline',
  'petrol',
  'diesel',
  'kerosene',
  'motor oil',
  'engine oil',
  'lighter fluid',
  'crude oil',
  'antifreeze',
  'coolant',
  'brake fluid',
  'transmission fluid',
  'wd-40',
  'wd40',

  // Inedible polymers, heavy metals & poisons
  'plastic',
  'polyester',
  'nylon',
  'pvc',
  'styrofoam',
  'polyurethane',
  'cyanide',
  'arsenic',
  'strychnine',
  'pesticide',
  'insecticide',
  'herbicide',
  'rat poison',
  'fertilizer',
  'paint thinner',
  'paint',
  'varnish',
  'turpentine',
  'super glue',
  'epoxy',
  'cement',
  'mortar',
  'plaster',
  'mercury',
  'lead',
  'asbestos',

  // Pharmaceuticals & regulated substances
  'paracetamol',
  'ibuprofen',
  'aspirin',
  'antibiotic',
  'tylenol',
  'advil',
  'valium',
  'xanax',
  'adderall',
  'morphine',
  'codeine',
  'fentanyl',
  'prescription drugs',
  'medication',
  'poison'
] as const;

/**
 * Escapes special regex characters in a search term.
 */
function escapeRegex(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalizes input text by removing custom item prefixes ('c_') and decoding URI components.
 */
function normalizeInput(input: string): string {
  let cleaned = input.trim();
  if (cleaned.startsWith('c_')) {
    try {
      cleaned = decodeURIComponent(cleaned.slice(2));
    } catch {
      cleaned = cleaned.slice(2);
    }
  }
  return cleaned.toLowerCase();
}

export interface SafetyCheckResult {
  isSafe: boolean;
  flaggedTerm?: string;
  matchedText?: string;
}

export class SafetyFilter {
  private static compiledRegexes: Array<{ term: string; regex: RegExp }> = TOXIC_BLOCKLIST.map(
    (term) => ({
      term,
      regex: new RegExp(`\\b${escapeRegex(term.toLowerCase())}(s|es)?\\b`, 'i')
    })
  );

  /**
   * Evaluates a single ingredient string or an array of ingredient strings.
   * Returns SafetyCheckResult indicating safety and the first flagged term found.
   */
  public static checkSafety(input: string | string[]): SafetyCheckResult {
    const items = Array.isArray(input) ? input : [input];

    for (const rawItem of items) {
      const normalized = normalizeInput(rawItem);
      if (!normalized) continue;

      for (const { term, regex } of SafetyFilter.compiledRegexes) {
        if (regex.test(normalized)) {
          return {
            isSafe: false,
            flaggedTerm: term,
            matchedText: rawItem
          };
        }
      }
    }

    return { isSafe: true };
  }

  /**
   * Helper returning true if all items in the input are safe, false otherwise.
   */
  public static isSafe(input: string | string[]): boolean {
    return SafetyFilter.checkSafety(input).isSafe;
  }

  /**
   * Validates an ingredient array, throwing ToxicIngredientError if any item violates safety rules.
   */
  public static validateIngredients(ingredients: string[]): void {
    const result = SafetyFilter.checkSafety(ingredients);
    if (!result.isSafe) {
      throw new ToxicIngredientError(result.flaggedTerm!, result.matchedText!);
    }
  }
}
