---
goal: Step-by-Step Tracer Bullet Implementation Plan for LazyChef & Pantry Autopilot
version: 1.0.0
date_created: 2026-10-23
last_updated: 2026-10-23
owner: Planner Architect
status: 'Planned'
tags: [hacktoberfest, gemma-2b, webgpu, tracer-bullets, local-first, sloth-constraints, devrelay, indexeddb]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This document establishes the authoritative, phase-by-phase implementation plan for **LazyChef & Pantry Autopilot**, designed for the Hacktoberfest 2026 Week 3: Slow and Steady Challenge (`#hf26challenge`) competing in the **Best Use of Gemma / Open-Weight AI** track.

The plan strictly adopts **Vertical Slicing (Tracer Bullets)**. Every phase cuts through the architecture from storage to UI, delivering an independently verifiable and demoable state of the application. Horizontal, layer-by-layer slicing is strictly avoided.

---

## 1. Requirements & Constraints

### Functional Requirements
- **REQ-001 (Pantry Inventory Management)**: The system shall permit users to toggle pre-defined pantry tags, input comma-separated custom ingredients, categorize items, and mark items with a "Use Soon" shelf-life urgency tag.
- **REQ-002 (Single Lazy Recipe Generation)**: The system shall output exactly one Lazy Recipe per generation cycle. Generating lists of multiple choices is strictly prohibited.
- **REQ-003 (Sloth Constraint Enforcement)**: Every generated recipe must adhere to:
  1. Exactly 1 cooking vessel (skillet, pot, sheet pan, or microwave bowl).
  2. Maximum 3 concise, imperatively phrased instructions.
  3. Total preparation and cooking time strictly $\le$ 15 minutes.
