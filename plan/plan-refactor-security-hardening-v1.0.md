---
goal: Security Hardening & DOM Sanitization Refactoring Plan for LazyChef
version: 1.0.0
date_created: 2026-10-23
last_updated: 2026-10-23
owner: Expert Code Reviewer
status: "Completed"
tags: ["refactor", "security", "xss-prevention", "clean-code", "sanitization"]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

This refactoring plan addresses findings identified during the formal `/sdlc-code-review` of LazyChef & Pantry Autopilot. Specifically, it establishes strict output encoding across all Vanilla TypeScript DOM renderers (`RecipeCard.ts`, `PantryInput.ts`, `DevRelayExporter.ts`) to eliminate potential Cross-Site Scripting (XSS) vectors from untrusted LLM outputs or malicious custom ingredient strings. It also includes event listener cleanup and architectural decoupling for the inference manager.

## 1. Traceability: Requirements & Constraints

- **SEC-001**: Prevent Cross-Site Scripting (XSS) by encoding all untrusted dynamic inputs (LLM generated recipe text, user custom ingredients, session IDs) before DOM interpolation.
- **PRN-001**: Single Responsibility Principle & Resource Hygiene — clean up event listeners and prevent redundant closures on re-renders.
- **PRN-002**: Dependency Inversion Principle (DIP) — decouple `LazyChefApp` from concrete `SlothInferenceManager` via an interface abstraction.
- **CON-001**: Zero runtime bundle regression — all sanitization logic must be implemented using native standard browser APIs with 0 additional npm dependencies, maintaining client bundle $\le 350\text{ KB}$ gzipped.

---

## 2. Implementation Steps

> **⚠️ EXECUTION DIRECTIVE FOR AI AGENTS (`/sdlc-write-code`):**
> You MUST execute this plan phase by phase. You MUST run the specific testing/verification task at the end of each phase. After a phase is tested, you **MUST STOP AND WAIT** for the user's explicit approval before proceeding to the next phase. **DO NOT SKIP PHASES.**

### Implementation Phase 1: DOM Sanitization Utility & Component Hardening

- **GOAL-001:** Implement a zero-dependency HTML entity encoder utility and apply it across all dynamic DOM string interpolations.

| Task ID  | Description (Include Exact File Paths & Micro-Testing) | Ref ID | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | :-------: | :--: |
| TASK-101 | **Implement `escapeHtml` Utility**: Create `src/core/sanitizer.ts` exporting `escapeHtml(str: string): string` replacing `&`, `<`, `>`, `"`, and `'` with standard HTML entities using regex. | SEC-001 | [x] | 2026-10-23 |
| TASK-102 | **Micro-Test `sanitizer.test.ts`**: Create `tests/unit/sanitizer.test.ts` verifying that malicious strings (`<script>`, `<img src=x onerror=...>`, quotes) are safely transformed into entities. | SEC-001 | [x] | 2026-10-23 |
| TASK-103 | **Harden `RecipeCard.ts`**: Update `src/components/RecipeCard.ts` to wrap `recipe.title`, `recipe.sloth_level`, `recipe.ingredients_used`, and `recipe.steps` with `escapeHtml(...)`. | SEC-001 | [x] | 2026-10-23 |
| TASK-104 | **Harden `PantryInput.ts`**: Update `src/components/PantryInput.ts` to encode custom ingredient names in HTML attributes (`data-ingredient-name`, `data-delete-custom`) and chip text. | SEC-001 | [x] | 2026-10-23 |
| TASK-105 | **Harden `DevRelayExporter.ts`**: Update `src/components/DevRelayExporter.ts` to encode `this.currentSessionId` when rendered in the input value attribute. | SEC-001 | [x] | 2026-10-23 |
| TASK-106 | **VERIFY**: Run `npm test` and verify that all 128+ tests pass and that `sanitizer.test.ts` achieves 100% coverage. | - | [x] | 2026-10-23 |
| TASK-107 | **APPROVAL**: 🛑 Wait for explicit user confirmation to proceed to Phase 2. | - | [ ] | |

---

### Implementation Phase 2: Resource Hygiene & Architectural Decoupling

- **GOAL-002:** Clean up event listener re-attachment on modal re-renders and introduce an interface contract for the inference manager.

| Task ID  | Description (Include Exact File Paths & Micro-Testing) | Ref ID | Completed | Date |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | :-------: | :--: |
| TASK-201 | **Listener Hygiene in `DevRelayExporter.ts`**: Refactor `render()` to bind event listeners once in `constructor()` or dynamically update only the preview and input values in `open()` without re-binding modal buttons. | PRN-001 | [x] | 2026-10-23 |
| TASK-202 | **Inference Interface Abstraction**: Introduce `IRecipeInferenceService` in `src/types/recipe.ts` and make `SlothInferenceManager` implement it, updating `LazyChefApp` typing in `src/main.ts`. | PRN-002 | [x] | 2026-10-23 |
| TASK-203 | **VERIFY**: Run `npm run lint`, `npm test`, `npm run test:e2e`, and `npm run build`. Verify bundle remains $< 350\text{ KB}$ gzipped and 0 regressions occur. | CON-001 | [x] | 2026-10-23 |
| TASK-204 | **APPROVAL**: 🛑 Wait for explicit user confirmation to mark refactoring complete. | - | [x] | 2026-10-23 |

---

## 3. Structural Remedies & Alternatives

- **ALT-001 (Import DOMPurify)**: Rejected. Introducing `dompurify` adds 16-20 KB to the bundle. Since LazyChef only needs plain-text string escaping for titles, ingredients, and steps (no rich HTML editing needed), a native 15-line `escapeHtml()` pure function completely eliminates the vulnerability with zero bundle impact.

---

## 4. Dependencies

No new runtime dependencies. Pure Vanilla TypeScript.

- **DEP-001**: Native browser String replacement / entity map.

---

## 5. Files Affected

- **FILE-001**: `src/core/sanitizer.ts` (New file)
- **FILE-002**: `tests/unit/sanitizer.test.ts` (New file)
- **FILE-003**: `src/components/RecipeCard.ts` (Modified)
- **FILE-004**: `src/components/PantryInput.ts` (Modified)
- **FILE-005**: `src/components/DevRelayExporter.ts` (Modified)
- **FILE-006**: `src/types/recipe.ts` (Modified)
- **FILE-007**: `src/core/inference-manager.ts` (Modified)
- **FILE-008**: `src/main.ts` (Modified)

---

## 6. Testing Strategy

- **TEST-001**: Unit test `tests/unit/sanitizer.test.ts` testing XSS injection strings, quotes, ampersands, and unicode strings.
- **TEST-002**: Regression testing of `tests/unit/cooking-journey.test.ts` and `tests/unit/devrelay-exporter.test.ts`.
- **TEST-003**: Playwright E2E verification `tests/e2e/cooking-flow.spec.ts`.

---

## 7. Risks & Rollback Plan

- **RISK-001**: Double escaping (e.g., escaping `&amp;` into `&amp;amp;`).
  - *Mitigation*: Ensure `escapeHtml()` is applied strictly at the boundary of `innerHTML` interpolation and nowhere inside domain models or storage.
