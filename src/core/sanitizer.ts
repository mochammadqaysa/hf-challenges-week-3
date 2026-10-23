/**
 * LazyChef Sanitizer & Output Encoder Utility
 * Enforces SEC-001 by providing zero-dependency HTML entity escaping
 * for untrusted dynamic inputs before DOM interpolation.
 */

const HTML_ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

const HTML_CHARS_REGEX = /[&<>"']/g;

/**
 * Escapes characters with special meaning in HTML (&, <, >, ", ').
 * Protects against Cross-Site Scripting (XSS) when interpolating strings into innerHTML.
 */
export function escapeHtml(input: unknown): string {
  if (input === null || input === undefined) {
    return '';
  }
  const str = String(input);
  return str.replace(HTML_CHARS_REGEX, (match) => HTML_ENTITY_MAP[match] || match);
}
