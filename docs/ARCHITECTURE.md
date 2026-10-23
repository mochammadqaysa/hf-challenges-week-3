# Architecture Map - LazyChef & Pantry Autopilot

> **Project Description:** LazyChef & Pantry Autopilot is a privacy-preserving, local-first kitchen copilot created for the Hacktoberfest 2026 Week 3: Slow and Steady Challenge. It strictly enforces Sloth Constraints: recommending exactly one meal requiring at most one cooking vessel, at most three instructions, and taking 15 minutes or less.

---

## 1. System Topography & Component Structure

```
lazychef-pantry-autopilot/
├── index.html                       # Single Page App shell with Google Fonts & root mount point
├── package.json                     # NPM dependencies, Vitest, TypeScript, Vite
├── tsconfig.json                    # Strict TypeScript configuration (DOM, WebWorker)
├── vite.config.ts                   # Bundler configuration supporting ES workers & Vitest
├── src/
│   ├── main.ts                      # Application bootstrapper & DOM hydration
│   ├── index.css                    # Vanilla CSS Design System (Sloth Earth & Warm Terracotta)
│   ├── components/                  # UI view components
│   │   ├── PantryInput.ts           # Tag selector, "Use Soon" urgency markers, custom input
│   │   └── RecipeCard.ts            # 1-vessel, 3-step recipe display with interactive checklist
│   ├── core/                        # Business logic & engines
│   │   ├── validator.ts             # Sloth JSON schema validator & pure constraint enforcement
│   │   └── heuristic-engine.ts      # Zero-latency (<15ms) deterministic emergency recipe matrix
│   ├── storage/                     # Client-side persistence layer
│   │   └── local-storage.ts         # Sub-16ms synchronous state cache (active pantry, payoff summary)
│   └── types/
│       ├── recipe.ts                # LazyRecipe, AllowedVessel, SlothLevel domain types
│       └── pantry.ts                # PantryItem, IngredientCategory, preset pantry collections
├── tests/                           # Test automation suite
│   └── unit/
│       ├── validator.test.ts        # 100% pure constraint validation suite
│       ├── heuristic-engine.test.ts # Matrix matching & execution latency test (<15ms)
│       └── local-storage.test.ts    # Synchronous storage cache unit tests
├── docs/                            # SDLC Documentation
│   ├── ARCHITECTURE.md              # Living architecture topography map
│   ├── adr/                         # Architecture Decision Records
│   └── audit/                       # SDLC Clarification & Consistency audit reports
├── plan/                            # Phased implementation plan (Tracer Bullets)
└── spec/                            # Detailed technical specifications
```

---

## 2. Architectural Boundaries & Data Flow

```
┌────────────────────────────────────────────────────────┐
│                   MAIN BROWSER THREAD                  │
│                                                        │
│   ┌─────────────────────┐      ┌────────────────────┐  │
│   │    PantryInput      │ ───► │  LocalStorageStore │  │
│   │ (Tag Pills, Custom) │      │  (Sub-16ms Sync)   │  │
│   └──────────┬──────────┘      └────────────────────┘  │
│              │ Active Ingredients                      │
│              ▼                                         │
│   ┌─────────────────────────────────────────────────┐  │
│   │      DeterministicSlothEngine.generate()        │  │
│   │         (<15ms Rule Matrix Matcher)             │  │
│   └──────────┬──────────────────────────────────────┘  │
│              │ Unvalidated Recipe                      │
│              ▼                                         │
│   ┌─────────────────────────────────────────────────┐  │
│   │         validateSlothRecipe()                   │  │
│   │    (1 Vessel, ≤3 Steps, ≤15 Min, ≤2 Gaps)       │  │
│   └──────────┬──────────────────────────────────────┘  │
│              │ Strictly Validated LazyRecipe           │
│              ▼                                         │
│   ┌─────────────────────────────────────────────────┐  │
│   │                  RecipeCard                     │  │
│   │  (Interactive 3-Step Checklist & Celebration)   │  │
│   └─────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## 3. Core Module Contracts

### `src/core/validator.ts`
- **Function:** `validateSlothRecipe(input: unknown): LazyRecipe`
- **Contract:** Rejects any recipe that violates Sloth Constraints (must have 1 vessel, 1-3 steps, <= 15 minutes, non-empty title <= 80 chars, 0-2 grocery gaps).

### `src/core/heuristic-engine.ts`
- **Class:** `DeterministicSlothEngine`
- **Method:** `generate(rawIngredients: string[], urgencyItems?: string[]): { recipe: LazyRecipe; latencyMs: number }`
- **Performance:** Execution strictly completes in $< 15\text{ms}$ on standard hardware.

### `src/storage/local-storage.ts`
- **Class:** `LocalStorageStore`
- **Methods:** `getActivePantryIds()`, `setActivePantryIds()`, `getUrgencyIds()`, `setUrgencyIds()`, `getCustomIngredients()`, `addCustomIngredient()`, `getPayoffSummary()`, `setPayoffSummary()`.

---

## 4. Verification & Testing

- **Unit Tests:** `npm test` (Runs Vitest suite across validator, heuristic engine, and storage).
- **Coverage:** `npm run test:coverage` (Guarantees >=95% coverage on core logic and 100% on validator).
- **Production Build:** `npm run build` (Compiles TypeScript and bundles via Vite; bundle strictly $\le 350\text{ KB}$ gzipped).
