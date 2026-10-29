/**
 * Normalizes an IC string:
 * - Removes hyphens, spaces, and punctuation
 * - Converts to uppercase
 * - Returns null if empty/blank
 */
export function normalizeIC(raw?: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return cleaned.length > 0 ? cleaned : null;
}

/**
 * Formats an IC for display:
 * - If exactly 12 digits: 000000-00-0000
 * - If non-standard IC: returns as-is
 * - If empty/null: returns "-"
 */
export function formatIC(raw?: string | null): string {
  if (!raw) return "-";
  const cleaned = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (cleaned.length === 12 && /^\d+$/.test(cleaned)) {
    return `${cleaned.slice(0, 6)}-${cleaned.slice(6, 8)}-${cleaned.slice(8, 12)}`;
  }
  return raw.trim() || "-";
}

