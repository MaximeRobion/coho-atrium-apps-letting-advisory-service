/**
 * Tawk.to Hosting env. Property/widget IDs are public in the embed URL;
 * TAWK_API_KEY is the Secure Mode secret and must never be committed.
 */

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
  const propertyId = String(env.TAWK_PROPERTY_ID || '').trim();
  const widgetId = String(env.TAWK_WIDGET_ID || '').trim();
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
