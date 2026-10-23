/**
 * LazyChef & Pantry Autopilot - Application Entry Point & Main Loop
 * Integrates WebGPU background streaming, SlothInferenceManager,
 * Header, PantryInput, RecipeCard, and LazyPayoffDashboard.
 */

import { Header } from './components/Header';
import { PantryInput } from './components/PantryInput';
import { RecipeCard } from './components/RecipeCard';
import { LazyPayoffDashboard } from './components/LazyPayoffDashboard';
import { Toast } from './components/Toast';
import { SlothInferenceManager } from './core/inference-manager';
import { SafetyFilter, FRIENDLY_TOXIC_WARNING } from './core/safety-filter';
import type { IRecipeInferenceService } from './types/recipe';

class LazyChefApp {
  private appRoot: HTMLElement;
  private header: Header;
  private pantryInput: PantryInput;
  private recipeCard: RecipeCard;
  private payoffDashboard: LazyPayoffDashboard;
  private cookButton: HTMLButtonElement;
  private inferenceManager: IRecipeInferenceService;

  constructor() {
    const root = document.getElementById('app');
    if (!root) {
      throw new Error('Root element #app not found in DOM.');
    }
    this.appRoot = root;

    // 1. Initialize Inference Manager & Header
    this.inferenceManager = SlothInferenceManager.getInstance();
    this.header = new Header();

    this.inferenceManager.onStatusChange((status) => {
      this.header.updateStatus(status);
    });

    this.inferenceManager.onProgressChange((progress) => {
      this.header.updateProgress(progress);
    });

    // 2. Initialize UI Components
    this.pantryInput = new PantryInput({
      onSelectionChange: (selectedIds) => {
        this.updateCookButtonState(selectedIds.length);
      }
    });

    this.payoffDashboard = new LazyPayoffDashboard();

    this.recipeCard = new RecipeCard({
      onMealCooked: (_recipe, summary) => {
        this.payoffDashboard.updateSummary(summary);
      },
      onCookAnother: () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    // 3. Initialize Primary CTA Button
    const ctaContainer = document.createElement('div');
    ctaContainer.className = 'cta-container';

    this.cookButton = document.createElement('button');
    this.cookButton.type = 'button';
    this.cookButton.className = 'btn-cook-lazily';
    this.cookButton.innerHTML = '<span>Cook Lazily</span> <span>🦥</span>';
    this.cookButton.addEventListener('click', () => void this.handleCookClick());

    ctaContainer.appendChild(this.cookButton);

    // 4. Mount Components to DOM
    this.appRoot.appendChild(this.header.getElement());
    this.appRoot.appendChild(this.pantryInput.getElement());
    this.appRoot.appendChild(ctaContainer);
    this.appRoot.appendChild(this.recipeCard.getElement());
    this.appRoot.appendChild(this.payoffDashboard.getElement());

    // 5. Initial Button State
    this.updateCookButtonState(this.pantryInput.getSelectedIngredients().length);

    // 6. Initiate Silent Background WebGPU Weight Streaming (ADR-0001)
    void this.inferenceManager.initBackgroundPipeline();
  }

  private updateCookButtonState(selectedCount: number): void {
    if (selectedCount === 0) {
      this.cookButton.disabled = true;
      this.cookButton.title = 'Select at least 1 pantry item to awaken LazyChef 🦥';
    } else {
      this.cookButton.disabled = false;
      this.cookButton.title = 'Generate 1 effortless Sloth Recipe';
    }
  }

  private async handleCookClick(): Promise<void> {
    const selectedIngredients = this.pantryInput.getSelectedIngredients();
    const urgencyItems = this.pantryInput.getUrgencyIngredients();

    if (selectedIngredients.length === 0) {
      Toast.warn('Select at least 1 pantry item to awaken LazyChef 🦥');
      return;
    }

    // Layer 1 Safety Screening (SEC-002, AC-005)
    const safetyResult = SafetyFilter.checkSafety(selectedIngredients);
    if (!safetyResult.isSafe) {
      Toast.warn(FRIENDLY_TOXIC_WARNING);
      return;
    }

    this.cookButton.disabled = true;
    const originalText = this.cookButton.innerHTML;
    this.cookButton.innerHTML = '<span>Awakening Sloth...</span> <span>🦥</span>';

    const startTime = performance.now();

    try {
      const { recipe, engineUsed } = await this.inferenceManager.generateRecipe(
        selectedIngredients,
        urgencyItems
      );
      const latencyMs = Math.round(performance.now() - startTime);

      this.recipeCard.setRecipe(recipe, latencyMs, engineUsed);
    } catch (err) {
      console.error('Recipe generation error:', err);
    } finally {
      this.cookButton.innerHTML = originalText;
      this.updateCookButtonState(this.pantryInput.getSelectedIngredients().length);
    }
  }
}

// Bootstrap application on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new LazyChefApp());
} else {
  new LazyChefApp();
}
