/**
 * LazyChef PantryInput Component
 * Renders categorized ingredient tags, urgency markers, and custom item input.
 */

import { PRESET_PANTRY_CATEGORIES } from '../types/pantry';
import { LocalStorageStore } from '../storage/local-storage';
import { SafetyFilter, FRIENDLY_TOXIC_WARNING } from '../core/safety-filter';
import { escapeHtml } from '../core/sanitizer';
import { Toast } from './Toast';

export interface PantryInputOptions {
  onSelectionChange?: (selectedIds: string[], urgencyIds: string[]) => void;
}

export class PantryInput {
  private container: HTMLElement;
  private selectedIds: Set<string>;
  private urgencyIds: Set<string>;
  private customItems: string[];
  private onSelectionChange?: (selectedIds: string[], urgencyIds: string[]) => void;

  constructor(options: PantryInputOptions = {}) {
    this.container = document.createElement('section');
    this.container.className = 'pantry-card';
    this.onSelectionChange = options.onSelectionChange;

    // Hydrate from localStorage
    this.selectedIds = new Set(LocalStorageStore.getActivePantryIds());
    this.urgencyIds = new Set(LocalStorageStore.getUrgencyIds());
    this.customItems = LocalStorageStore.getCustomIngredients();

    this.render();
  }

  public getElement(): HTMLElement {
    return this.container;
  }

  public getSelectedIngredients(): string[] {
    return Array.from(this.selectedIds);
  }

  public getUrgencyIngredients(): string[] {
    return Array.from(this.urgencyIds);
  }

  private notifyChange(): void {
    const selectedArray = Array.from(this.selectedIds);
    const urgencyArray = Array.from(this.urgencyIds);
    LocalStorageStore.setActivePantryIds(selectedArray);
    LocalStorageStore.setUrgencyIds(urgencyArray);

    if (this.onSelectionChange) {
      this.onSelectionChange(selectedArray, urgencyArray);
    }
    this.updateSelectedCount();
  }

  private toggleItem(id: string): void {
    if (this.selectedIds.has(id)) {
      this.selectedIds.delete(id);
      this.urgencyIds.delete(id); // If unselected, clear urgency
    } else {
      this.selectedIds.add(id);
    }
    this.notifyChange();
    this.updateTagPillDom(id);
  }

  private toggleUrgency(id: string, e: MouseEvent): void {
    e.stopPropagation();
    // Ensure item is selected if marked urgent
    if (!this.selectedIds.has(id)) {
      this.selectedIds.add(id);
    }

    if (this.urgencyIds.has(id)) {
      this.urgencyIds.delete(id);
    } else {
      this.urgencyIds.add(id);
    }
    this.notifyChange();
    this.updateTagPillDom(id);
  }

