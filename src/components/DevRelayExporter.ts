/**
 * LazyChef DevRelayExporter Component
 * Formats and exports Hacktoberfest Week 3: Slow and Steady submission post
 * compliant with submission-template.md and Spec Section 12.5.
 * Features dynamic Payoff metrics injection, {% agent_session %} Liquid tag,
 * 1-click clipboard copy, and file download.
 * Enforces REQ-008, AC-007.
 */

import { Toast } from './Toast';
import { escapeHtml } from '../core/sanitizer';
import type { PayoffSummary } from '../storage/local-storage';

export function generateSubmissionMarkdown(payoffSummary: PayoffSummary, sessionId?: string): string {
  const cleanSessionId = (sessionId || '').trim() || 'hf26-lazychef-session';

  return `*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 3: Slow and Steady](https://dev.to/challenges/hacktoberfest-week3-2026-10-19)*

## What I Built
**LazyChef & Pantry Autopilot** is a local-first, privacy-preserving kitchen assistant designed to eliminate decision fatigue, kitchen cleanup, and food waste. Built to honor International Sloth Day, LazyChef enforces strict **Sloth Constraints**: maximum 1 pan, maximum 3 steps, and under 15 minutes preparation time.

## Demo
- Live App: [https://lazychef.app](https://lazychef.app)
- Repository: [https://github.com/mochammadqaysa/hf-challenges-week-3](https://github.com/mochammadqaysa/hf-challenges-week-3)

## How I Built It
LazyChef runs open-weight AI entirely in the browser using **Google Gemma 2B** via \`@huggingface/transformers\` with WebGPU hardware acceleration in a dedicated Web Worker. To respect users' time, it implements automatic background weight streaming combined with an instant (<15ms) deterministic heuristic rule matrix fallback. All pantry state, recipe history, and payoff metrics are persisted client-side in IndexedDB with zero cloud telemetry.

## Why Does Open Innovation Matter?
Open-weight models like Gemma empower developers to build truly private, decentralized applications. Cooking habits and food inventories are personal data that should never be commodified by cloud trackers. Local-first AI proves that edge compute can deliver delightful, sub-second user experiences without costly servers.

## My Agent Session
{% agent_session ${cleanSessionId} %}

## The Lazy Payoff
By strictly adhering to Sloth Constraints, LazyChef quantified the following cumulative savings:
- ⏱️ **${payoffSummary.totalMinutesSaved} minutes** of dinner paralysis avoided
- 🍳 **${payoffSummary.totalPansAvoided} dirty pans** spared from the sink
- 💰 **$${payoffSummary.totalMoneySavedUSD.toFixed(2)}** saved from diverted takeout & food waste
- 🥣 **${payoffSummary.totalMealsCooked} sloth meals** cooked with minimum effort

## Prize Categories
- **Best Use of Gemma / Open-Weight AI** ($200 partner track)
`;
}

export interface DevRelayExporterOptions {
  onClose?: () => void;
  defaultSessionId?: string;
}

export class DevRelayExporter {
  private overlay: HTMLElement;
  private currentSummary: PayoffSummary;
  private currentSessionId: string;
  private onClose?: () => void;
  private previouslyFocusedElement: HTMLElement | null = null;
  private keydownListener: (e: KeyboardEvent) => void;

