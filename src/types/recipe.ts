/**
 * LazyChef Core Domain Contracts - Recipe & Sloth Constraints
 */

export type AllowedVessel =
  | '1 Skillet'
  | '1 Pot'
  | '1 Sheet Pan'
  | '1 Microwave Bowl';

export type SlothLevel =
  | 'Sloth Level 1: 1 Pan, 1 Spatula, 0 Knives'
  | 'Sloth Level 2: 1 Pot, 1 Spoon, Minimal Prep'
  | 'Sloth Level 3: 1 Sheet-Pan, Dump & Bake';

export interface LazyPayoff {
  decision_minutes_saved: number;
  money_saved_usd: number;
  dishes_saved: number;
}

export interface LazyRecipe {
  title: string;
  sloth_level: SlothLevel;
  vessel: AllowedVessel;
  cook_time_minutes: number;
  ingredients_used: string[];
  grocery_gap: string[];
  steps: string[];
  lazy_payoff: LazyPayoff;
}

export const ALLOWED_VESSELS: readonly AllowedVessel[] = [
  '1 Skillet',
  '1 Pot',
  '1 Sheet Pan',
  '1 Microwave Bowl'
] as const;

export const SLOTH_LEVELS: readonly SlothLevel[] = [
  'Sloth Level 1: 1 Pan, 1 Spatula, 0 Knives',
  'Sloth Level 2: 1 Pot, 1 Spoon, Minimal Prep',
  'Sloth Level 3: 1 Sheet-Pan, Dump & Bake'
] as const;

export const DEFAULT_LAZY_PAYOFF: LazyPayoff = {
  decision_minutes_saved: 15,
  money_saved_usd: 6.5,
  dishes_saved: 2
};

export interface GenerationResult {
  recipe: LazyRecipe;
  engineUsed: string;
}

/**
 * Interface abstraction for recipe inference engines (DIP decoupling).
 */
export interface IRecipeInferenceService {
  generateRecipe(ingredients: string[], urgency?: string[]): Promise<GenerationResult>;
  initBackgroundPipeline(): Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onStatusChange(listener: (status: any) => void): () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onProgressChange(listener: (progress: any) => void): () => void;
}

