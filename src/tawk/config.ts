/**
 * Tawk.to Hosting env. Property/widget IDs are public in the embed URL.
 *
 * Secure Mode / visitor login is out of product scope (shared Tawk property).
 * TAWK_API_KEY may still be present in Hosting env but is unused by this app.
 *
 * Non-secret LAS property/widget IDs fall back to Julie's live embed so the
 * widget still loads when Hosting has not injected TAWK_* yet.
 *
 * Local atrium dev (`ATRIUM_DEV_MODE=1` + `NODE_ENV=development`) always uses
 * the COHO test Inline widget so dogfood is not gated on Julie's live status.
 */

/** Public embed property id for Lettings Advice Service (not a secret). */
export const DEFAULT_TAWK_PROPERTY_ID = '687cb5a73606072bf84a6030';

/** Public embed widget id for Lettings Advice Service chat (not a secret). */
export const DEFAULT_TAWK_WIDGET_ID = '1j0jib5sb';

/** COHO test Inline property — always used under atrium local/dev. */
export const DEV_TAWK_PROPERTY_ID = '6ae3a7494dfe83347f02ef1a';

/** COHO test Inline widget — always used under atrium local/dev. */
export const DEV_TAWK_WIDGET_ID = '1k64katug';

/** Tawk Knowledge Base used as the in-app document library. */
export const DEFAULT_TAWK_KNOWLEDGE_BASE_URL =
  'https://lettingadviceservice.tawk.help';

export interface TawkConfig {
  propertyId: string;
  widgetId: string;
  /** Present when set in env; unused while Secure Mode is out of scope. */
  apiKey: string | null;
  embedUrl: string | null;
  knowledgeBaseUrl: string;
}

/** Same fail-closed gate as `isAtriumDevMode`, readable from an env bag. */
export function isAtriumDevTawkEnv(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (env.ATRIUM_DEV_MODE !== '1') return false;
  if (env.NODE_ENV === 'production') return false;
  return env.NODE_ENV === 'development';
}

export function readTawkConfig(
  env: NodeJS.ProcessEnv = process.env,
): TawkConfig {
  const useDevWidget = isAtriumDevTawkEnv(env);
  const propertyId = String(
    useDevWidget
      ? DEV_TAWK_PROPERTY_ID
      : env.TAWK_PROPERTY_ID || DEFAULT_TAWK_PROPERTY_ID,
  ).trim();
  const widgetId = String(
    useDevWidget
      ? DEV_TAWK_WIDGET_ID
      : env.TAWK_WIDGET_ID || DEFAULT_TAWK_WIDGET_ID,
  ).trim();
  const apiKeyRaw = String(env.TAWK_API_KEY || '').trim();
  const apiKey = apiKeyRaw || null;
  const knowledgeBaseUrl =
    String(env.TAWK_KNOWLEDGE_BASE_URL || DEFAULT_TAWK_KNOWLEDGE_BASE_URL).trim() ||
    DEFAULT_TAWK_KNOWLEDGE_BASE_URL;
  const embedUrl =
    propertyId && widgetId ? `https://embed.tawk.to/${propertyId}/${widgetId}` : null;
  return {
    propertyId,
    widgetId,
    apiKey,
    embedUrl,
    knowledgeBaseUrl,
  };
}
