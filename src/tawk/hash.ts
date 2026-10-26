import crypto from 'node:crypto';

/**
 * Tawk Secure Mode visitor hash.
 * Message is the OrganisationPerson Guid string, lowercased (legacy LAS behaviour).
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
