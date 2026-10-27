/**
 * Tawk.to Hosting env. Property/widget IDs are public in the embed URL;
 * TAWK_API_KEY is the Secure Mode secret and must never be committed.
 *
 * Non-secret LAS property/widget IDs fall back to Julie's live embed so the
 * widget still loads when Hosting has not injected TAWK_* yet. API key stays
 * env-only (graceful degrade without Secure Mode login).
 */

/** Public embed property id for Lettings Advice Service (not a secret). */
export const DEFAULT_TAWK_PROPERTY_ID = '687cb5a73606072bf84a6030';

/** Public embed widget id for Lettings Advice Service chat (not a secret). */
export const DEFAULT_TAWK_WIDGET_ID = '1j0jib5sb';

export interface TawkConfig {
  propertyId: string;
  widgetId: string;
  apiKey: string | null;
  embedUrl: string | null;
  secureModeEnabled: boolean;
}

export function readTawkConfig(
  env: NodeJS.ProcessEnv = process.env,
): TawkConfig {
  const propertyId = String(
    env.TAWK_PROPERTY_ID || DEFAULT_TAWK_PROPERTY_ID,
  ).trim();
  const widgetId = String(env.TAWK_WIDGET_ID || DEFAULT_TAWK_WIDGET_ID).trim();
  const apiKeyRaw = String(env.TAWK_API_KEY || '').trim();
  const apiKey = apiKeyRaw || null;
  const embedUrl =
    propertyId && widgetId ? `https://embed.tawk.to/${propertyId}/${widgetId}` : null;
  return {
    propertyId,
    widgetId,
    apiKey,
    embedUrl,
    secureModeEnabled: Boolean(apiKey),
  };
}
