import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import {
  DEFAULT_TAWK_KNOWLEDGE_BASE_URL,
  DEV_TAWK_PROPERTY_ID,
  DEV_TAWK_WIDGET_ID,
  readTawkConfig,
} from '../src/tawk/config.js';
import { mintTawkVisitorHash } from '../src/tawk/hash.js';

test('dead mintTawkVisitorHash still lowercases userId and returns hex HMAC-SHA256', () => {
  const apiKey = 'test-secret-key';
  const guid = 'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE';
  const expected = createHmac('sha256', apiKey)
    .update(guid.toLowerCase(), 'utf8')
    .digest('hex');
  assert.equal(mintTawkVisitorHash(guid, apiKey), expected);
  assert.equal(mintTawkVisitorHash(guid.toLowerCase(), apiKey), expected);
});

test('dead mintTawkVisitorHash rejects empty inputs', () => {
  assert.throws(() => mintTawkVisitorHash('', 'key'), /userId/);
  assert.throws(() => mintTawkVisitorHash('id', ''), /TAWK_API_KEY/);
});

test('readTawkConfig keeps unused apiKey opaque and exposes KB URL', () => {
  const withKey = readTawkConfig({
    TAWK_PROPERTY_ID: 'prop',
    TAWK_WIDGET_ID: 'widget',
    TAWK_API_KEY: 'secret',
  });
  assert.equal(withKey.embedUrl, 'https://embed.tawk.to/prop/widget');
  assert.equal(withKey.apiKey, 'secret');
  assert.equal(withKey.knowledgeBaseUrl, DEFAULT_TAWK_KNOWLEDGE_BASE_URL);

  const withoutKey = readTawkConfig({
    TAWK_PROPERTY_ID: 'prop',
    TAWK_WIDGET_ID: 'widget',
    TAWK_API_KEY: '',
  });
  assert.equal(withoutKey.apiKey, null);
});

test('readTawkConfig falls back to LAS property/widget/KB defaults when env unset', () => {
  const cfg = readTawkConfig({});
  assert.equal(cfg.propertyId, '687cb5a73606072bf84a6030');
  assert.equal(cfg.widgetId, '1j0jib5sb');
  assert.equal(
    cfg.embedUrl,
    'https://embed.tawk.to/687cb5a73606072bf84a6030/1j0jib5sb',
  );
  assert.equal(cfg.knowledgeBaseUrl, 'https://lettingadviceservice.tawk.help');
  assert.equal(cfg.apiKey, null);
});

test('readTawkConfig uses COHO test widget under atrium local/dev', () => {
  const cfg = readTawkConfig({
    ATRIUM_DEV_MODE: '1',
    NODE_ENV: 'development',
    // Hosting-style Julie IDs must not win in local/dev.
    TAWK_PROPERTY_ID: '687cb5a73606072bf84a6030',
    TAWK_WIDGET_ID: '1j0jib5sb',
  });
  assert.equal(cfg.propertyId, DEV_TAWK_PROPERTY_ID);
  assert.equal(cfg.widgetId, DEV_TAWK_WIDGET_ID);
  assert.equal(
    cfg.embedUrl,
    `https://embed.tawk.to/${DEV_TAWK_PROPERTY_ID}/${DEV_TAWK_WIDGET_ID}`,
  );
});

test('readTawkConfig keeps LAS defaults when ATRIUM_DEV_MODE is set without development', () => {
  const cfg = readTawkConfig({
    ATRIUM_DEV_MODE: '1',
    NODE_ENV: 'production',
  });
  assert.equal(cfg.propertyId, '687cb5a73606072bf84a6030');
  assert.equal(cfg.widgetId, '1j0jib5sb');
});
