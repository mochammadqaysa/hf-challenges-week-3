// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Toast } from '../../src/components/Toast';

describe('Toast Notification System (TASK-020, SEC-002, AC-005)', () => {
  beforeEach(() => {
    Toast.dismissAll();
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    Toast.dismissAll();
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('renders a warning toast with friendly sloth message into #toast-container', () => {
    const warningMsg = 'LazyChef only cooks safe, edible pantry ingredients! 🥣';
    const toastEl = Toast.warn(warningMsg);

    const container = document.getElementById('toast-container');
    expect(container).not.toBeNull();
    expect(container?.contains(toastEl)).toBe(true);

    expect(toastEl.className).toContain('toast-warning');
    expect(toastEl.querySelector('.toast-message')?.textContent).toBe(warningMsg);
    expect(toastEl.querySelector('.toast-icon')?.textContent).toBe('🥣');
    expect(toastEl.getAttribute('role')).toBe('status');
  });

  it('renders success, info, and error toasts with correct classes and icons', () => {
    const successToast = Toast.success('Success message');
    expect(successToast.className).toContain('toast-success');
    expect(successToast.querySelector('.toast-icon')?.textContent).toBe('🎉');

    const infoToast = Toast.info('Info message');
    expect(infoToast.className).toContain('toast-info');
    expect(infoToast.querySelector('.toast-icon')?.textContent).toBe('🦥');

    const errorToast = Toast.error('Error message');
    expect(errorToast.className).toContain('toast-error');
    expect(errorToast.querySelector('.toast-icon')?.textContent).toBe('⚠️');
  });

  it('dismisses toast when close button is clicked', () => {
    const toastEl = Toast.info('Close me');
    const closeBtn = toastEl.querySelector<HTMLButtonElement>('.toast-close-btn');
    expect(closeBtn).not.toBeNull();

    closeBtn?.click();
    expect(toastEl.classList.contains('toast-exit')).toBe(true);

    // Simulate animationend event
    toastEl.dispatchEvent(new Event('animationend'));
    expect(document.body.contains(toastEl)).toBe(false);
  });

  it('dismissAll clears active toasts and removes container', () => {
    Toast.warn('Message 1');
    Toast.info('Message 2');
    Toast.success('Message 3');

    const container = document.getElementById('toast-container');
    expect(container?.children.length).toBe(3);

    Toast.dismissAll();
    expect(document.getElementById('toast-container')).toBeNull();
  });

  it('auto-dismisses after durationMs expires', () => {
    const toastEl = Toast.warn('Self-destruct', 2000);
    expect(toastEl.classList.contains('toast-exit')).toBe(false);

    vi.advanceTimersByTime(2001);
    expect(toastEl.classList.contains('toast-exit')).toBe(true);
  });
});
