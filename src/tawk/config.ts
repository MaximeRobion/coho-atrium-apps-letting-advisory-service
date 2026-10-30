/**
 * Tawk.to config from process env only — no baked-in property/widget IDs.
 *
 * Hosting: set `TAWK_PROPERTY_ID` / `TAWK_WIDGET_ID` via Hosting runtime secrets
 * (survive re-provision). Local: `npm run dev` loads `.env` then `.env.example`.
 *
 * Secure Mode / visitor login is out of product scope (shared Tawk property).
 * `TAWK_API_KEY` may be present but is unused by this app.
 */

export interface TawkConfig {
  propertyId: string;
  widgetId: string;
  /** Present when set in env; unused while Secure Mode is out of scope. */
  apiKey: string | null;
  embedUrl: string | null;
  /** Optional legacy KB URL; UI uses the static documents catalogue instead. */
  knowledgeBaseUrl: string;
}

export function readTawkConfig(
  env: NodeJS.ProcessEnv = process.env,
): TawkConfig {
  const propertyId = String(env.TAWK_PROPERTY_ID || '').trim();
  const widgetId = String(env.TAWK_WIDGET_ID || '').trim();
  const apiKeyRaw = String(env.TAWK_API_KEY || '').trim();
  const apiKey = apiKeyRaw || null;
  const knowledgeBaseUrl = String(env.TAWK_KNOWLEDGE_BASE_URL || '').trim();
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
