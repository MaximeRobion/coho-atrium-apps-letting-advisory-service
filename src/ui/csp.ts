/**
 * Local-only fallback when ATRIUM_FRAME_ANCESTORS is unset, `'none'`, or unsafe.
 * On Atrium Hosting, COHO injects one Store origin — treat that as the source of truth.
 */
export const DEFAULT_FRAME_ANCESTORS = 'http://localhost:4200';

function isSafeSourceList(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    const isAlphaNumeric =
      (code >= 48 && code <= 57) ||
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122);
    const isPunctuation = " '*.:/-_".includes(character);
    if (!isAlphaNumeric && !isPunctuation) return false;
  }
  return true;
}

/** True when Hosting (or an old image) set the deny-all frame-ancestors value. */
function isNoneOnly(value: string): boolean {
  return value.split(/\s+/).every((token) => token === "'none'");
}

function uniqueTokens(...lists: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    for (const token of list.split(/\s+/)) {
      if (!token || seen.has(token)) continue;
      seen.add(token);
      out.push(token);
    }
  }
  return out;
}

/** Local fallback, plus ATRIUM_PARENT_ORIGIN when that env var is set. */
export function defaultFrameAncestors(): string {
  const parent = process.env.ATRIUM_PARENT_ORIGIN ? parentOrigin() : '';
  return uniqueTokens(DEFAULT_FRAME_ANCESTORS, parent).join(' ');
}

/**
 * CSP frame-ancestors source list.
 * Prefer the Hosting-injected value as-is. Empty / `'none'` / unsafe → local fallback only.
 * Fold ATRIUM_PARENT_ORIGIN only when that env var is set.
 */
export function sanitizeFrameAncestors(value: string | undefined): string {
  const trimmed = String(value ?? '').trim();
  const parent = process.env.ATRIUM_PARENT_ORIGIN ? parentOrigin() : '';
  if (!trimmed || isNoneOnly(trimmed) || !isSafeSourceList(trimmed)) {
    return uniqueTokens(DEFAULT_FRAME_ANCESTORS, parent).join(' ');
  }
  return uniqueTokens(trimmed, parent).join(' ');
}

export function parentOrigin(): string {
  const raw = process.env.ATRIUM_PARENT_ORIGIN || 'http://localhost:4200';
  try {
    const parsed = new URL(raw);
    const hasExtraPath = parsed.pathname !== '/' && parsed.pathname !== '';
    if (
      hasExtraPath ||
      parsed.search ||
      parsed.hash ||
      (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
      !parsed.host
    ) {
      return 'http://localhost:4200';
    }
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return 'http://localhost:4200';
  }
}
