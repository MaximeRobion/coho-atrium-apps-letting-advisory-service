import crypto from 'node:crypto';

/**
 * Dead code: Tawk Secure Mode visitor hash.
 *
 * Product pivot (DEV-2840): Secure Mode / Tawk_API.login is out — the same Tawk
 * property is shared with another team. Kept only so the historical HMAC shape
 * is documented if Secure Mode is ever revisited intentionally.
 *
 * Message is the OrganisationPerson Guid string, lowercased (legacy LAS).
 * Returns lowercase hex HMAC-SHA256.
 */
export function mintTawkVisitorHash(userId: string, apiKey: string): string {
  const message = String(userId || '').trim().toLowerCase();
  if (!message) {
    throw new Error('userId is required for Tawk visitor hash');
  }
  if (!apiKey) {
    throw new Error('TAWK_API_KEY is required for Tawk visitor hash');
  }
  return crypto.createHmac('sha256', apiKey).update(message, 'utf8').digest('hex');
}