  constructor(options: DevRelayExporterOptions = {}) {
    this.currentSessionId = options.defaultSessionId || '52bd4071-1ecb-4324-8200-7b69cba67453';
    this.onClose = options.onClose;
    this.currentSummary = {
      totalMealsCooked: 0,
      totalMinutesSaved: 0,
      totalMoneySavedUSD: 0,
      totalPansAvoided: 0,
      unlockedBadges: []
    };

    this.overlay = document.createElement('div');
    this.overlay.className = 'devrelay-modal-overlay hidden';
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-modal', 'true');
    this.overlay.setAttribute('aria-labelledby', 'devrelay-modal-title');
    this.overlay.setAttribute('tabindex', '-1');

    this.keydownListener = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !this.overlay.classList.contains('hidden')) {
        this.close();
      }
    };

    this.renderSkeleton();
    this.bindEvents();
    this.updateContent();
  }

  public getElement(): HTMLElement {
    return this.overlay;
  }

  public open(summary: PayoffSummary, sessionId?: string): void {
    this.currentSummary = summary;
    if (sessionId !== undefined) {
      this.currentSessionId = sessionId;
    }

    this.previouslyFocusedElement = document.activeElement as HTMLElement | null;

    this.updateContent();
    this.overlay.classList.remove('hidden');
    document.addEventListener('keydown', this.keydownListener);

    // Focus the modal or session input
    const sessionInput = this.overlay.querySelector<HTMLInputElement>('#devrelay-session-id');
    if (sessionInput) {
      setTimeout(() => sessionInput.focus(), 50);
    }
  }

  public close(): void {
    this.overlay.classList.add('hidden');
    document.removeEventListener('keydown', this.keydownListener);

    if (this.previouslyFocusedElement) {
      this.previouslyFocusedElement.focus();
    }

    if (this.onClose) {
      this.onClose();
    }
  }

  public isOpen(): boolean {
    return !this.overlay.classList.contains('hidden');
  }

  public async copySubmissionMarkdown(buttonEl?: HTMLButtonElement): Promise<string> {
    const markdown = generateSubmissionMarkdown(this.currentSummary, this.currentSessionId);

    try {
      let copied = false;
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(markdown);
          copied = true;
        } catch {
          // Fall back to execCommand if writeText fails due to permissions/focus
        }
      }

      if (!copied && typeof document !== 'undefined') {
        const textArea = document.createElement('textarea');
        textArea.value = markdown;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        copied = true;
      }

      Toast.success('Submission markdown copied to clipboard! Ready to paste into DEV.to 📝');

      if (buttonEl) {
        const originalHtml = buttonEl.innerHTML;
        buttonEl.innerHTML = '<span>Copied to Clipboard!</span> <span>✓</span>';
        buttonEl.classList.add('copied');
        setTimeout(() => {
          buttonEl.innerHTML = originalHtml;
          buttonEl.classList.remove('copied');
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to copy submission markdown:', err);
      Toast.warn('Failed to auto-copy. Please manually copy from the preview box below.');
    }

    return markdown;
  }

  public downloadSubmissionFile(): void {
    const markdown = generateSubmissionMarkdown(this.currentSummary, this.currentSessionId);
    try {
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'lazychef-hacktoberfest-submission.md';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      Toast.success('Saved lazychef-hacktoberfest-submission.md 💾');
    } catch (err) {
      console.error('Failed to download markdown:', err);
      Toast.warn('Unable to download file automatically.');
    }
  }

  public render(): void {
    this.updateContent();
  }

  private updateContent(): void {
    const markdown = generateSubmissionMarkdown(this.currentSummary, this.currentSessionId);
    const sessionInput = this.overlay.querySelector<HTMLInputElement>('#devrelay-session-id');
    const previewTextarea = this.overlay.querySelector<HTMLTextAreaElement>('#devrelay-markdown-preview');

    if (sessionInput) {
      sessionInput.value = this.currentSessionId;
    }
    if (previewTextarea) {
      previewTextarea.value = markdown;
    }
  }

  private renderSkeleton(): void {
    this.overlay.innerHTML = `
      <div class="devrelay-modal-card">
        <div class="devrelay-modal-header">
          <div class="modal-title-group">
            <span class="modal-icon">🚀</span>
            <div>
              <h2 id="devrelay-modal-title" class="modal-title">Hacktoberfest Dev.to Exporter</h2>
              <p class="modal-subtitle">Official Week 3: Slow and Steady Challenge Post Generator</p>
            </div>
          </div>
          <button type="button" class="btn-close-modal" id="btn-close-exporter" aria-label="Close export modal">&times;</button>
        </div>

        <div class="devrelay-modal-body">
          <div class="devrelay-form-row">
            <label for="devrelay-session-id" class="form-label">
              <span>DevRelay Session ID for</span> <code>{% agent_session %}</code>
            </label>
            <input 
              type="text" 
              id="devrelay-session-id" 
              class="form-input" 
              value="${escapeHtml(this.currentSessionId)}"
              placeholder="e.g. 52bd4071-1ecb-4324-8200-7b69cba67453"
              aria-label="DevRelay Session ID"
            />
          </div>

          <div class="devrelay-preview-group">
            <div class="preview-header-row">
              <span class="preview-label">Live Submission Markdown:</span>
              <span class="preview-badge">Compliant with submission-template.md</span>
            </div>
            <textarea 
              id="devrelay-markdown-preview" 
              class="devrelay-preview-textarea" 
              readonly 
              rows="10" 
              aria-label="Generated submission markdown preview"
            ></textarea>
          </div>
        </div>

        <div class="devrelay-modal-footer">
          <button type="button" id="btn-download-submission" class="btn-secondary" title="Save markdown to local file">
            <span>Download .md</span> <span>💾</span>
          </button>
          <button type="button" id="btn-copy-submission" class="btn-primary" title="Copy markdown post to clipboard">
            <span>Copy Submission Markdown</span> <span>📋</span>
          </button>
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    const closeBtn = this.overlay.querySelector<HTMLButtonElement>('#btn-close-exporter');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    const sessionInput = this.overlay.querySelector<HTMLInputElement>('#devrelay-session-id');
    const previewTextarea = this.overlay.querySelector<HTMLTextAreaElement>('#devrelay-markdown-preview');

    if (sessionInput && previewTextarea) {
      sessionInput.addEventListener('input', () => {
        this.currentSessionId = sessionInput.value;
        previewTextarea.value = generateSubmissionMarkdown(this.currentSummary, this.currentSessionId);
      });
    }

    const copyBtn = this.overlay.querySelector<HTMLButtonElement>('#btn-copy-submission');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => void this.copySubmissionMarkdown(copyBtn));
    }

    const downloadBtn = this.overlay.querySelector<HTMLButtonElement>('#btn-download-submission');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => this.downloadSubmissionFile());
    }
  }
}
