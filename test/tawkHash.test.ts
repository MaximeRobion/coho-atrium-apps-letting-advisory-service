import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import { readTawkConfig } from '../src/tawk/config.js';
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

test('readTawkConfig keeps unused apiKey opaque and exposes KB URL from env', () => {
  const withKey = readTawkConfig({
    TAWK_PROPERTY_ID: 'prop',
    TAWK_WIDGET_ID: 'widget',
    TAWK_API_KEY: 'secret',
    TAWK_KNOWLEDGE_BASE_URL: 'https://kb.example',
  });
  assert.equal(withKey.embedUrl, 'https://embed.tawk.to/prop/widget');
  assert.equal(withKey.apiKey, 'secret');
  assert.equal(withKey.knowledgeBaseUrl, 'https://kb.example');

  const withoutKey = readTawkConfig({
    TAWK_PROPERTY_ID: 'prop',
    TAWK_WIDGET_ID: 'widget',
    TAWK_API_KEY: '',
  });
  assert.equal(withoutKey.apiKey, null);
  assert.equal(withoutKey.knowledgeBaseUrl, '');
});

test('readTawkConfig has no baked-in property/widget defaults', () => {
  const cfg = readTawkConfig({});
  assert.equal(cfg.propertyId, '');
  assert.equal(cfg.widgetId, '');
  assert.equal(cfg.embedUrl, null);
  assert.equal(cfg.knowledgeBaseUrl, '');
  assert.equal(cfg.apiKey, null);
});

test('readTawkConfig uses env IDs only (no atrium-dev override)', () => {
  const cfg = readTawkConfig({
    ATRIUM_DEV_MODE: '1',
    NODE_ENV: 'development',
    TAWK_PROPERTY_ID: 'test-property-id',
    TAWK_WIDGET_ID: 'test-widget-id',
  });
  assert.equal(cfg.propertyId, 'test-property-id');
  assert.equal(cfg.widgetId, 'test-widget-id');
  assert.equal(
    cfg.embedUrl,
    'https://embed.tawk.to/test-property-id/test-widget-id',
  );
});