  private addCustomItems(rawText: string): void {
    const items = rawText
      .split(/[,;\n]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (items.length === 0) return;

    let interceptedToxic = false;
    for (const item of items) {
      if (!SafetyFilter.isSafe(item)) {
        interceptedToxic = true;
        continue;
      }
      LocalStorageStore.addCustomIngredient(item);
      const cleanId = `c_${encodeURIComponent(item.toLowerCase())}`;
      this.selectedIds.add(cleanId);
    }

    if (interceptedToxic) {
      Toast.warn(FRIENDLY_TOXIC_WARNING);
    }

    this.customItems = LocalStorageStore.getCustomIngredients();
    this.notifyChange();
    this.render();
  }

  private removeCustomItem(item: string, e: MouseEvent): void {
    e.stopPropagation();
    LocalStorageStore.removeCustomIngredient(item);
    const cleanId = `c_${encodeURIComponent(item.toLowerCase())}`;
    this.selectedIds.delete(cleanId);
    this.urgencyIds.delete(cleanId);
    this.customItems = LocalStorageStore.getCustomIngredients();
    this.notifyChange();
    this.render();
  }

  private updateSelectedCount(): void {
    const badge = this.container.querySelector<HTMLElement>('#selected-count-badge');
    if (badge) {
      const count = this.selectedIds.size;
      badge.textContent = `${count} Selected`;
    }
  }

  private updateTagPillDom(id: string): void {
    const pill = this.container.querySelector<HTMLElement>(`[data-ingredient-id="${id}"]`);
    if (!pill) return;

    const isSelected = this.selectedIds.has(id);
    const isUrgent = this.urgencyIds.has(id);

    pill.classList.toggle('active', isSelected);
    pill.classList.toggle('urgent', isUrgent);
    pill.setAttribute('aria-pressed', String(isSelected));

    const urgencyBtn = pill.querySelector<HTMLElement>('.urgency-toggle');
    if (urgencyBtn) {
      urgencyBtn.setAttribute('title', isUrgent ? 'Marked Use Soon' : 'Mark Use Soon');
      urgencyBtn.setAttribute('aria-label', isUrgent ? 'Marked Use Soon' : 'Mark Use Soon');
      urgencyBtn.textContent = isUrgent ? '⚡' : '🕒';
    }
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="section-header">
        <div class="section-title">
          <span>🥕 What's in your pantry?</span>
          <span id="selected-count-badge" class="selected-count-badge" aria-live="polite">${this.selectedIds.size} Selected</span>
        </div>
      </div>

      <div class="custom-input-bar">
        <input 
          type="text" 
          id="custom-ingredient-input" 
          placeholder="Add custom items (e.g. Kimchi, Avocado, Cilantro)..." 
          aria-label="Add custom ingredients"
        />
        <button type="button" id="btn-add-custom" class="btn-secondary" aria-label="Add custom ingredient">
          + Add
        </button>
      </div>

      <div class="category-groups-container">
        ${PRESET_PANTRY_CATEGORIES.map(category => `
          <div class="category-group-row">
            <div class="category-label">
              <span>${category.icon}</span>
              <span>${category.label}</span>
            </div>
            <div class="category-tags-wrap">
              ${category.items.map(item => {
                const isSelected = this.selectedIds.has(item.id);
                const isUrgent = this.urgencyIds.has(item.id);
                return `
                  <button 
                    type="button" 
                    class="tag-pill ${isSelected ? 'active' : ''} ${isUrgent ? 'urgent' : ''}" 
                    data-ingredient-id="${item.id}"
                    data-ingredient-name="${item.name}"
                    aria-pressed="${isSelected}"
                    aria-label="${item.name}${isUrgent ? ' (Use Soon)' : ''}"
                  >
                    <span>${item.name}</span>
                    <span 
                      class="urgency-toggle" 
                      data-urgency-for="${item.id}"
                      title="${isUrgent ? 'Marked Use Soon' : 'Mark Use Soon'}"
                      aria-label="Toggle ${item.name} urgency Use Soon"
                    >${isUrgent ? '⚡' : '🕒'}</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        `).join('')}

        ${this.customItems.length > 0 ? `
          <div class="category-group-row">
            <div class="category-label">
              <span>✨</span>
              <span>Your Custom Items</span>
            </div>
            <div class="category-tags-wrap">
              ${this.customItems.map(item => {
                const cleanId = `c_${encodeURIComponent(item.toLowerCase())}`;
                const isSelected = this.selectedIds.has(cleanId);
                const isUrgent = this.urgencyIds.has(cleanId);
                const escapedName = escapeHtml(item);
                return `
                  <button 
                    type="button" 
                    class="tag-pill ${isSelected ? 'active' : ''} ${isUrgent ? 'urgent' : ''}" 
                    data-ingredient-id="${cleanId}"
                    data-ingredient-name="${escapedName}"
                    aria-pressed="${isSelected}"
                    aria-label="${escapedName}${isUrgent ? ' (Use Soon)' : ''}"
                  >
                    <span>${escapedName}</span>
                    <span 
                      class="urgency-toggle" 
                      data-urgency-for="${cleanId}"
                      title="${isUrgent ? 'Marked Use Soon' : 'Mark Use Soon'}"
                    >${isUrgent ? '⚡' : '🕒'}</span>
                    <span 
                      class="delete-custom-item" 
                      data-delete-custom="${escapedName}" 
                      title="Remove custom ingredient"
                      style="margin-left: 4px; opacity: 0.6; font-size: 0.75rem;"
                    >✕</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    // Bind event listeners
    const input = this.container.querySelector<HTMLInputElement>('#custom-ingredient-input');
    const addBtn = this.container.querySelector<HTMLButtonElement>('#btn-add-custom');

    const handleAdd = () => {
      if (input && input.value.trim()) {
        this.addCustomItems(input.value);
        input.value = '';
      }
    };

    if (addBtn && input) {
      addBtn.addEventListener('click', handleAdd);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAdd();
        }
      });
    }

    // Bind tag pills
    const pills = this.container.querySelectorAll<HTMLElement>('.tag-pill');
    pills.forEach(pill => {
      const id = pill.getAttribute('data-ingredient-id');
      if (!id) return;

      pill.addEventListener('click', () => {
        this.toggleItem(id);
      });

      const urgencyBtn = pill.querySelector<HTMLElement>('.urgency-toggle');
      if (urgencyBtn) {
        urgencyBtn.addEventListener('click', (e) => {
          this.toggleUrgency(id, e);
        });
      }

      const deleteBtn = pill.querySelector<HTMLElement>('.delete-custom-item');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          const customName = deleteBtn.getAttribute('data-delete-custom');
          if (customName) {
            this.removeCustomItem(customName, e);
          }
        });
      }
    });
  }
}
