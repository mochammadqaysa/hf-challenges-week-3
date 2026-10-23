/**
 * LazyChef RecipeCard Component
 * Displays the single-vessel, <=3 steps, <=15 minutes Sloth Recipe.
 * Handles interactive 3-step checklist, Recipe Session Lock,
 * canvas-confetti celebration, and atomic Payoff persistence.
 */

import confetti from 'canvas-confetti';
import { PayoffEngine } from '../core/payoff-engine';
import type { PayoffSummary } from '../storage/local-storage';
import type { LazyRecipe } from '../types/recipe';

export interface RecipeCardOptions {
  onMealCooked?: (recipe: LazyRecipe, summary: PayoffSummary, newBadges: string[]) => void;
  onCookAnother?: () => void;
}

export class RecipeCard {
  private container: HTMLElement;
  private currentRecipe: LazyRecipe | null = null;
  private currentLatencyMs: number | null = null;
  private engineUsed: string | null = null;
  private completedSteps: Set<number> = new Set();
  private isMealCooked = false;
  private onMealCooked?: (recipe: LazyRecipe, summary: PayoffSummary, newBadges: string[]) => void;
  private onCookAnother?: () => void;

  constructor(options: RecipeCardOptions = {}) {
    this.container = document.createElement('section');
    this.container.className = 'recipe-card-container';
    this.onMealCooked = options.onMealCooked;
    this.onCookAnother = options.onCookAnother;

    this.render();
  }

  public getElement(): HTMLElement {
    return this.container;
  }

