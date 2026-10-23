// @vitest-environment happy-dom
/**
 * Integration Test: Complete End-to-End User Cooking Journey
 * Enforces REQ-001, REQ-002, REQ-003, REQ-006, REQ-008, AC-001 to AC-007
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';

vi.mock('canvas-confetti', () => ({
  default: vi.fn()
}));

import { Header } from '../../src/components/Header';
import { PantryInput } from '../../src/components/PantryInput';
import { RecipeCard } from '../../src/components/RecipeCard';
import { LazyPayoffDashboard } from '../../src/components/LazyPayoffDashboard';
import { DevRelayExporter } from '../../src/components/DevRelayExporter';
import { SlothInferenceManager } from '../../src/core/inference-manager';
import { SafetyFilter, FRIENDLY_TOXIC_WARNING } from '../../src/core/safety-filter';
import { Toast } from '../../src/components/Toast';
import { LocalStorageStore } from '../../src/storage/local-storage';

describe('Cooking Journey Integration Test (Full Flow)', () => {
  let header: Header;
  let pantryInput: PantryInput;
  let recipeCard: RecipeCard;
  let payoffDashboard: LazyPayoffDashboard;
  let devrelayExporter: DevRelayExporter;
  let cookButton: HTMLButtonElement;
  let inferenceManager: SlothInferenceManager;

  beforeEach(() => {
    localStorage.clear();
    Toast.dismissAll();
    document.body.innerHTML = '<div id="app"></div>';
    const appRoot = document.getElementById('app')!;

    inferenceManager = SlothInferenceManager.getInstance();
    header = new Header();

    pantryInput = new PantryInput({
      onSelectionChange: (selectedIds) => {
        cookButton.disabled = selectedIds.length === 0;
      }
    });

    devrelayExporter = new DevRelayExporter();

    payoffDashboard = new LazyPayoffDashboard({
      onExportClick: (summary) => {
        devrelayExporter.open(summary);
      }
    });

    recipeCard = new RecipeCard({
      onMealCooked: (_recipe, summary) => {
        payoffDashboard.updateSummary(summary);
      }
    });

    const ctaContainer = document.createElement('div');
    cookButton = document.createElement('button');
    cookButton.type = 'button';
    cookButton.className = 'btn-cook-lazily';
    cookButton.innerHTML = '<span>Cook Lazily</span> <span>🦥</span>';
    cookButton.disabled = pantryInput.getSelectedIngredients().length === 0;

    const handleCook = async () => {
      const selected = pantryInput.getSelectedIngredients();
      const safety = SafetyFilter.checkSafety(selected);
      if (!safety.isSafe) {
        Toast.warn(FRIENDLY_TOXIC_WARNING);
        return;
      }

      const { recipe, engineUsed } = await inferenceManager.generateRecipe(
        selected,
        pantryInput.getUrgencyIngredients()
      );
      recipeCard.setRecipe(recipe, 5, engineUsed);
    };

    cookButton.addEventListener('click', () => void handleCook());

    ctaContainer.appendChild(cookButton);

    appRoot.appendChild(header.getElement());
    appRoot.appendChild(pantryInput.getElement());
    appRoot.appendChild(ctaContainer);
    appRoot.appendChild(recipeCard.getElement());
    appRoot.appendChild(payoffDashboard.getElement());
    document.body.appendChild(devrelayExporter.getElement());

    (window as any).__handleCook = handleCook;
  });

  afterEach(() => {
    Toast.dismissAll();
    devrelayExporter.close();
    document.body.innerHTML = '';
  });

  it('executes full journey: empty guard -> select pantry -> generate -> cook -> payoff -> export', async () => {
    // 1. Landing: verify Header and empty guard
    expect(header.getElement().textContent).toContain('LazyChef & Pantry Autopilot');
    expect(cookButton.disabled).toBe(true);

    // 2. Select ingredients: eggs and leftover rice
    const eggsPill = pantryInput.getElement().querySelector<HTMLButtonElement>('[data-ingredient-id="eggs"]');
    const ricePill = pantryInput.getElement().querySelector<HTMLButtonElement>('[data-ingredient-id="leftover_rice"]');
    expect(eggsPill).not.toBeNull();
    expect(ricePill).not.toBeNull();

    eggsPill?.click();
    ricePill?.click();

    expect(cookButton.disabled).toBe(false);
    expect(pantryInput.getSelectedIngredients().length).toBe(2);

    // 3. Trigger recipe generation
    await (window as any).__handleCook();

    // 4. Recipe rendered complying with Sloth Constraints
    const activeRecipe = recipeCard.getActiveRecipe();
    expect(activeRecipe).not.toBeNull();
    expect(activeRecipe?.vessel).toBe('1 Skillet');
    expect(activeRecipe?.cook_time_minutes).toBeLessThanOrEqual(15);
    expect(activeRecipe?.steps.length).toBeLessThanOrEqual(3);

    // 5. Complete steps in RecipeCard
    const stepItems = recipeCard.getElement().querySelectorAll<HTMLElement>('.step-item');
    expect(stepItems.length).toBe(activeRecipe!.steps.length);

    // Check all steps to trigger meal completion
    for (const step of stepItems) {
      step.click();
    }

    // Allow async atomic IDB save and event loop turn
    await new Promise((r) => setTimeout(r, 80));

    expect(recipeCard.isCompleted()).toBe(true);
    expect(recipeCard.getElement().textContent).toContain('Cooked! 🎉');

    // 6. Verify Payoff Dashboard incremented
    const summary = LocalStorageStore.getPayoffSummary();
    expect(summary.totalMealsCooked).toBeGreaterThanOrEqual(1);
    expect(summary.totalMinutesSaved).toBeGreaterThanOrEqual(15);
    expect(summary.totalMoneySavedUSD).toBeGreaterThanOrEqual(6.5);
    expect(summary.totalPansAvoided).toBeGreaterThanOrEqual(2);

    // 7. Verify DevRelay Exporter Modal with Liquid tag and dynamic stats
    devrelayExporter.open(summary);
    expect(devrelayExporter.isOpen()).toBe(true);
    const preview = devrelayExporter.getElement().querySelector<HTMLTextAreaElement>('#devrelay-markdown-preview');
    expect(preview).not.toBeNull();
    expect(preview?.value).toContain('{% agent_session');
    expect(preview?.value).toContain('15 minutes');
    expect(preview?.value).toContain('$6.50');
    expect(preview?.value).toContain('2 dirty pans');
    expect(preview?.value).toContain('1 sloth meals');

    // 8. Close Modal
    devrelayExporter.close();
    expect(devrelayExporter.isOpen()).toBe(false);
  });
});
