/**
 * LazyChef GroceryGapChecklist Component
 * Renders 0-2 optional elevating staples flagged in recipe.grocery_gap.
 * Features 1-click clipboard copy with visual feedback tooltip and toast.
 * Enforces REQ-007, AC-002.
 */

import { Toast } from './Toast';

export interface GroceryGapChecklistOptions {
  groceryGap: string[];
  onCopy?: (copiedText: string) => void;
}

export class GroceryGapChecklist {
  private container: HTMLElement;
  private items: string[];
  private onCopy?: (copiedText: string) => void;

  constructor(options: GroceryGapChecklistOptions) {
    this.container = document.createElement('div');
    this.container.className = 'grocery-gap-wrapper';
    this.items = (options.groceryGap || []).filter(
      (item) => typeof item === 'string' && item.trim().length > 0
    );
    this.onCopy = options.onCopy;

    this.render();
  }

  public getElement(): HTMLElement {
    return this.container;
  }

  public getItems(): string[] {
    return [...this.items];
  }

  public setItems(items: string[]): void {
    this.items = (items || []).filter(
      (item) => typeof item === 'string' && item.trim().length > 0
    );
    this.render();
  }

  public async copyToClipboard(buttonEl?: HTMLButtonElement): Promise<string> {
    if (this.items.length === 0) return '';

    const copyText = `Missing LazyChef Staples:\n${this.items.map((item) => `• ${item}`).join('\n')}`;

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(copyText);
      } else if (typeof document !== 'undefined') {
        // Fallback for older browsers or headless testing environments
        const textArea = document.createElement('textarea');
        textArea.value = copyText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      // Visual feedback on button if provided
      if (buttonEl) {
        const originalText = buttonEl.innerHTML;
        buttonEl.innerHTML = '<span>Copied to Clipboard!</span> <span>✓</span>';
        buttonEl.classList.add('copied');

        setTimeout(() => {
          buttonEl.innerHTML = originalText;
          buttonEl.classList.remove('copied');
        }, 2500);
      }

      Toast.success('Missing staples copied to clipboard! 🛒');

      if (this.onCopy) {
        this.onCopy(copyText);
      }

      return copyText;
    } catch (err) {
      console.warn('Failed to copy to clipboard:', err);
      Toast.info(`Missing staples: ${this.items.join(', ')}`);
      return copyText;
    }
  }

  private render(): void {
    if (this.items.length === 0) {
      this.container.innerHTML = '';
      this.container.style.display = 'none';
      return;
    }

    this.container.style.display = 'block';
    this.container.innerHTML = `
      <div class="grocery-gap-card">
        <div class="grocery-gap-header">
          <div class="grocery-gap-title-wrap">
            <span class="grocery-gap-icon">🛒</span>
            <div>
              <h3 class="grocery-gap-title">Grocery Gap (Optional Elevating Staples)</h3>
              <p class="grocery-gap-subtitle">
                These optional ingredients aren't strictly required, but will elevate your meal if you have them:
              </p>
            </div>
          </div>
        </div>

        <div class="grocery-gap-chips">
          ${this.items
            .map(
              (item) => `
            <div class="grocery-gap-chip">
              <span class="chip-bullet">+</span>
              <span class="chip-label">${item}</span>
            </div>
          `
            )
            .join('')}
        </div>

        <div class="grocery-gap-actions">
          <button 
            type="button" 
            id="btn-copy-grocery-gap" 
            class="btn-copy-gap"
            title="Copy missing staples list to clipboard"
          >
            <span>📋 Copy Missing Staples to Clipboard</span>
          </button>
        </div>
      </div>
    `;

    const copyBtn = this.container.querySelector<HTMLButtonElement>('#btn-copy-grocery-gap');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        void this.copyToClipboard(copyBtn);
      });
    }
  }
}
