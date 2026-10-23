/**
 * LazyChef & Pantry Autopilot - Application Entry Point & Main Loop
 * Wires PantryInput, RecipeCard, and DeterministicSlothEngine for Phase 1 MVP.
 */

import confetti from 'canvas-confetti';
import { PantryInput } from './components/PantryInput';
import { RecipeCard } from './components/RecipeCard';
import { DeterministicSlothEngine } from './core/heuristic-engine';
import { LocalStorageStore } from './storage/local-storage';
import { LazyRecipe } from './types/recipe';

class LazyChefApp {
  private appRoot: HTMLElement;
  private pantryInput: PantryInput;
  private recipeCard: RecipeCard;
  private cookButton: HTMLButtonElement;

  constructor() {
    const root = document.getElementById('app');
    if (!root) {
      throw new Error('Root element #app not found in DOM.');
    }
    this.appRoot = root;

    // Initialize Header
    const header = this.createHeader();

    // Initialize Components
    this.pantryInput = new PantryInput({
      onSelectionChange: (selectedIds) => {
        this.updateCookButtonState(selectedIds.length);
      }
    });

    this.recipeCard = new RecipeCard({
      onMealCooked: (recipe) => {
        this.handleMealCompleted(recipe);
      }
    });

    // Initialize CTA Button Container
    const ctaContainer = document.createElement('div');
    ctaContainer.className = 'cta-container';

    this.cookButton = document.createElement('button');
    this.cookButton.type = 'button';
    this.cookButton.className = 'btn-cook-lazily';
    this.cookButton.innerHTML = '<span>Cook Lazily</span> <span>🦥</span>';
    this.cookButton.addEventListener('click', () => this.handleCookClick());

    ctaContainer.appendChild(this.cookButton);

    // Mount to DOM
    this.appRoot.appendChild(header);
    this.appRoot.appendChild(this.pantryInput.getElement());
    this.appRoot.appendChild(ctaContainer);
    this.appRoot.appendChild(this.recipeCard.getElement());

    // Initial Button State
    this.updateCookButtonState(this.pantryInput.getSelectedIngredients().length);
  }

  private createHeader(): HTMLElement {
    const header = document.createElement('header');
    header.className = 'app-header';
    header.innerHTML = `
      <div class="brand-group">
        <div class="brand-mascot" title="International Sloth Day - Zero Stress Cooking">🦥</div>
        <div class="brand-text">
          <h1>LazyChef & Pantry Autopilot</h1>
          <p class="brand-subtitle">Sloth Constraints: 1 Vessel • ≤3 Steps • ≤15 Minutes</p>
        </div>
      </div>
      <div class="engine-status-badge">
        <span class="status-dot"></span>
        <span>Instant Offline Engine 🦥 (&lt;15ms)</span>
      </div>
    `;
    return header;
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

  private handleCookClick(): void {
    const selectedIngredients = this.pantryInput.getSelectedIngredients();
    const urgencyItems = this.pantryInput.getUrgencyIngredients();

    if (selectedIngredients.length === 0) return;

    // Generate recipe deterministically in <15ms
    const { recipe, latencyMs } = DeterministicSlothEngine.generate(
      selectedIngredients,
      urgencyItems
    );

    // Display recipe on RecipeCard
    this.recipeCard.setRecipe(recipe, latencyMs);
  }

  private handleMealCompleted(recipe: LazyRecipe): void {
    // Fire celebratory confetti animation
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#5ebb89', '#e58e38', '#fbbf24', '#f87171']
      });
    } catch {
      // Confetti fallback if canvas not available
    }

    // Atomically persist Payoff metrics to LocalStorage
    const currentSummary = LocalStorageStore.getPayoffSummary();
    const updatedSummary = {
      ...currentSummary,
      totalMealsCooked: currentSummary.totalMealsCooked + 1,
      totalMinutesSaved: currentSummary.totalMinutesSaved + recipe.lazy_payoff.decision_minutes_saved,
      totalMoneySavedUSD: Number((currentSummary.totalMoneySavedUSD + recipe.lazy_payoff.money_saved_usd).toFixed(2)),
      totalPansAvoided: currentSummary.totalPansAvoided + recipe.lazy_payoff.dishes_saved,
      unlockedBadges: currentSummary.unlockedBadges.includes('First Sloth Meal')
        ? currentSummary.unlockedBadges
        : [...currentSummary.unlockedBadges, 'First Sloth Meal']
    };

    LocalStorageStore.setPayoffSummary(updatedSummary);
  }
}

// Bootstrap application on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new LazyChefApp());
} else {
  new LazyChefApp();
}
