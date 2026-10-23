// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GroceryGapChecklist } from '../../src/components/GroceryGapChecklist';

describe('GroceryGapChecklist (TASK-021, REQ-007, AC-002)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('renders nothing and hides container when groceryGap is empty', () => {
    const component = new GroceryGapChecklist({ groceryGap: [] });
    const el = component.getElement();

    expect(el.style.display).toBe('none');
    expect(el.innerHTML).toBe('');
    expect(component.getItems()).toEqual([]);
  });

  it('renders 1-2 elevating staples chips with copy button when gaps exist', () => {
    const gaps = ['Green Onions', 'Toasted Sesame Oil'];
    const component = new GroceryGapChecklist({ groceryGap: gaps });
    const el = component.getElement();

    expect(el.style.display).toBe('block');
    expect(component.getItems()).toEqual(gaps);

    const title = el.querySelector('.grocery-gap-title');
    expect(title?.textContent).toContain('Grocery Gap');

    const chips = el.querySelectorAll('.grocery-gap-chip');
    expect(chips.length).toBe(2);
    expect(chips[0].textContent).toContain('Green Onions');
    expect(chips[1].textContent).toContain('Toasted Sesame Oil');

    const copyBtn = el.querySelector('#btn-copy-grocery-gap');
    expect(copyBtn).not.toBeNull();
    expect(copyBtn?.textContent).toContain('Copy Missing Staples to Clipboard');
  });

  it('allows dynamically updating items with setItems()', () => {
    const component = new GroceryGapChecklist({ groceryGap: [] });
    expect(component.getItems()).toEqual([]);

    component.setItems(['Fresh Basil']);
    expect(component.getItems()).toEqual(['Fresh Basil']);

    const el = component.getElement();
    expect(el.style.display).toBe('block');
    const chips = el.querySelectorAll('.grocery-gap-chip');
    expect(chips.length).toBe(1);
    expect(chips[0].textContent).toContain('Fresh Basil');

    component.setItems([]);
    expect(el.style.display).toBe('none');
  });

  it('copies missing staples to clipboard and notifies callback', async () => {
    const onCopySpy = vi.fn();
    const writeTextSpy = vi.fn().mockResolvedValue(undefined);

    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextSpy },
      configurable: true,
      writable: true
    });

    const component = new GroceryGapChecklist({
      groceryGap: ['Butter', 'Garlic'],
      onCopy: onCopySpy
    });

    const copiedText = await component.copyToClipboard();

    expect(writeTextSpy).toHaveBeenCalledWith(
      expect.stringContaining('Missing LazyChef Staples:\n• Butter\n• Garlic')
    );
    expect(onCopySpy).toHaveBeenCalledWith(copiedText);
  });

  it('falls back gracefully when navigator.clipboard is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
      writable: true
    });

    const execCommandSpy = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, 'execCommand', {
      value: execCommandSpy,
      configurable: true,
      writable: true
    });

    const component = new GroceryGapChecklist({
      groceryGap: ['Soy Sauce']
    });

    const el = component.getElement();
    const copyBtn = el.querySelector<HTMLButtonElement>('#btn-copy-grocery-gap')!;

    const text = await component.copyToClipboard(copyBtn);
    expect(text).toContain('Soy Sauce');
    expect(execCommandSpy).toHaveBeenCalledWith('copy');
  });
});