- **REQ-004 (Asynchronous Web Worker Inference)**: Model initialization, weight downloading, token streaming, and generation must execute in a dedicated Web Worker to maintain an unblocked 60 FPS main UI thread.
- **REQ-005 (Background Weight Streaming & Fallback)**: As specified in [ADR-0001](file:///d:/hacktoberfest/hf-challenges-week-3/docs/adr/0001-automatic-background-model-streaming.md), model weight streaming shall initiate automatically in the background on app load. If generation is triggered before weights are cached or if WebGPU is absent, the system shall invoke the Deterministic Heuristic Engine in $<15\text{ms}$.
- **REQ-006 (The Lazy Payoff Tracking)**: The system shall record completed meals upon user confirmation ("I Cooked This! 🍳" button or checking all 3 steps), atomically updating cumulative metrics: 15 minutes decision fatigue avoided, $6.50 takeout/waste cost saved, and 2 pans spared.
- **REQ-007 (Grocery Gap Detection)**: The recipe generator shall identify 0 to 2 optional elevating staples not currently in the Pantry State and format them for one-click clipboard copying.
- **REQ-008 (Hacktoberfest DevRelay Exporter)**: The system shall generate a pre-filled markdown post complying with [submission-template.md](file:///d:/hacktoberfest/hf-challenges-week-3/submission-template.md), integrating dynamic Lazy Payoff metrics and an embeddable `{% agent_session %}` Liquid tag.

### Security & Privacy Requirements
- **SEC-001 (Zero External Telemetry)**: No pantry inventory, consumption habits, or device telemetry shall ever be transmitted across external network boundaries.
- **SEC-002 (Dual-Layer Safety Filter)**: Layer 1 lexical blocklist checks input against toxic non-food terms immediately halting processing, backed by Layer 2 system prompt guardrails.

### Architectural Constraints
- **CON-001 (WebGPU Tiered Degradation)**: Tier 1: WebGPU Gemma 2B $\rightarrow$ Tier 2: WASM fallback toggle $\rightarrow$ Tier 3: Deterministic Heuristic Engine (<15ms).
- **CON-002 (Bundle Budget)**: The core client application bundle (HTML/CSS/JS) must remain $\le 350\text{ KB}$ gzipped (excluding model weight files stored in Cache/OPFS).
- **CON-003 (Zero Server Dependency)**: The application must operate fully offline once initial assets and models are cached.

---

## 2. Implementation Steps

> **EXECUTION DIRECTIVE FOR AI AGENTS:**
> You MUST execute this plan phase by phase. You MUST run the specific testing/verification task at the end of each phase. After a phase is tested, you **MUST STOP AND WAIT** for the user's explicit approval before proceeding to the next phase.

### Implementation Phase 1: MVP - Instant Offline Cooking Tracer Bullet

- **GOAL-001**: Deliver the absolute smallest end-to-end working vertical slice. A user can open the app, select pantry ingredient tags, click "Cook Lazily", and immediately render an offline Sloth Recipe complying with 1 vessel, $\le$3 steps, and $\le$15 minutes within $<15\text{ms}$.

| Task | Description | Ref ID | AC Ref | Dep | Files | Completed | Date |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **TASK-001** | **Project Scaffolding & Design System Tokens**: Set up Vite + TypeScript configuration (`vite.config.ts`, `tsconfig.json`, `package.json`), base `index.html`, and define the complete Vanilla CSS token system (`src/index.css`) with CSS custom properties for sloth color palettes, warm typography, responsive layout grids, and interactive button states. | CON-002 | AC-001 | - | 4 | [x] | 2026-10-23 |
| **TASK-002** | **Core Domain Contracts & Sloth Validator**: Implement TypeScript definitions for `LazyRecipe`, `PantryItem`, and `IngredientCategory` in `src/types/recipe.ts` and `src/types/pantry.ts`. Implement the pure validation seam `validateSlothRecipe(input: unknown)` in `src/core/validator.ts` strictly enforcing 1 vessel, $\le$3 steps, $\le$15 min, and non-empty title. | REQ-002, REQ-003 | AC-002 | TASK-001 | 3 | [x] | 2026-10-23 |
| **TASK-003** | **Deterministic Heuristic Engine Matrix**: Implement `DeterministicSlothEngine` and `HEURISTIC_RULES` in `src/core/heuristic-engine.ts` containing high-flavor emergency recipes (Garlic Butter Egg Fried Rice, One-Pan Midnight Aglio e Olio, Crispy Fried Eggs on Toast) with ingredient overlap scoring and fallback defaults executing in $<15\text{ms}$. | REQ-005, CON-001 | AC-004 | TASK-002 | 1 | [x] | 2026-10-23 |
| **TASK-004** | **Pantry State Store & LocalStorage Sync**: Implement synchronous state management in `src/storage/local-storage.ts` to manage selected ingredient IDs and custom items with immediate `localStorage` serialization (`lazychef_active_pantry_ids`), maintaining state across page reloads in $<16\text{ms}$. | REQ-001, SEC-001 | AC-001 | TASK-001 | 1 | [x] | 2026-10-23 |
| **TASK-005** | **PantryInput Component & Tag Selector UI**: Implement `src/components/PantryInput.ts` rendering categorised pantry pills (Proteins, Carbs, Veggies, Aromatics/Sauces, Dairy/Fats, Staples) with active selection toggles, "Use Soon" urgency markers, and comma-separated custom item input field. | REQ-001 | AC-001 | TASK-004 | 2 | [x] | 2026-10-23 |
| **TASK-006** | **RecipeCard Component & Sloth Recipe Display**: Implement `src/components/RecipeCard.ts` rendering the active `LazyRecipe` highlighting the single vessel badge, cooking duration pill, used ingredient chips, and formatted 1–3 step instructions with clear typography and zero visual clutter. | REQ-002, REQ-003 | AC-002 | TASK-002 | 2 | [x] | 2026-10-23 |
| **TASK-007** | **MVP Bootstrapper & Main Loop Hydration**: Wire the application entry point in `src/main.ts` connecting `PantryInput`, `RecipeCard`, and `DeterministicSlothEngine`. Wire the primary "Cook Lazily 🦥" button to generate and display a validated recipe in $<50\text{ms}$ upon click. | REQ-002, REQ-005 | AC-001, AC-004 | TASK-003, TASK-005, TASK-006 | 2 | [x] | 2026-10-23 |
| **TASK-008** | **VERIFY**: Phase 1 MVP Flow Verification: Execute `npm run build` and `npm run dev`. Verify end-to-end user journey: select pantry tags ("Eggs" + "Leftover Rice") $\rightarrow$ click "Cook Lazily" $\rightarrow$ instant recipe rendered in $<50\text{ms}$ with 1 vessel, 3 steps, $\le$15 min, zero console errors, bundle $\le 350\text{ KB}$. | CON-002 | AC-001, AC-004 | TASK-007 | - | [x] | 2026-10-23 |
| **TASK-009** | **APPROVAL**: Wait for explicit user confirmation before proceeding to Phase 2. | - | - | TASK-008 | - | [x] | 2026-10-23 |

---

### Implementation Phase 2: Core Experience - Background WebGPU & The Lazy Payoff Tracer Bullet

- **GOAL-002**: Enable the primary AI competitive feature: asynchronous WebGPU streaming of Gemma 2B in a dedicated Web Worker with silent background caching, paired with atomic tracking of The Lazy Payoff metrics and celebratory completion UI.

| Task | Description | Ref ID | AC Ref | Dep | Files | Completed | Date |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **TASK-010** | **IndexedDB Storage Adapter (`LazyChefDB`)**: Implement `src/storage/db.ts` utilizing `idb` to manage database `LazyChefDB` (v1) with object stores: `pantry_items`, `recipe_cache` using structured delimited composite key `${sortedIngredients.join('|')}:urgent:${sortedUrgency.join('|')}:${engine}` with custom item normalization `c_${encodeURIComponent(name.toLowerCase().trim())}`, and `payoff_history` with indexed queries. | REQ-006, SEC-001 | AC-006 | TASK-009 | 2 | [x] | 2026-10-23 |
| **TASK-011** | **Web Worker WebGPU Inference Pipeline**: Implement `src/workers/inference.worker.ts` and `src/types/messages.ts` loading `@huggingface/transformers` with `device: 'webgpu'` and `dtype: 'q4f16'` (`onnx-community/gemma-2-2b-it-webgpu`). Implement worker-side markdown code fence stripping, JSON parsing, and `validateSlothRecipe()` execution, emitting `RECIPE_SUCCESS` or `ERROR (code: SCHEMA_INVALID)`. | REQ-004, CON-001 | AC-003 | TASK-002, TASK-010 | 2 | [x] | 2026-10-23 |
| **TASK-012** | **SlothInferenceManager Router & Background Streaming**: Implement `src/core/inference-manager.ts` coordinating model lifecycle with a main-thread pre-flight feature gate (`navigator.gpu && await navigator.gpu.requestAdapter()`). If unsupported, completely suppress `INIT_PIPELINE` to protect ~1.3 GB bandwidth, immediately set UI engine status to "Instant Offline Engine 🦥", and route to `DeterministicSlothEngine` (<15ms). If WebGPU is supported, dispatch `INIT_PIPELINE` for background streaming as per ADR-0001 with progress reporting. | REQ-004, REQ-005 | AC-003, AC-004 | TASK-003, TASK-011 | 2 | [x] | 2026-10-23 |
| **TASK-013** | **Header Component & Model Streaming Progress Bar**: Implement `src/components/Header.ts` displaying LazyChef branding, engine status badge ("WebGPU Gemma 2B Ready" vs "Instant Offline Engine"), and a smooth, non-blocking background weight download progress bar. | REQ-004, REQ-005 | AC-003 | TASK-012 | 2 | [x] | 2026-10-23 |
| **TASK-014** | **The Lazy Payoff Engine & Gamified Badges**: Implement `src/core/payoff-engine.ts` deterministically computing cumulative savings upon meal confirmation (+15 minutes decision fatigue, +$6.50 takeout saved, +2 pans avoided) and evaluating milestone badges ("First Sloth Meal", "Dish Spared Master", "Dinner Autopilot"). | REQ-006 | AC-006 | TASK-010 | 2 | [x] | 2026-10-23 |
| **TASK-015** | **Interactive 3-Step Cooking Checklist & Celebration**: Update `src/components/RecipeCard.ts` implementing the Recipe Session Lock & Completed State Transition: upon checking all 3 steps OR clicking "I Cooked This! 🍳", transition `RecipeCard` to `isCompleted: true`, trigger `canvas-confetti`, and atomically persist payoff savings (+15 min decision time, +$6.50 budget, +2 pans) exactly once to IndexedDB and `localStorage`. Disable checkboxes/button, render "Cooked! 🎉" status badge and "Cook Another Meal 🦥" return button. | REQ-006 | AC-006 | TASK-006, TASK-014 | 2 | [x] | 2026-10-23 |
| **TASK-016** | **LazyPayoffDashboard Component**: Implement `src/components/LazyPayoffDashboard.ts` rendering animated counters for total meals cooked, minutes saved, dollars saved, and pans avoided, hydrated from `localStorage` (`lazychef_payoff_summary`) and IndexedDB. | REQ-006 | AC-006 | TASK-014, TASK-015 | 2 | [x] | 2026-10-23 |
| **TASK-017** | **VERIFY**: Phase 2 WebGPU & Payoff Flow: Verify background model streaming triggers on launch, Web Worker handles WebGPU generation without UI frame drop ($\ge 58\text{ FPS}$), checking 3 steps or clicking "I Cooked This!" triggers confetti and atomically increments Payoff metrics in IndexedDB. | REQ-004, REQ-006 | AC-003, AC-006 | TASK-016 | - | [x] | 2026-10-23 |
| **TASK-018** | **APPROVAL**: Wait for explicit user confirmation before proceeding to Phase 3. | - | - | TASK-017 | - | [ ] | |

---

### Implementation Phase 3: Edge Cases, Resilience & Local Enhancements Tracer Bullet

- **GOAL-003**: Harden the system against edge cases: dual-layer safety screening for toxic/inedible terms, empty pantry guards, single-ingredient Grocery Gap copyable checklists, and optional localhost Ollama adapter.

| Task | Description | Ref ID | AC Ref | Dep | Files | Completed | Date |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **TASK-019** | **Dual-Layer SafetyFilter Lexical Screening**: Implement `src/core/safety-filter.ts` with `TOXIC_BLOCKLIST` screening against inedible/hazardous items (cleaning supplies, petroleum products, polymers, medications). Screen all ingredient inputs with word-boundary regex before dispatching inference. | SEC-002 | AC-005 | TASK-018 | 2 | [ ] | |
| **TASK-020** | **Empty Pantry Guard & Toxic Alert Toast UI**: Implement toast notification system in `src/components/Toast.ts`. Disable the "Cook Lazily" button when 0 items are selected displaying micro-prompt *"Select at least 1 pantry item to awaken LazyChef 🦥"*. Display friendly warning toast (*"LazyChef only cooks safe, edible pantry ingredients! 🥣"*) when toxic terms are intercepted. | REQ-001, SEC-002 | AC-001, AC-005 | TASK-005, TASK-019 | 3 | [ ] | |
| **TASK-021** | **GroceryGapChecklist Component & Clipboard Copy**: Implement `src/components/GroceryGapChecklist.ts` displaying 0–2 optional elevating staples extracted from `recipe.grocery_gap`, featuring a 1-click "Copy Missing Staples to Clipboard" button with visual copy-feedback tooltip. | REQ-007 | AC-002 | TASK-006 | 2 | [ ] | |
| **TASK-022** | **Localhost Ollama REST Adapter**: Implement optional desktop developer fallback in `src/core/inference-manager.ts` connecting to `http://localhost:11434/api/generate` (`gemma2:2b`) with 3.5-second timeout and silent fallback to `DeterministicSlothEngine` on network or CORS errors. | CON-001 | AC-004 | TASK-012 | 2 | [ ] | |
| **TASK-023** | **VERIFY**: Phase 3 Resilience Verification: Test toxic input interception ("bleach", "detergent" $\rightarrow$ toast shown, inference blocked), empty pantry state button disabled, grocery gap items copied to clipboard correctly, and Ollama offline fallback handled gracefully. | SEC-002, REQ-007 | AC-001, AC-005 | TASK-020, TASK-021, TASK-022 | - | [ ] | |
| **TASK-024** | **APPROVAL**: Wait for explicit user confirmation before proceeding to Phase 4. | - | - | TASK-023 | - | [ ] | |

---

### Implementation Phase 4: Polish, DevRelay Exporter & Quality Verification Tracer Bullet

- **GOAL-004**: Complete Hacktoberfest DevRelay submission exporter modal, apply final UI polish (theming, high contrast, responsive touch), and establish automated unit, integration, and E2E test suites passing with zero failures.

| Task | Description | Ref ID | AC Ref | Dep | Files | Completed | Date |
| :--- | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **TASK-025** | **DevRelay Exporter Modal & Liquid Tag**: Implement `src/components/DevRelayExporter.ts` rendering modal compliant with `submission-template.md`, dynamically injecting active Payoff stats and embeddable Liquid tag `{% agent_session %}` with 1-click copy for the DEV.to submission post. | REQ-008 | AC-007 | TASK-024, TASK-014 | 2 | [ ] | |
| **TASK-026** | **Design System Polish, Themes & Accessibility**: Polish `src/index.css` adding high-contrast mode toggle, dark/light theme tokens, 48px minimum touch targets for mobile, focus-visible outlines for keyboard navigation, and aria attributes across all interactive components. | CON-002 | AC-001 | TASK-001 | 2 | [ ] | |
| **TASK-027** | **Vitest Unit & Integration Test Automation**: Implement comprehensive test suites in `tests/unit/validator.test.ts`, `tests/unit/safety-filter.test.ts`, `tests/unit/heuristic-engine.test.ts`, and `tests/unit/payoff.test.ts` achieving $\ge 95\%$ coverage on core modules and 100% on validator/safety filters. | REQ-003, SEC-002 | AC-002, AC-005 | TASK-002, TASK-003, TASK-010, TASK-019 | 4 | [ ] | |
| **TASK-028** | **Playwright End-to-End User Journey Tests**: Implement `tests/e2e/cooking-flow.spec.ts` testing the complete user journey: landing $\rightarrow$ selecting pantry items $\rightarrow$ cooking recipe $\rightarrow$ checking steps $\rightarrow$ checking Payoff dashboard increments $\rightarrow$ opening DevRelay export modal. | REQ-001, REQ-006, REQ-008 | AC-001, AC-006, AC-007 | TASK-007, TASK-015, TASK-025 | 2 | [ ] | |
| **TASK-029** | **VERIFY**: Phase 4 Full System Suite Verification: Run `npm run test:coverage`, `npm run lint`, `npm run build`, and `npx playwright test`. Verify 0 errors, 100% pass rate, and bundle size strictly $\le 350\text{ KB}$ gzipped. | CON-002 | AC-001 - AC-007 | TASK-027, TASK-028 | - | [ ] | |
| **TASK-030** | **APPROVAL**: Final Plan Sign-Off: Present completed verification report and handoff to `/sdlc-write-code`. | - | - | TASK-029 | - | [ ] | |

---

## 3. Alternatives

- **ALT-001 (Main-Thread AI Execution)**: Rejected. Running `@huggingface/transformers` on the main browser thread locks the event loop during weight download and token tensor math, causing dropped animation frames and unresponsive clicks. Isolating pipeline to a Web Worker (`inference.worker.ts`) guarantees an unblocked 60 FPS UI.
- **ALT-002 (Mandatory Pre-Download Model Gate)**: Rejected. Forcing users to download ~1.3 GB of model weights before getting dinner suggestions causes immediate bounce rates. Adopted ADR-0001: Automatic silent background streaming paired with instant (<15ms) deterministic heuristic fallback.
- **ALT-003 (LLM-Generated Payoff Numbers)**: Rejected. Small 2B models frequently deviate or hallucinate when generating strict numeric constants (`const: 15`, `const: 6.5`). Moving payoff calculation to deterministic client-side business logic saves 40–50 output tokens and prevents schema rejections.

---

## 4. Dependencies

- **DEP-001 (`@huggingface/transformers`)**: v3+ client-side WebGPU pipeline controller for Gemma 2B in Web Worker.
- **DEP-002 (`idb`)**: Lightweight promise-based IndexedDB wrapper for `LazyChefDB` persistence.
- **DEP-003 (`canvas-confetti`)**: Client-side micro-animation for meal completion celebration.
- **DEP-004 (`vite`)**: Frontend development server and production bundler supporting worker modules.
- **DEP-005 (`typescript`)**: Strict type checking compiler configuration.
- **DEP-006 (`vitest` + `fake-indexeddb`)**: Unit and integration test runner for node-based browser emulation.
- **DEP-007 (`@playwright/test`)**: Cross-browser end-to-end user journey test runner.

---

## 5. Files

- **FILE-001 (`package.json`)**: NPM dependencies, scripts (`dev`, `build`, `test`, `test:coverage`, `lint`).
- **FILE-002 (`tsconfig.json`)**: Strict TypeScript configuration with DOM and WebWorker lib typings.
- **FILE-003 (`vite.config.ts`)**: Bundler configuration with worker format ES and gzip budget inspection.
- **FILE-004 (`index.html`)**: Application single-page shell, meta tags, and root mounting containers.
- **FILE-005 (`src/index.css`)**: Vanilla CSS design system, CSS variables, typography, reset, and component utility classes.
- **FILE-006 (`src/main.ts`)**: App bootstrapper, DOM hydration, state store coordination, and event bus wiring.
- **FILE-007 (`src/types/recipe.ts`)**: `LazyRecipe`, `SlothLevel`, and `AllowedVessel` interfaces.
- **FILE-008 (`src/types/pantry.ts`)**: `PantryItem`, `IngredientCategory`, and `ShelfLifeUrgency` definitions.
- **FILE-009 (`src/types/messages.ts`)**: Typed Web Worker inbound and outbound IPC message protocols.
- **FILE-010 (`src/core/constants.ts`)**: Benchmark constants (15 min, $6.50, 2 pans), vessel enum, and sloth limits.
- **FILE-011 (`src/core/validator.ts`)**: Pure validation seam `validateSlothRecipe()` and `SlothValidationError`.
- **FILE-012 (`src/core/heuristic-engine.ts`)**: Deterministic rule matrix, scoring algorithm, and zero-latency emergency recipes.
- **FILE-013 (`src/core/safety-filter.ts`)**: Dual-layer lexical blocklist and token sanitizer for toxic/inedible terms.
- **FILE-014 (`src/core/inference-manager.ts`)**: Router managing Web Worker WebGPU, deterministic fallback, and Ollama adapter.
- **FILE-015 (`src/core/payoff-engine.ts`)**: Deterministic savings accumulator and milestone badge evaluator.
- **FILE-016 (`src/storage/db.ts`)**: IndexedDB `LazyChefDB` setup, migrations, and transactional queries.
- **FILE-017 (`src/storage/local-storage.ts`)**: Synchronous active pantry and settings cache helpers.
- **FILE-018 (`src/workers/inference.worker.ts`)**: Web Worker running Transformers.js WebGPU pipeline and worker-side JSON validation.
- **FILE-019 (`src/components/Header.ts`)**: Branding header and background model download progress bar.
- **FILE-020 (`src/components/PantryInput.ts`)**: Interactive pantry tag selector and custom ingredient input component.
- **FILE-021 (`src/components/RecipeCard.ts`)**: Single-vessel, 3-step recipe card with checklist and celebration trigger.
- **FILE-022 (`src/components/LazyPayoffDashboard.ts`)**: Gamified savings tracker component for minutes, dollars, and pans saved.
- **FILE-023 (`src/components/GroceryGapChecklist.ts`)**: Modal displaying 0–2 elevating staples with 1-click clipboard copy.
- **FILE-024 (`src/components/DevRelayExporter.ts`)**: Modal generating compliant markdown for Hacktoberfest submission with Liquid tags.
- **FILE-025 (`src/components/Toast.ts`)**: Micro-toast notification system for warnings and copy confirmations.

---

## 6. Testing

- **TEST-001 (Pure Constraint Validation Suite)**: `tests/unit/validator.test.ts` validating:
  - 1 vessel enforcement (rejects 2+ vessels).
  - Step count boundaries (rejects 0 steps, allows 1–3 steps, rejects 4+ steps).
  - Time limit boundary (rejects >15 minutes).
  - Validates 100% statement and branch coverage.
- **TEST-002 (Safety Filter Corpus Suite)**: `tests/unit/safety-filter.test.ts` evaluating toxic blocklist against positive food lists and negative toxic inputs ("bleach", "soap", "motor oil"), achieving 100% coverage.
- **TEST-003 (Deterministic Heuristic Matrix Matcher)**: `tests/unit/heuristic-engine.test.ts` testing ingredient overlap algorithms, verifying $<15\text{ms}$ execution, and ensuring emergency fallbacks always return complete recipes.
- **TEST-004 (Payoff Accumulator & Storage Integration)**: `tests/unit/payoff.test.ts` testing atomic incrementing of minutes, dollars, and pans using `fake-indexeddb`.
- **TEST-005 (End-to-End User Flow Automation)**: `tests/e2e/cooking-flow.spec.ts` testing complete interactive flow: tag selection $\rightarrow$ generation $\rightarrow$ step completion $\rightarrow$ payoff badge unlocked $\rightarrow$ DevRelay markdown export.
- **TEST-006 (Bundle Budget & Zero Telemetry Audit)**: Automated test checking production build bundle size $\le 350\text{ KB}$ gzipped and verifying zero outbound network calls with ingredient payloads.

---

## 7. Risks & Assumptions

- **RISK-001 (WebGPU Device Incompatibility & Bandwidth Protection)**: Certain client devices or older browsers lack `navigator.gpu` support, and unconstrained background streaming risks downloading ~1.3 GB weights on unsupported devices.
  - *Mitigation*: Main-thread pre-flight check (`Boolean(navigator.gpu && await navigator.gpu.requestAdapter())`) in `main.ts` / `src/core/inference-manager.ts`. If false, `INIT_PIPELINE` is never dispatched, eliminating unnecessary ~1.3 GB weight downloads, while UI defaults seamlessly to "Instant Offline Engine 🦥" (<15ms).
- **RISK-002 (First-Visit Network Bandwidth on Supported Devices)**: Downloading ~1.3 GB model weights on WebGPU-capable devices with metered connections may take time.
  - *Mitigation*: On confirmed WebGPU devices, model weights stream non-blockingly in the background with progress reporting in `Header.ts` while instant heuristic recipes are served immediately. Cached weights in Cache API / OPFS persist indefinitely so download occurs exactly once.
- **RISK-003 (LLM Small Model Schema Drift)**: Small open-weight 2B models may output conversational filler or malformed JSON.
  - *Mitigation*: Worker-side markdown fence stripping, regex JSON extraction, and strict `validateSlothRecipe()` validation. Invalid schema triggers instant self-repair fallback to Heuristic Engine.
- **ASSUMPTION-001**: `@huggingface/transformers` v3+ supports WebGPU ONNX execution for Gemma 2B in dedicated Web Worker threads across Chromium, Firefox, and Safari 18+; non-supporting environments are cleanly bypassed via the main-thread pre-flight adapter check before worker instantiation.
- **ASSUMPTION-002**: Client-side calculation and session lock of The Lazy Payoff constants (15 min, $6.50, 2 pans) upon meal completion (all 3 steps checked OR "I Cooked This!" clicked) is authoritative, atomic, and prevents duplicate write mutations.
- **ASSUMPTION-003**: IndexedDB `LazyChefDB` structured delimited composite key `${sortedIngredients.join('|')}:urgent:${sortedUrgency.join('|')}:${engine}` (with custom item normalization `c_${encodeURIComponent(name.toLowerCase().trim())}`) eliminates cache collision between standard and "Use Soon" ingredients with zero hashing overhead.

---

## 8. Related Specifications / Further Reading

- [Technical Specification: LazyChef System Architecture](file:///d:/hacktoberfest/hf-challenges-week-3/spec/spec-architecture-lazychef-pantry-autopilot.md)
- [PRD: LazyChef & Pantry Autopilot](file:///d:/hacktoberfest/hf-challenges-week-3/docs/prd-20261020-1135-lazychef-pantry-autopilot.md)
- [Technical Specification Clarification Audit Report](file:///d:/hacktoberfest/hf-challenges-week-3/docs/audit/clarification-report-lazychef-technical-spec-2026-10-21.md)
- [ADR 0001: Automatic Background Streaming of Gemma 2B Weights](file:///d:/hacktoberfest/hf-challenges-week-3/docs/adr/0001-automatic-background-model-streaming.md)
- [Domain Glossary & Ubiquitous Language](file:///d:/hacktoberfest/hf-challenges-week-3/CONTEXT.md)
- [Hacktoberfest Week 3 Submission Template](file:///d:/hacktoberfest/hf-challenges-week-3/submission-template.md)

---

## 9. Rollback / Recovery Plan

If an implementation phase fails or causes regression during development:
1. **Source Code Revert**: Use Git atomic commits per task to revert broken commits cleanly (`git revert <commit-hash>`).
2. **IndexedDB Schema Recovery**: If database schema migration in `src/storage/db.ts` fails, delete `LazyChefDB` locally via DevTools Application tab (`indexedDB.deleteDatabase('LazyChefDB')`) or bump database version with an explicit downgrade handler.
3. **Model Cache Reset**: If corrupted weights are cached in Origin Private File System (OPFS) or Cache API, clear storage keys via `caches.delete('transformers-cache')` to allow a clean re-download.
4. **Fallback Fail-Safe**: If Web Worker crashes or WebGPU fails, `SlothInferenceManager` defaults unconditionally to `DeterministicSlothEngine`, guaranteeing users can always cook a meal offline.
