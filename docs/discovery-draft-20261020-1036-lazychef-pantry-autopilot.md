---
title: Project Discovery & Architecture Summary - LazyChef & Pantry Autopilot
status: DRAFT (Phase 0)
date_analyzed: 2026-10-20
theme: Hacktoberfest Week 3 - Slow and Steady
target_partner_track: Best Use of Gemma / Open-Weight AI
---

# Project Discovery Summary: LazyChef & Pantry Autopilot

## 1. Project Overview

**LazyChef** is an open-source, local-first kitchen copilot engineered to eliminate decision fatigue and kitchen chore dread for tired, busy, or inherently "lazy" people (channeling International Sloth Day). Unlike traditional recipe apps that overwhelm users with encyclopedic recipe catalogs, 25-step instructions, and obscure specialty ingredients, LazyChef operates under strict **"Sloth Constraints"**:

- **Zero Fridge Staring**: Users input whatever random ingredients they currently have on hand (via quick text input, checklist, or photo dump).
- **Single Best Lazy Recipe**: The AI reasons over constraints to produce exactly ONE ultra-lazy, minimal-dish recipe (One-Pan, Dump-and-Simmer, or No-Chop under 15 minutes).
- **Automated Missing Staples Checklist**: Identifies if a critical staple (e.g., cooking oil, salt, garlic) is missing and formats a concise shopping list.
- **The Lazy Payoff**: Eliminates 15–20 minutes of daily meal indecision and prevents grocery spoilage (saving an estimated $30–$50/week).

## 2. Technology Stack & Infrastructure

- **Frontend Core**: Vite + Modern Semantic HTML5/CSS (Vanilla CSS Design Tokens, fully responsive, zero generic AI slop).
- **Styling Architecture**: Warm culinary aesthetic (Warm Parchment `#F9F7F2`, Olive Moss `#3E5235`, Terracotta Clay `#C85A32`, Espresso Charcoal `#181614`).
- **Open-Source AI Engine**:
  - *Primary (In-Browser)*: `@huggingface/transformers` (Transformers.js with WebGPU/WASM fallback) executing open-weight models (e.g. Gemma 2B, SmolLM2, or Qwen2.5) entirely on-device.
  - *Secondary (Local Service)*: Ollama API adapter for local Gemma 2 / Llama 3.2 execution for desktop power users.
  - *Deterministic Fallback*: Zero-network rule-based meal generator when local models are initializing or on low-spec hardware.
- **Client Persistence**: LocalStorage / IndexedDB for local pantry state and favorite lazy recipes (100% offline, zero cloud tracking).
- **Session Telemetry & Publication**: DevRelay Gateway for agent session logging and direct DEV (#hf26challenge) publishing.

## 3. Current Architecture Assessment & Heuristics

- **Privacy & Data Sovereignty**: All pantry inventory, dietary preferences, and kitchen logs remain strictly on the user's machine. Zero telemetry sent to proprietary ad trackers.
- **Strict Seam Isolation**: Separation of concerns between:
  1. *Pantry State Layer* (Inventory tracking, item tags, shelf-life indicators).
  2. *Reasoning & Prompt Engine* (Applies sloth rules: max 1 pan, max 3 steps, <15 min prep).
  3. *Inference Adapter* (Transformers.js WebGPU / Local Ollama REST seam).
  4. *Presentation Layer* (High-contrast, zero-slop accessible cooking view).
- **Resilience**: Complete functionality in offline mode; works even during power or internet outages.

## 4. Operational Workflow

```
[User Input: "Eggs, Leftover Rice, Scallions, Soy Sauce"]
                     │
                     ▼
       [Pantry State & Sloth Constraints]
   - Max 1 Pan / Skillet
   - Under 15 Minutes
   - Minimal Chopping & Dishes
                     │
                     ▼
  [Local Open-Source AI (Gemma / Transformers.js)]
                     │
                     ▼
   [Lazy Output Generation]
   ├── 1. The Dish: "10-Min Garlic Butter Fried Rice"
   ├── 2. Sloth Effort Score: "Level 1: 1 Pan, 1 Spoon, 0 Knives"
   └── 3. Grocery Gap: "[Optional] Add Chili Flakes for extra punch"
```

## 5. Handoff Notes for Product Manager (/sdlc-draft-prd)

- **Target Persona**: The exhausted professional, busy student, or developer who dreads cooking complexity and wants fast nourishment with minimal cleanup.
- **Key PRD Deliverables**:
  - User journey for 1-click pantry ingredient entry.
  - The "Sloth Constraint Engine" ruleset (dish limit, step limit, prep time limit).
  - Explicit metrics for "The Lazy Payoff" required by Hacktoberfest Week 3 judges.
  - Step-by-step interactive cooking view with minimal cognitive friction.
- **Partner Track Alignment**: Ensure technical specifications detail integration with Google Gemma / Open-Weight AI to qualify for the **Best Use of Gemma ($200)** category.
