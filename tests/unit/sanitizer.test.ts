/**
 * Unit Tests for escapeHtml Utility (TASK-102, SEC-001)
 * Validates zero-dependency HTML entity escaping against XSS payloads and edge cases.
 */

import { describe, it, expect } from 'vitest';
import { escapeHtml } from '../../src/core/sanitizer';

describe('escapeHtml Utility', () => {
  it('escapes basic HTML injection characters (<, >, &, ", \')', () => {
    const raw = `<script>alert("XSS") & alert('PWN');</script>`;
    const escaped = escapeHtml(raw);

    expect(escaped).toBe(
      '&lt;script&gt;alert(&quot;XSS&quot;) &amp; alert(&#39;PWN&#39;);&lt;/script&gt;'
    );
    expect(escaped).not.toContain('<');
    expect(escaped).not.toContain('>');
  });

  it('escapes attribute breakout injection payloads', () => {
    const payload = `" onfocus="alert(1)" autofocus="`;
    const escaped = escapeHtml(payload);

    expect(escaped).toBe('&quot; onfocus=&quot;alert(1)&quot; autofocus=&quot;');
    expect(escaped).not.toContain('"');
  });

  it('escapes image onerror payloads', () => {
    const payload = `<img src="x" onerror="alert('hacked')">`;
    const escaped = escapeHtml(payload);

    expect(escaped).toBe(
      '&lt;img src=&quot;x&quot; onerror=&quot;alert(&#39;hacked&#39;)&quot;&gt;'
    );
  });

  it('preserves clean culinary strings with ampersands encoded', () => {
    expect(escapeHtml('Salt & Pepper')).toBe('Salt &amp; Pepper');
    expect(escapeHtml('Garlic Butter Rice')).toBe('Garlic Butter Rice');
    expect(escapeHtml('10-Minute Egg Toast')).toBe('10-Minute Egg Toast');
  });

  it('handles null, undefined, and non-string values gracefully', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(42)).toBe('42');
    expect(escapeHtml(true)).toBe('true');
  });

  it('handles empty strings cleanly', () => {
    expect(escapeHtml('')).toBe('');
  });
});
