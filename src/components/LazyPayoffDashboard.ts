/**
 * LazyPayoffDashboard Component
 * Renders gamified, animated savings counters (minutes, pans, dollars, meals)
 * and unlocked milestone badges.
 */

import { LocalStorageStore, type PayoffSummary } from '../storage/local-storage';
import { MILESTONE_BADGES } from '../core/payoff-engine';

export interface LazyPayoffDashboardOptions {
  onExportClick?: (summary: PayoffSummary) => void;
}

export class LazyPayoffDashboard {
  private element: HTMLElement;
  private currentSummary: PayoffSummary;
  private onExportClick?: (summary: PayoffSummary) => void;

  constructor(options: LazyPayoffDashboardOptions = {}) {
    this.element = document.createElement('section');
    this.element.className = 'payoff-dashboard-card';
    this.element.setAttribute('role', 'region');
    this.element.setAttribute('aria-label', 'The Lazy Payoff Cumulative Savings');

    this.onExportClick = options.onExportClick;
    this.currentSummary = LocalStorageStore.getPayoffSummary();
    this.render();
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  public getSummary(): PayoffSummary {
    return this.currentSummary;
  }

  public updateSummary(summary: PayoffSummary): void {
    this.currentSummary = summary;
    this.render();
  }

  public triggerExport(): void {
    this.onExportClick?.(this.currentSummary);
  }

  private render(): void {
    const { totalMealsCooked, totalMinutesSaved, totalMoneySavedUSD, totalPansAvoided, unlockedBadges } =
      this.currentSummary;

    this.element.innerHTML = `
      <div class="payoff-dashboard-header">
        <div class="payoff-title-group">
          <span class="payoff-icon">📊</span>
          <h2 class="payoff-title">The Lazy Payoff</h2>
        </div>
        <p class="payoff-subtitle">Cumulative savings from ruthless minimalist cooking</p>
      </div>

      <div class="payoff-metrics-grid">
        <div class="metric-card" id="metric-minutes">
          <div class="metric-icon">⏱️</div>
          <div class="metric-value">${totalMinutesSaved}m</div>
          <div class="metric-label">Decision Time Saved</div>
        </div>

        <div class="metric-card" id="metric-pans">
          <div class="metric-icon">🍳</div>
          <div class="metric-value">${totalPansAvoided}</div>
          <div class="metric-label">Dirty Pans Spared</div>
        </div>

        <div class="metric-card" id="metric-money">
          <div class="metric-icon">💰</div>
          <div class="metric-value">$${totalMoneySavedUSD.toFixed(2)}</div>
          <div class="metric-label">Takeout Diverted</div>
        </div>

        <div class="metric-card" id="metric-meals">
          <div class="metric-icon">🥣</div>
          <div class="metric-value">${totalMealsCooked}</div>
          <div class="metric-label">Sloth Meals Cooked</div>
        </div>
      </div>

      <div class="badges-showcase-section">
        <span class="badges-section-label">Milestone Badges:</span>
        <div class="badges-list">
          ${MILESTONE_BADGES.map((badge) => {
            const isUnlocked = unlockedBadges.includes(badge.name);
            return `
              <div 
                class="badge-chip ${isUnlocked ? 'unlocked' : 'locked'}"
                title="${badge.name}: ${badge.description}"
              >
                <span class="badge-chip-icon">${badge.icon}</span>
                <span class="badge-chip-name">${badge.name}</span>
                ${isUnlocked ? '<span class="badge-unlocked-dot">✓</span>' : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
}
