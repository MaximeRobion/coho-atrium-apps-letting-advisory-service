/**
 * Safe Tawk env diagnostics — presence / masked suffixes only.
 * Never expose TAWK_API_KEY (or any secret) values, lengths, or suffixes.
 */

import { readTawkConfig } from './config.js';

export type TawkEnvPresence = {
  TAWK_PROPERTY_ID: string;
  TAWK_WIDGET_ID: string;
  TAWK_API_KEY: 'set' | 'unset';
  TAWK_KNOWLEDGE_BASE_URL: 'set' | 'unset';
  configured: boolean;
};

function maskId(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return 'unset';
  if (trimmed.length <= 4) return `set:len=${trimmed.length}`;
  return `set:len=${trimmed.length}:…${trimmed.slice(-4)}`;
}

/** Masked presence for console / on-page strip. Safe to ship to the browser. */
export function describeTawkEnvPresence(
  env: NodeJS.ProcessEnv = process.env,
): TawkEnvPresence {
  const tawk = readTawkConfig(env);
  return {
    TAWK_PROPERTY_ID: maskId(tawk.propertyId),
    TAWK_WIDGET_ID: maskId(tawk.widgetId),
    TAWK_API_KEY: tawk.apiKey ? 'set' : 'unset',
    TAWK_KNOWLEDGE_BASE_URL: tawk.knowledgeBaseUrl ? 'set' : 'unset',
    configured: Boolean(tawk.embedUrl),
  };
}

/** One-line server log (no secrets). */
export function formatTawkEnvPresenceLog(
  presence: TawkEnvPresence = describeTawkEnvPresence(),
): string {
  return (
    `TAWK_PROPERTY_ID=${presence.TAWK_PROPERTY_ID} ` +
    `TAWK_WIDGET_ID=${presence.TAWK_WIDGET_ID} ` +
    `TAWK_API_KEY=${presence.TAWK_API_KEY} ` +
    `TAWK_KNOWLEDGE_BASE_URL=${presence.TAWK_KNOWLEDGE_BASE_URL} ` +
    `configured=${presence.configured}`
  );
}
