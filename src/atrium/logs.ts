/** POST operational logs to Public API atrium logs endpoint. */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface AtriumLogPayload {
  level: LogLevel;
  message: string;
  deliveryId?: string;
  detailJson?: string;
  durationMs?: number;
}

let outboundFetch: typeof fetch = globalThis.fetch.bind(globalThis);

export function setOutboundFetch(impl: typeof fetch): void {
  outboundFetch = impl;
}

export function resetOutboundFetch(): void {
  outboundFetch = globalThis.fetch.bind(globalThis);
}

export async function postAtriumLog(
  apiBaseUrl: string,
  apiKey: string,
  payload: AtriumLogPayload,
): Promise<void> {
  const base = apiBaseUrl.replace(/\/+$/, '');
  if (!base || !apiKey) return;

  try {
    const response = await outboundFetch(`${base}/v1.1/public/atrium/logs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    try {
      await response.arrayBuffer();
    } catch {
      // ignore
    }
  } catch (err) {
    console.error('[atrium-lettings-advice] failed to post atrium log', err);
  }
}
