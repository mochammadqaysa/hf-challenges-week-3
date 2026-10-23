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
│   ├── main.ts                      # Application bootstrapper, DOM hydration, safety gate & state bus
│   ├── index.css                    # Vanilla CSS Design System (Sloth Earth & Warm Terracotta, Toast & Gap CSS)
│   ├── components/                  # UI view components
│   │   ├── Header.ts                # Branding, engine status badge, background streaming progress bar
│   │   ├── PantryInput.ts           # Tag selector, "Use Soon" urgency markers, toxic-filtered custom input
│   │   ├── RecipeCard.ts            # 1-vessel, 3-step recipe display with checklist & celebration trigger
│   │   ├── LazyPayoffDashboard.ts   # Gamified savings tracker (minutes, dollars, pans avoided, badges)
│   │   ├── GroceryGapChecklist.ts   # Copyable missing staples component with 1-click clipboard copy
│   │   └── Toast.ts                 # Accessible micro-notification toast system (warning, success, info, error)
│   ├── core/                        # Business logic & inference engines
│   │   ├── validator.ts             # Sloth JSON schema validator & pure constraint enforcement
│   │   ├── heuristic-engine.ts      # Zero-latency (<15ms) deterministic emergency recipe matrix
│   │   ├── safety-filter.ts         # Dual-layer toxic/inedible input screening with word-boundary regex
│   │   ├── inference-manager.ts     # Generation router (Worker WebGPU, Localhost Ollama, Heuristic fallback)
│   │   └── payoff-engine.ts         # Deterministic savings calculator & badge unlock evaluator
│   ├── storage/                     # Client-side persistence layer
│   │   ├── db.ts                    # IndexedDB (LazyChefDB) for recipe caching & payoff history
│   │   └── local-storage.ts         # Sub-16ms synchronous state cache (active pantry, payoff summary)
│   ├── workers/                     # Background multi-threading pipelines
│   │   └── inference.worker.ts      # Transformers.js WebGPU pipeline running Gemma 2B in dedicated worker
│   └── types/
│       ├── recipe.ts                # LazyRecipe, AllowedVessel, SlothLevel domain types
│       ├── pantry.ts                # PantryItem, IngredientCategory, preset pantry collections
│       └── messages.ts              # Typed Web Worker IPC protocol contracts
├── tests/                           # Test automation suite
│   └── unit/
│       ├── validator.test.ts        # 100% pure constraint validation suite
│       ├── heuristic-engine.test.ts # Matrix matching & execution latency test (<15ms)
│       ├── safety-filter.test.ts    # 100% lexical blocklist & toxic screening suite
│       ├── inference-manager.test.ts# Routing, caching, Ollama adapter, and silent fallback tests
│       ├── payoff.test.ts           # Payoff accumulator & badge unlocking tests
│       ├── db.test.ts               # IndexedDB CRUD & composite key tests
│       ├── local-storage.test.ts    # Synchronous storage cache unit tests
│       ├── worker-utils.test.ts     # Worker message & markdown stripping tests
│       ├── grocery-gap.test.ts      # Grocery gap checklist & clipboard copy tests
│       └── toast.test.ts            # Toast notification lifecycle & ARIA tests
├── docs/                            # SDLC Documentation
│   ├── ARCHITECTURE.md              # Living architecture topography map
│   ├── adr/                         # Architecture Decision Records (e.g. ADR-0001)
│   └── audit/                       # SDLC Clarification & Consistency audit reports
├── plan/                            # Phased implementation plan (Tracer Bullets)
└── spec/                            # Authoritative technical specifications
```

---

## 2. Architectural Boundaries & Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                          MAIN BROWSER THREAD                           │
│                                                                        │
│   ┌─────────────────────┐             ┌────────────────────┐          │
│   │    PantryInput      │ ──────────► │  LocalStorageStore │          │
│   │ (Tag Pills, Custom) │             │  (Sub-16ms Sync)   │          │
│   └──────────┬──────────┘             └────────────────────┘          │
│              │ Selected Ingredients                                    │
│              ▼                                                         │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │                 SafetyFilter.checkSafety()                   │     │
│   │         (Layer 1 Lexical Blocklist Screening)                │     │
│   └──────────┬───────────────────────────────────────────────────┘     │
│              │ Safe Ingredients (or Toxic Toast Alert Intercept)       │
│              ▼                                                         │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │                    SlothInferenceManager                     │     │
│   │                                                              │     │
│   │   1. Check IndexedDB Cache (LazyChefDB)                      │     │
│   │   2. Tier 1: WebGPU Gemma 2B in Web Worker                   │     │
│   │   3. Tier 2: Localhost Ollama REST Adapter (Optional)        │     │
│   │   4. Tier 3: Deterministic Heuristic Engine (<15ms)          │     │
│   └──────────┬───────────────────────────────────────────────────┘     │
│              │                                                         │
│              ▼                                                         │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │                   validateSlothRecipe()                      │     │
│   │          (1 Vessel, ≤3 Steps, ≤15 Min, ≤2 Gaps)              │     │
│   └──────────┬───────────────────────────────────────────────────┘     │
│              │ Strictly Validated LazyRecipe                           │
│              ▼                                                         │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │                         RecipeCard                           │     │
│   │  - 3-Step Interactive Cooking Checklist                      │     │
│   │  - GroceryGapChecklist (1-Click Clipboard Copy)              │     │
│   │  - Recipe Session Lock & Celebration Trigger                 │     │
│   └──────────┬───────────────────────────────────────────────────┘     │
│              │ On Meal Cooked                                          │
│              ▼                                                         │
│   ┌──────────────────────────────────────────────────────────────┐     │
│   │                    PayoffEngine & Dashboard                  │     │
│   │  - Atomically increments +15m, +$6.50, +2 pans               │     │
│   │  - Persists to IndexedDB payoff_history & LocalStorage       │     │
│   └──────────────────────────────────────────────────────────────┘     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Module Contracts

### `src/core/safety-filter.ts`
- **Class:** `SafetyFilter`
- **Methods:** `checkSafety(input)`, `isSafe(input)`, `validateIngredients(ingredients)`.
- **Contract:** Dual-layer lexical screening with word-boundary regex over comprehensive blocklist of toxic/inedible terms. Throws `ToxicIngredientError` on violation.

### `src/core/inference-manager.ts`
- **Class:** `SlothInferenceManager`
- **Methods:** `initBackgroundPipeline()`, `generateRecipe()`, `generateViaOllama()`, `setOllamaEnabled()`.
- **Contract:** Coordinates tiered inference across WebGPU worker, optional Ollama desktop fallback (3.5s timeout), and instant deterministic heuristic fallback.

### `src/components/Toast.ts`
- **Class:** `Toast`
- **Methods:** `warn()`, `success()`, `info()`, `error()`, `dismissAll()`.
- **Contract:** Manages accessible, animated micro-notifications in `#toast-container`.

### `src/components/GroceryGapChecklist.ts`
- **Class:** `GroceryGapChecklist`
- **Methods:** `copyToClipboard()`, `getItems()`, `setItems()`.
- **Contract:** Renders 0-2 optional elevating ingredients from `recipe.grocery_gap` with 1-click clipboard copy.

---

## 4. Verification & Testing

- **Unit Tests:** `npm test` (Runs Vitest suite across 10 test files with 111 passed tests).
- **Coverage:** `npm run test:coverage` (100% on `safety-filter.ts`, `validator.ts`, and `db.ts`).
- **Production Build:** `npm run build` (Compiles TypeScript and bundles via Vite; JS bundle `60.56 KB` / `19.67 KB` gzip, well under the 350 KB threshold).