  public setRecipe(recipe: LazyRecipe, latencyMs?: number, engineUsed?: string): void {
    this.currentRecipe = recipe;
    this.currentLatencyMs = latencyMs ?? null;
    this.engineUsed = engineUsed ?? null;
    this.completedSteps.clear();
    this.isMealCooked = false;
    this.render();

    // Smooth scroll into view
    this.container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  public getActiveRecipe(): LazyRecipe | null {
    return this.currentRecipe;
  }

  public isCompleted(): boolean {
    return this.isMealCooked;
  }

  private toggleStep(index: number): void {
    // Session Lock: once cooked, checklist is locked
    if (this.isMealCooked) return;

    if (this.completedSteps.has(index)) {
      this.completedSteps.delete(index);
    } else {
      this.completedSteps.add(index);
    }

    this.updateStepsDom();

    // If all steps completed, automatically trigger meal cooked transition
    if (this.currentRecipe && this.completedSteps.size === this.currentRecipe.steps.length) {
      void this.triggerMealCooked();
    }
  }

  private async triggerMealCooked(): Promise<void> {
    // Recipe Session Lock: atomic execution exactly once
    if (this.isMealCooked || !this.currentRecipe) return;
    this.isMealCooked = true;

    // Mark all steps checked
    for (let i = 0; i < this.currentRecipe.steps.length; i++) {
      this.completedSteps.add(i);
    }
    this.updateStepsDom();

    // Trigger celebratory confetti animation
    try {
      confetti({
        particleCount: 90,
        spread: 70,
        origin: { y: 0.65 },
        colors: ['#5ebb89', '#e58e38', '#fbbf24', '#38bdf8', '#f87171']
      });
    } catch {
      // Confetti fallback if canvas not available
    }

    // Atomically persist payoff savings to IndexedDB and LocalStorage
    const result = await PayoffEngine.recordMealCompleted(
      this.currentRecipe,
      this.completedSteps.size
    );

    // Update Action Bar UI to Completed State
    this.renderCompletedActionBar();

    // Notify listeners
    if (this.onMealCooked) {
      this.onMealCooked(this.currentRecipe, result.summary, result.newBadges);
    }
  }

  private renderCompletedActionBar(): void {
    const actionBar = this.container.querySelector<HTMLElement>('.cooked-action-bar');
    if (!actionBar) return;

    actionBar.innerHTML = `
      <div class="payoff-badge-pill">
        <span>✨ Payoff Claimed:</span>
        <span>+15m decision time &bull; +$6.50 budget &bull; 2 pans spared!</span>
      </div>
      <div class="completed-btn-group">
        <span class="badge-cooked-success">Cooked! 🎉</span>
        <button type="button" id="btn-cook-another" class="btn-cook-another">
          <span>Cook Another Meal</span> <span>🦥</span>
        </button>
      </div>
    `;

    const cookAnotherBtn = actionBar.querySelector<HTMLButtonElement>('#btn-cook-another');
    if (cookAnotherBtn) {
      cookAnotherBtn.addEventListener('click', () => {
        if (this.onCookAnother) {
          this.onCookAnother();
        }
      });
    }
  }

  private updateStepsDom(): void {
    const stepItems = this.container.querySelectorAll<HTMLElement>('.step-item');
    stepItems.forEach((item) => {
      const idx = Number(item.getAttribute('data-step-index'));
      const isDone = this.completedSteps.has(idx);
      item.classList.toggle('completed', isDone);
      if (this.isMealCooked) {
        item.classList.add('locked');
      }

      const checkbox = item.querySelector<HTMLElement>('.step-checkbox');
      if (checkbox) {
        checkbox.innerHTML = isDone ? '✓' : '';
      }
    });
  }

  private getVesselIcon(vessel: string): string {
    if (vessel.includes('Skillet')) return '🍳';
    if (vessel.includes('Pot')) return '🍲';
    if (vessel.includes('Sheet Pan')) return '🥘';
    if (vessel.includes('Microwave')) return '🥣';
    return '🍳';
  }

  private render(): void {
    if (!this.currentRecipe) {
      this.container.innerHTML = `
        <div class="empty-recipe-state">
          <div class="empty-state-icon">🦥</div>
          <div class="empty-state-title">LazyChef is Resting</div>
          <div class="empty-state-desc">
            Select your pantry ingredients above and click <strong>"Cook Lazily"</strong>. 
            We'll recommend exactly 1 zero-stress meal requiring 1 pan and under 15 minutes!
          </div>
        </div>
      `;
      return;
    }

    const recipe = this.currentRecipe;
    const vesselIcon = this.getVesselIcon(recipe.vessel);

    const engineBadgeText =
      this.engineUsed === 'webgpu_gemma2b'
        ? '⚡ WebGPU Gemma 2B'
        : this.currentLatencyMs !== null
        ? `⚡ ${this.currentLatencyMs}ms Offline Engine`
        : '⚡ Instant Offline Engine';

    this.container.innerHTML = `
      <div class="recipe-card" role="region" aria-label="Sloth Recipe Recommendation">
        <div class="recipe-header-row">
          <div class="recipe-badges">
            <span class="badge-vessel">${vesselIcon} ${recipe.vessel}</span>
            <span class="badge-time">⏱️ ${recipe.cook_time_minutes} Mins (&le;15m)</span>
            <span class="badge-latency">${engineBadgeText}</span>
          </div>
        </div>

        <div>
          <h2 class="recipe-title">${recipe.title}</h2>
          <p class="recipe-sloth-level">${recipe.sloth_level}</p>
        </div>

        <div class="recipe-ingredients-block">
          <span class="block-subtitle">Ingredients Used:</span>
          <div class="ingredients-chips-wrap">
            ${recipe.ingredients_used
              .map((ing) => `<span class="ingredient-chip">${ing}</span>`)
              .join('')}
          </div>
        </div>

        <div>
          <span class="block-subtitle">3-Step Cooking Checklist:</span>
          <div class="steps-checklist">
            ${recipe.steps
              .map(
                (step, idx) => `
              <div 
                class="step-item ${this.completedSteps.has(idx) ? 'completed' : ''}" 
                data-step-index="${idx}"
                tabindex="0"
                role="checkbox"
                aria-checked="${this.completedSteps.has(idx)}"
              >
                <div class="step-checkbox">${this.completedSteps.has(idx) ? '✓' : ''}</div>
                <div class="step-number">0${idx + 1}.</div>
                <div class="step-text">${step}</div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>

        ${
          recipe.grocery_gap && recipe.grocery_gap.length > 0
            ? `
          <div class="grocery-gap-callout">
            <div class="grocery-gap-header">
              <span>🛒</span>
              <span>Grocery Gap (Optional Elevating Staples):</span>
            </div>
            <div class="grocery-gap-list">
              Missing ${recipe.grocery_gap.join(' or ')}? You can skip it or add it later!
            </div>
          </div>
        `
            : ''
        }

        <div class="cooked-action-bar">
          <div class="payoff-badge-pill">
            <span>✨ The Lazy Payoff:</span>
            <span>+15m decision saved &bull; +$6.50 saved &bull; 2 pans spared</span>
          </div>
          <button 
            type="button" 
            id="btn-cooked" 
            class="btn-cooked-action"
            ${this.isMealCooked ? 'disabled' : ''}
          >
            ${this.isMealCooked ? 'Cooked! 🎉' : 'I Cooked This! 🍳'}
          </button>
        </div>
      </div>
    `;

    // Bind step item clicks
    const stepItems = this.container.querySelectorAll<HTMLElement>('.step-item');
    stepItems.forEach((item) => {
      const idx = Number(item.getAttribute('data-step-index'));
      item.addEventListener('click', () => {
        this.toggleStep(idx);
      });
      item.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          this.toggleStep(idx);
        }
      });
    });

    // Bind "I Cooked This! 🍳" button
    const cookedBtn = this.container.querySelector<HTMLButtonElement>('#btn-cooked');
    if (cookedBtn) {
      cookedBtn.addEventListener('click', () => {
        void this.triggerMealCooked();
      });
    }
  }
}
