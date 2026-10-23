# LazyChef & Pantry Autopilot 🦥

> **Local-First Kitchen Copilot under Sloth Constraints (1 Vessel • ≤3 Steps • ≤15 Minutes)**  
> Built for **Hacktoberfest 2026 Week 3: Slow and Steady Challenge** (`#hf26challenge`)  
> Competing for **Best Use of Gemma / Open-Weight AI**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF.svg)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/Tests-39%20passed-brightgreen.svg)](https://vitest.dev/)
[![Bundle Size](https://img.shields.io/badge/Bundle%20Size-20.8%20KB%20gzipped-success.svg)](https://vitejs.dev/)
[![Zero Telemetry](https://img.shields.io/badge/Privacy-100%25%20Zero%20Telemetry-orange.svg)](#privacy--zero-telemetry)

---

## 🍲 What is LazyChef?

After a draining workday, cooking dinner often feels overwhelming. Decision fatigue sets in, takeout apps beckon, ingredients in the fridge rot, and the dread of scrubbing piles of dirty pans paralyzes tired home cooks.

**LazyChef & Pantry Autopilot** solves this by strictly enforcing **Sloth Constraints**:
- **🍳 Exactly 1 Cooking Vessel**: 1 skillet, 1 pot, 1 sheet pan, or 1 microwave bowl. Zero sink piles.
- **📝 Maximum 3 Imperative Steps**: Concise, actionable, zero culinary jargon.
- **⏱️ Strictly Under 15 Minutes**: Fast, hot meals from fridge to plate in minutes.
- **🎯 Exactly 1 Recommendation**: No endless scrolling or recipe choice overload.

---

## ✨ Key Features

- **⚡ Sub-Millisecond Offline Engine**: Deterministic heuristic rule matrix matches pantry ingredients to high-flavor comfort recipes in $<1\text{ms}$.
- **🧠 Hybrid AI Architecture (WebGPU Gemma 2B)**: Silent, non-blocking background streaming of Google Gemma 2B via `@huggingface/transformers` in a dedicated Web Worker with main-thread bandwidth feature gating.
- **🦥 Sloth Constraints Pure Seam**: Rigorous runtime validator (`validateSlothRecipe()`) guarantees zero recipes ever violate vessel, step, or time limits.
- **💾 Local-First Storage Matrix**: Synchronous `localStorage` state paired with structured IndexedDB (`LazyChefDB`) caching recipes and payoff history with zero cloud telemetry.
- **📈 The Lazy Payoff Engine & Dashboard**: Quantifies real-world savings (+15 minutes decision fatigue avoided, +$6.50 takeout saved, +2 pans avoided per meal) with gamified milestone badges.
- **🎉 Interactive Cooking Checklist & Session Lock**: Real-time 3-step checklist, confetti explosion celebration, and immutable completion state.
- **🎨 Warm Earthy Design System**: Curated Vanilla CSS token architecture inspired by sloth habitats (earthy sage greens, warm terracotta/honey amber, dark moss surfaces).

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                          MAIN BROWSER THREAD                           │
│                                                                        │
│   ┌─────────────────────┐   ┌─────────────────┐   ┌─────────────────┐  │
│   │     Header &        │   │   PantryInput   │   │ LazyPayoff      │  │
│   │   Progress Bar      │   │ (Tag Pills, UI) │   │ Dashboard       │  │
│   └──────────┬──────────┘   └────────┬────────┘   └────────▲────────┘  │
│              │                       │ Active Items        │ Updates   │
│              ▼                       ▼                     │           │
│   ┌────────────────────────────────────────────────────────┴────────┐  │
│   │                    SlothInferenceManager                        │  │
│   │     (Pre-flight WebGPU Gate, Cache Lookup, Engine Routing)      │  │
│   └───────────────┬───────────────────────────────┬─────────────────┘  │
│                   │ Web Worker IPC                │ Direct Fallback    │
│                   ▼                               ▼                    │
│   ┌────────────────────────────────┐  ┌─────────────────────────────┐  │
│   │       Dedicated Worker         │  │   DeterministicSlothEngine  │  │
│   │  (@huggingface/transformers    │  │    (<15ms Rule Matrix)      │  │
│   │    WebGPU Gemma 2B q4f16)      │  │                             │  │
│   └───────────────┬────────────────┘  └─────────────┬───────────────┘  │
│                   │                                 │                  │
│                   └────────────────┬────────────────┘                  │
│                                    ▼                                   │
│                       ┌─────────────────────────┐                      │
│                       │  validateSlothRecipe()  │                      │
│                       └────────────┬────────────┘                      │
│                                    ▼                                   │
│                       ┌─────────────────────────┐                      │
│                       │       RecipeCard        │                      │
│                       │ (Lock, Confetti, Payoff)│                      │
│                       └─────────────────────────┘                      │
│                                    │                                   │
│                                    ▼                                   │
│                 ┌──────────────────────────────────────┐               │
│                 │ IndexedDB (LazyChefDB) + LocalStorage│               │
│                 └──────────────────────────────────────┘               │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quickstart

### Prerequisites
- Node.js `v18+` or `v20+` (tested on Node v22)
- npm `v9+` or `v10+`

### Installation & Development

```bash
# Clone the repository
git clone https://github.com/mochammadqaysa/hf-challenges-week-3.git
cd hf-challenges-week-3

# Install dependencies
npm install

# Start development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## 🧪 Testing & Verification

LazyChef enforces a **Two-Layer Testing Mandate** (micro tests per change, macro zero-failure suite before each phase):

```bash
# Run unit test suite (Vitest)
npm test

# Run tests with coverage
npm run test:coverage

# Build for production and verify bundle budget
npm run build
```

### Current Verification Metrics
- **Tests Passing:** 39 / 39 tests across 7 test suites (100% pass rate)
- **Constraint Validator Coverage:** 100% statement & branch coverage
- **Heuristic Engine Coverage:** 97.45% statement coverage
- **Production Client Bundle:** **20.8 KB gzipped** (well below the 350 KB limit)
- **Heuristic Generation Latency:** < 1 ms in browser
- **Model Inference:** Asynchronous non-blocking Web Worker (60 FPS main thread maintained)

---

## 🗺️ Roadmap & Tracer Bullet Slices

- [x] **Phase 1: MVP - Instant Offline Cooking Tracer Bullet** (`TASK-001` s.d. `TASK-008`)
  - Project scaffolding, Design System tokens, Domain contracts, Pure Sloth Validator, Heuristic Engine, Pantry Tag UI, Recipe Card, and Main Loop.
- [x] **Phase 2: Core Experience - Background WebGPU & The Lazy Payoff** (`TASK-010` s.d. `TASK-018`)
  - Web Worker WebGPU pipeline for quantized Gemma 2B, IndexedDB `LazyChefDB`, Header progress bar, Payoff engine, dashboard, and celebratory state transitions.
- [ ] **Phase 3: Resilience & Safety Guardrails** (`TASK-019` s.d. `TASK-024`)
  - Dual-layer toxic screening blocklist, toast alerts, Grocery Gap checklist copy, and local Ollama desktop adapter.
- [ ] **Phase 4: Polish, DevRelay Exporter & E2E Suite** (`TASK-025` s.d. `TASK-030`)
  - DevRelay markdown export modal with `{% agent_session %}` Liquid tag, accessibility polish, and Playwright cross-browser tests.

---

## 🛡️ Privacy & Zero Telemetry

LazyChef is designed with a strict zero-surveillance philosophy:
- No user accounts or logins required.
- No remote databases, trackers, or analytical beacons.
- Your pantry contents and eating patterns remain 100% private in local browser storage (`IndexedDB` & `localStorage`).

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
