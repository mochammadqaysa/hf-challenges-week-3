/**
 * Header Component
 * Renders LazyChef branding, dynamic WebGPU / Heuristic engine badge,
 * and a smooth, non-blocking background model weight streaming progress bar.
 */

import type { EngineStatus, ModelStreamingProgress } from '../core/inference-manager';

export class Header {
  private element: HTMLElement;
  private statusLabel: HTMLElement;
  private statusDot: HTMLElement;
  private progressContainer: HTMLElement;
  private progressPercent: HTMLElement;
  private progressFile: HTMLElement;
  private progressBarFill: HTMLElement;

  constructor() {
    this.element = document.createElement('header');
    this.element.className = 'app-header';

    this.element.innerHTML = `
      <div class="header-main-row">
        <div class="brand-group">
          <div class="brand-mascot" title="International Sloth Day - Zero Stress Cooking">🦥</div>
          <div class="brand-text">
            <h1>LazyChef &amp; Pantry Autopilot</h1>
            <p class="brand-subtitle">Sloth Constraints: 1 Vessel &bull; &le;3 Steps &bull; &le;15 Minutes</p>
          </div>
        </div>
        <div class="header-actions">
          <button 
            type="button" 
            id="theme-contrast-toggle" 
            class="btn-theme-contrast" 
            aria-label="Toggle high contrast mode" 
            aria-pressed="false"
            title="Toggle high contrast accessibility mode"
          >
            <span class="contrast-icon">🌓</span>
            <span class="contrast-label">High Contrast</span>
          </button>
          <div class="engine-status-badge" id="engine-status-badge">
            <span class="status-dot" id="header-status-dot"></span>
            <span class="status-label" id="header-status-label">Checking Engine...</span>
          </div>
        </div>
      </div>
      <div class="model-progress-container hidden" id="model-progress-container">
        <div class="progress-info-row">
          <span class="progress-file" id="model-progress-file">Streaming Gemma 2B weights (OPFS/Cache)...</span>
          <span class="progress-percent" id="model-progress-percent">0%</span>
        </div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill" id="model-progress-fill" style="width: 0%"></div>
        </div>
      </div>
    `;

    this.statusLabel = this.element.querySelector('#header-status-label') as HTMLElement;
    this.statusDot = this.element.querySelector('#header-status-dot') as HTMLElement;
    this.progressContainer = this.element.querySelector('#model-progress-container') as HTMLElement;
    this.progressPercent = this.element.querySelector('#model-progress-percent') as HTMLElement;
    this.progressFile = this.element.querySelector('#model-progress-file') as HTMLElement;
    this.progressBarFill = this.element.querySelector('#model-progress-fill') as HTMLElement;

    this.initThemeToggle();
  }

  private initThemeToggle(): void {
    const toggleBtn = this.element.querySelector<HTMLButtonElement>('#theme-contrast-toggle');
    if (!toggleBtn) return;

    // Check saved preference or media query
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('lazychef_high_contrast') : null;
    const prefersHighContrast =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-contrast: more)').matches;

    const isHighContrast = saved === 'true' || (saved === null && prefersHighContrast);

    if (isHighContrast && typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', 'high-contrast');
      toggleBtn.setAttribute('aria-pressed', 'true');
      toggleBtn.classList.add('active');
    }

    toggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') === 'high-contrast';
      const nextState = !current;

      if (nextState) {
        document.documentElement.setAttribute('data-theme', 'high-contrast');
        toggleBtn.setAttribute('aria-pressed', 'true');
        toggleBtn.classList.add('active');
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('lazychef_high_contrast', 'true');
        }
      } else {
        document.documentElement.removeAttribute('data-theme');
        toggleBtn.setAttribute('aria-pressed', 'false');
        toggleBtn.classList.remove('active');
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('lazychef_high_contrast', 'false');
        }
      }
    });
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  public updateStatus(status: EngineStatus): void {
    this.statusDot.className = 'status-dot';

    switch (status) {
      case 'checking':
        this.statusLabel.textContent = 'Checking WebGPU...';
        this.statusDot.classList.add('status-dot-checking');
        this.progressContainer.classList.add('hidden');
        break;

      case 'streaming_model':
        this.statusLabel.textContent = 'Streaming Gemma 2B...';
        this.statusDot.classList.add('status-dot-streaming');
        this.progressContainer.classList.remove('hidden');
        break;

      case 'ready_webgpu':
        this.statusLabel.textContent = 'WebGPU Gemma 2B Ready ⚡';
        this.statusDot.classList.add('status-dot-ready');
        this.progressContainer.classList.add('hidden');
        break;

      case 'unsupported_webgpu':
      case 'error_fallback':
        this.statusLabel.textContent = 'Instant Offline Engine 🦥 (<15ms)';
        this.statusDot.classList.add('status-dot-offline');
        this.progressContainer.classList.add('hidden');
        break;
    }
  }

  public updateProgress(progress: ModelStreamingProgress): void {
    const pct = Math.min(100, Math.max(0, progress.progress));
    this.progressPercent.textContent = `${pct}%`;
    this.progressBarFill.style.width = `${pct}%`;
    if (progress.file) {
      this.progressFile.textContent = `Downloading ${progress.file} (${pct}%)`;
    }
    this.statusLabel.textContent = `Streaming Gemma 2B (${pct}%)`;
    this.progressContainer.classList.remove('hidden');
  }
}
