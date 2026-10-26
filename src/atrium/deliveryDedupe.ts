/** In-process delivery-id dedupe for the 300s signature window. */

const WINDOW_MS = 300_000;
const seen = new Map<string, number>();

/** True when this delivery id was already marked after a durable success. */
export function wasDeliverySeen(
  deliveryId: string | undefined | null,
  now = Date.now(),
): boolean {
  if (!deliveryId) return false;
  prune(now);
  return seen.has(deliveryId);
}

/** Record after durable setup/disconnect success so failed attempts can retry. */
export function markDeliverySeen(
  deliveryId: string | undefined | null,
  now = Date.now(),
): void {
  if (!deliveryId) return;
  prune(now);
  seen.set(deliveryId, now);
}

export function resetDeliveryDedupe(): void {
  seen.clear();
}

function prune(now: number): void {
  for (const [id, at] of seen.entries()) {
    if (now - at > WINDOW_MS) seen.delete(id);
  }
}
