import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import { mintTawkVisitorHash } from '../src/tawk/hash.js';
import { readTawkConfig } from '../src/tawk/config.js';

test('mintTawkVisitorHash lowercases userId and returns hex HMAC-SHA256', () => {
  const apiKey = 'test-secret-key';
  const guid = 'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE';
  const expected = createHmac('sha256', apiKey)
    .update(guid.toLowerCase(), 'utf8')
    .digest('hex');
  assert.equal(mintTawkVisitorHash(guid, apiKey), expected);
  assert.equal(mintTawkVisitorHash(guid.toLowerCase(), apiKey), expected);
});

test('mintTawkVisitorHash rejects empty inputs', () => {
  assert.throws(() => mintTawkVisitorHash('', 'key'), /userId/);
  assert.throws(() => mintTawkVisitorHash('id', ''), /TAWK_API_KEY/);
});

test('readTawkConfig reports Secure Mode only when API key present', () => {
  const withKey = readTawkConfig({
    TAWK_PROPERTY_ID: 'prop',
    TAWK_WIDGET_ID: 'widget',
    TAWK_API_KEY: 'secret',
  });
  assert.equal(withKey.embedUrl, 'https://embed.tawk.to/prop/widget');
  assert.equal(withKey.secureModeEnabled, true);

  const withoutKey = readTawkConfig({
    TAWK_PROPERTY_ID: 'prop',
    TAWK_WIDGET_ID: 'widget',
    TAWK_API_KEY: '',
  });
  assert.equal(withoutKey.secureModeEnabled, false);
  assert.equal(withoutKey.apiKey, null);
});

test('readTawkConfig falls back to LAS property/widget defaults when env unset', () => {
  const cfg = readTawkConfig({});
  assert.equal(cfg.propertyId, '687cb5a73606072bf84a6030');
  assert.equal(cfg.widgetId, '1j0jib5sb');
  assert.equal(
    cfg.embedUrl,
    'https://embed.tawk.to/687cb5a73606072bf84a6030/1j0jib5sb',
  );
  assert.equal(cfg.apiKey, null);
  assert.equal(cfg.secureModeEnabled, false);
});
