/**
 * LazyChef Pure Validation Seam - Sloth Constraint Enforcement
 */

import {
  LazyRecipe,
  ALLOWED_VESSELS,
  SLOTH_LEVELS,
  DEFAULT_LAZY_PAYOFF,
  AllowedVessel,
  SlothLevel
} from '../types/recipe';

export class SlothValidationError extends Error {
  constructor(public readonly violation: string) {
    super(`Sloth Constraint Violation: ${violation}`);
    this.name = 'SlothValidationError';
  }
}

/**
 * Validates and strictly enforces Sloth Constraints on incoming recipe data.
 * Guarantees <= 1 vessel, <= 3 steps, and <= 15 minutes.
 */
export function validateSlothRecipe(input: unknown): LazyRecipe {
  if (typeof input !== 'object' || input === null) {
    throw new SlothValidationError('Recipe output must be a valid JSON object.');
  }

  const raw = input as Record<string, unknown>;

  // Title validation
  if (!raw.title || typeof raw.title !== 'string' || raw.title.trim().length === 0) {
    throw new SlothValidationError('Missing or invalid recipe title.');
  }
  if (raw.title.length > 80) {
    throw new SlothValidationError(`Recipe title exceeds 80 characters limit (received ${raw.title.length}).`);
  }

  // Vessel validation (Strict 1-Vessel Rule)
  if (!raw.vessel || typeof raw.vessel !== 'string' || !ALLOWED_VESSELS.includes(raw.vessel as AllowedVessel)) {
    throw new SlothValidationError(`Vessel must be one of: ${ALLOWED_VESSELS.join(', ')}. Received: ${String(raw.vessel)}`);
  }

  // Steps validation (Strict 1-3 Steps Rule)
  if (!Array.isArray(raw.steps) || raw.steps.length === 0 || raw.steps.length > 3) {
    throw new SlothValidationError(`Steps count must be between 1 and 3. Received: ${Array.isArray(raw.steps) ? raw.steps.length : 'none'}`);
  }
  for (let i = 0; i < raw.steps.length; i++) {
    const step = raw.steps[i];
    if (typeof step !== 'string' || step.trim().length === 0) {
      throw new SlothValidationError(`Step ${i + 1} must be a non-empty string.`);
    }
  }

  // Cook Time validation (Strict <= 15 Minutes Rule)
  if (
    typeof raw.cook_time_minutes !== 'number' ||
    !Number.isInteger(raw.cook_time_minutes) ||
    raw.cook_time_minutes <= 0 ||
    raw.cook_time_minutes > 15
  ) {
    throw new SlothValidationError(`Cook time must be an integer between 1 and 15 minutes. Received: ${String(raw.cook_time_minutes)}`);
  }

  // Ingredients used validation
  if (!Array.isArray(raw.ingredients_used) || raw.ingredients_used.length === 0) {
    throw new SlothValidationError('Recipe must use at least 1 ingredient.');
  }

  // Grocery gap validation (0 to 2 items)
  const grocery_gap: string[] = Array.isArray(raw.grocery_gap)
    ? (raw.grocery_gap.filter((item): item is string => typeof item === 'string') as string[])
    : [];
  if (grocery_gap.length > 2) {
    throw new SlothValidationError(`Grocery gap cannot exceed 2 optional items. Received: ${grocery_gap.length}`);
  }

  // Sloth Level validation
  let sloth_level = raw.sloth_level as SlothLevel;
  if (!sloth_level || !SLOTH_LEVELS.includes(sloth_level)) {
    sloth_level = SLOTH_LEVELS[0]; // Default fallback if missing
  }

  // Lazy Payoff validation (stamp defaults deterministically if not present or partial)
  const rawPayoff = raw.lazy_payoff as Partial<typeof DEFAULT_LAZY_PAYOFF> | undefined;
  const lazy_payoff = {
    decision_minutes_saved: typeof rawPayoff?.decision_minutes_saved === 'number' ? rawPayoff.decision_minutes_saved : DEFAULT_LAZY_PAYOFF.decision_minutes_saved,
    money_saved_usd: typeof rawPayoff?.money_saved_usd === 'number' ? rawPayoff.money_saved_usd : DEFAULT_LAZY_PAYOFF.money_saved_usd,
    dishes_saved: typeof rawPayoff?.dishes_saved === 'number' ? rawPayoff.dishes_saved : DEFAULT_LAZY_PAYOFF.dishes_saved
  };

  return {
    title: raw.title.trim(),
    sloth_level,
    vessel: raw.vessel as AllowedVessel,
    cook_time_minutes: raw.cook_time_minutes,
    ingredients_used: raw.ingredients_used.map(String),
    grocery_gap,
    steps: raw.steps.map(s => String(s).trim()),
    lazy_payoff
  };
}
