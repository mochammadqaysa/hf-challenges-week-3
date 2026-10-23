// @vitest-environment happy-dom
/**
 * Unit tests for DevRelayExporter and generateSubmissionMarkdown
 * Enforces REQ-008, AC-007
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  generateSubmissionMarkdown,
  DevRelayExporter
} from '../../src/components/DevRelayExporter';
import type { PayoffSummary } from '../../src/storage/local-storage';

describe('DevRelayExporter & generateSubmissionMarkdown', () => {
  const mockSummary: PayoffSummary = {
    totalMealsCooked: 4,
    totalMinutesSaved: 60,
    totalMoneySavedUSD: 26.0,
    totalPansAvoided: 8,
    unlockedBadges: ['First Sloth Meal', 'Dish Spared Master']
  };

  describe('generateSubmissionMarkdown()', () => {
    it('generates markdown compliant with submission-template.md', () => {
      const markdown = generateSubmissionMarkdown(mockSummary, 'test-session-123');

      expect(markdown).toContain('*This is a submission for the [Hacktoberfest Open-Source AI Challenge Week 3: Slow and Steady]');
      expect(markdown).toContain('## What I Built');
      expect(markdown).toContain('## Demo');
      expect(markdown).toContain('## How I Built It');
      expect(markdown).toContain('## Why Does Open Innovation Matter?');
      expect(markdown).toContain('## My Agent Session');
      expect(markdown).toContain('## The Lazy Payoff');
      expect(markdown).toContain('## Prize Categories');
      expect(markdown).toContain('Best Use of Gemma / Open-Weight AI');
    });

    it('injects dynamic payoff metrics accurately', () => {
      const markdown = generateSubmissionMarkdown(mockSummary, 'test-session-123');

      expect(markdown).toContain('60 minutes');
      expect(markdown).toContain('8 dirty pans');
      expect(markdown).toContain('$26.00');
      expect(markdown).toContain('4 sloth meals');
    });

    it('embeds {% agent_session %} with custom session ID', () => {
      const markdown = generateSubmissionMarkdown(mockSummary, 'session-abc-xyz');
      expect(markdown).toContain('{% agent_session session-abc-xyz %}');
    });

    it('falls back to default session ID if none or empty string provided', () => {
      const markdownEmpty = generateSubmissionMarkdown(mockSummary, '');
      expect(markdownEmpty).toContain('{% agent_session hf26-lazychef-session %}');

      const markdownSpaces = generateSubmissionMarkdown(mockSummary, '   ');
      expect(markdownSpaces).toContain('{% agent_session hf26-lazychef-session %}');
    });
  });

  describe('DevRelayExporter Component', () => {
    let exporter: DevRelayExporter;

    beforeEach(() => {
      document.body.innerHTML = '';
      exporter = new DevRelayExporter({ defaultSessionId: 'default-session-id' });
      document.body.appendChild(exporter.getElement());
    });

    afterEach(() => {
      exporter.close();
      document.body.innerHTML = '';
    });

    it('renders with modal hidden initially', () => {
      expect(exporter.isOpen()).toBe(false);
      expect(exporter.getElement().classList.contains('hidden')).toBe(true);
      expect(exporter.getElement().getAttribute('role')).toBe('dialog');
      expect(exporter.getElement().getAttribute('aria-modal')).toBe('true');
    });

    it('opens modal and updates preview with summary data', () => {
      exporter.open(mockSummary, 'custom-session-id');

      expect(exporter.isOpen()).toBe(true);
      expect(exporter.getElement().classList.contains('hidden')).toBe(false);

      const preview = exporter.getElement().querySelector<HTMLTextAreaElement>('#devrelay-markdown-preview');
      expect(preview).not.toBeNull();
      expect(preview?.value).toContain('{% agent_session custom-session-id %}');
      expect(preview?.value).toContain('60 minutes');
    });

    it('closes modal when close button is clicked', () => {
      const closeSpy = vi.fn();
      const customExporter = new DevRelayExporter({ onClose: closeSpy });
      document.body.appendChild(customExporter.getElement());

      customExporter.open(mockSummary);
      expect(customExporter.isOpen()).toBe(true);

      const closeBtn = customExporter.getElement().querySelector<HTMLButtonElement>('#btn-close-exporter');
      closeBtn?.click();

      expect(customExporter.isOpen()).toBe(false);
      expect(closeSpy).toHaveBeenCalledTimes(1);
    });

    it('closes modal when Escape key is pressed', () => {
      exporter.open(mockSummary);
      expect(exporter.isOpen()).toBe(true);

      const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escEvent);

      expect(exporter.isOpen()).toBe(false);
    });

    it('closes modal when clicking overlay backdrop outside card', () => {
      exporter.open(mockSummary);
      expect(exporter.isOpen()).toBe(true);

      // Click directly on the overlay backdrop
      exporter.getElement().dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(exporter.isOpen()).toBe(false);
    });

    it('updates markdown preview when session ID input changes', () => {
      exporter.open(mockSummary, 'initial-session');

      const sessionInput = exporter.getElement().querySelector<HTMLInputElement>('#devrelay-session-id');
      const preview = exporter.getElement().querySelector<HTMLTextAreaElement>('#devrelay-markdown-preview');

      expect(sessionInput).not.toBeNull();
      expect(preview).not.toBeNull();

      if (sessionInput && preview) {
        sessionInput.value = 'updated-agent-session-456';
        sessionInput.dispatchEvent(new Event('input'));

        expect(preview.value).toContain('{% agent_session updated-agent-session-456 %}');
      }
    });

    it('copies markdown to clipboard via navigator.clipboard and updates button state', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: writeTextMock
        },
        configurable: true,
        writable: true
      });

      exporter.open(mockSummary, 'copy-session');

      const copyBtn = exporter.getElement().querySelector<HTMLButtonElement>('#btn-copy-submission');
      expect(copyBtn).not.toBeNull();

      const text = await exporter.copySubmissionMarkdown(copyBtn || undefined);

      expect(writeTextMock).toHaveBeenCalledWith(text);
      expect(text).toContain('{% agent_session copy-session %}');
      expect(copyBtn?.classList.contains('copied')).toBe(true);
    });

    it('handles download submission file by creating a link and clicking it', () => {
      const clickMock = vi.fn();
      const originalCreateObjectURL = URL.createObjectURL;
      const originalRevokeObjectURL = URL.revokeObjectURL;

      URL.createObjectURL = vi.fn().mockReturnValue('blob:dummy-url');
      URL.revokeObjectURL = vi.fn();

      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        const el = originalCreateElement(tagName);
        if (tagName.toLowerCase() === 'a') {
          el.click = clickMock;
        }
        return el;
      });

      exporter.open(mockSummary);
      exporter.downloadSubmissionFile();

      expect(clickMock).toHaveBeenCalledTimes(1);

      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      vi.restoreAllMocks();
    });

    it('falls back to execCommand copy when navigator.clipboard is unavailable', async () => {
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        configurable: true,
        writable: true
      });

      const execSpy = vi.fn().mockReturnValue(true);
      document.execCommand = execSpy;

      exporter.open(mockSummary);
      const text = await exporter.copySubmissionMarkdown();

      expect(execSpy).toHaveBeenCalledWith('copy');
      expect(text).toContain('## What I Built');
    });

    it('handles clipboard failure gracefully with toast warning', async () => {
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: vi.fn().mockRejectedValue(new Error('Permission denied'))
        },
        configurable: true,
        writable: true
      });

      exporter.open(mockSummary);
      const text = await exporter.copySubmissionMarkdown();

      expect(text).toContain('## What I Built');
    });

    it('handles download failure gracefully', () => {
      const originalCreateObjectURL = URL.createObjectURL;
      URL.createObjectURL = vi.fn().mockImplementation(() => {
        throw new Error('Blob creation failure');
      });

      exporter.open(mockSummary);
      expect(() => exporter.downloadSubmissionFile()).not.toThrow();

      URL.createObjectURL = originalCreateObjectURL;
    });
  });
});
