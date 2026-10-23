/**
 * LazyChef Toast Notification System
 * Lightweight, accessible, and theme-styled micro-notification system.
 * Enforces SEC-002, AC-001, and AC-005.
 */

export type ToastType = 'warning' | 'info' | 'success' | 'error';

export interface ToastOptions {
  durationMs?: number;
  type?: ToastType;
}

export class Toast {
  private static container: HTMLElement | null = null;
  private static activeToasts: Set<HTMLElement> = new Set();

  private static getOrCreateContainer(): HTMLElement {
    if (!Toast.container || !document.body.contains(Toast.container)) {
      const existing = document.getElementById('toast-container');
      if (existing) {
        Toast.container = existing;
      } else {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('aria-atomic', 'true');
        document.body.appendChild(container);
        Toast.container = container;
      }
    }
    return Toast.container;
  }

  private static getIcon(type: ToastType): string {
    switch (type) {
      case 'warning':
        return '🥣';
      case 'success':
        return '🎉';
      case 'error':
        return '⚠️';
      case 'info':
      default:
        return '🦥';
    }
  }

  /**
   * Displays a toast notification.
   */
  public static show(message: string, options: ToastOptions = {}): HTMLElement {
    if (typeof document === 'undefined') {
      // In non-DOM testing environment, create a mock element
      return {} as HTMLElement;
    }

    const type = options.type ?? 'info';
    const durationMs = options.durationMs ?? 4000;
    const container = Toast.getOrCreateContainer();

    const toastEl = document.createElement('div');
    toastEl.className = `toast-item toast-${type}`;
    toastEl.setAttribute('role', 'status');

    const iconSpan = document.createElement('span');
    iconSpan.className = 'toast-icon';
    iconSpan.textContent = Toast.getIcon(type);

    const messageSpan = document.createElement('span');
    messageSpan.className = 'toast-message';
    messageSpan.textContent = message;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'toast-close-btn';
    closeBtn.setAttribute('aria-label', 'Close notification');
    closeBtn.innerHTML = '&times;';

    const dismiss = () => {
      if (!Toast.activeToasts.has(toastEl)) return;
      Toast.activeToasts.delete(toastEl);
      toastEl.classList.add('toast-exit');
      toastEl.addEventListener('animationend', () => {
        toastEl.remove();
        if (Toast.activeToasts.size === 0 && Toast.container && Toast.container.childNodes.length === 0) {
          Toast.container.remove();
          Toast.container = null;
        }
      }, { once: true });
    };

    closeBtn.addEventListener('click', dismiss);

    toastEl.appendChild(iconSpan);
    toastEl.appendChild(messageSpan);
    toastEl.appendChild(closeBtn);

    container.appendChild(toastEl);
    Toast.activeToasts.add(toastEl);

    if (durationMs > 0) {
      setTimeout(dismiss, durationMs);
    }

    return toastEl;
  }

  public static warn(message: string, durationMs?: number): HTMLElement {
    return Toast.show(message, { type: 'warning', durationMs });
  }

  public static success(message: string, durationMs?: number): HTMLElement {
    return Toast.show(message, { type: 'success', durationMs });
  }

  public static info(message: string, durationMs?: number): HTMLElement {
    return Toast.show(message, { type: 'info', durationMs });
  }

  public static error(message: string, durationMs?: number): HTMLElement {
    return Toast.show(message, { type: 'error', durationMs });
  }

  public static dismissAll(): void {
    if (typeof document === 'undefined') return;
    for (const toast of Toast.activeToasts) {
      toast.remove();
    }
    Toast.activeToasts.clear();
    if (Toast.container) {
      Toast.container.remove();
      Toast.container = null;
    }
  }
}
