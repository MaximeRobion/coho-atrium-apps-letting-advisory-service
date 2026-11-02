import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  describeTawkEnvPresence,
  formatTawkEnvPresenceLog,
} from '../src/tawk/diagnostics.js';

test('describeTawkEnvPresence masks IDs and never exposes API key material', () => {
  const presence = describeTawkEnvPresence({
    TAWK_PROPERTY_ID: '6ae3a7494dfe83347f02ef1a',
    TAWK_WIDGET_ID: '1k64katug',
    TAWK_API_KEY: 'super-secret-api-key-value',
    TAWK_KNOWLEDGE_BASE_URL: 'https://kb.example',
  });
  assert.equal(presence.configured, true);
  assert.equal(presence.TAWK_PROPERTY_ID, 'set:len=24:…ef1a');
  assert.equal(presence.TAWK_WIDGET_ID, 'set:len=9:…atug');
  assert.equal(presence.TAWK_API_KEY, 'set');
  assert.equal(presence.TAWK_KNOWLEDGE_BASE_URL, 'set');
  assert.doesNotMatch(JSON.stringify(presence), /super-secret/);
  assert.doesNotMatch(JSON.stringify(presence), /6ae3a7494dfe83347f02ef1a/);
  assert.doesNotMatch(JSON.stringify(presence), /1k64katug/);
});

test('describeTawkEnvPresence reports unset when empty', () => {
  const presence = describeTawkEnvPresence({});
  assert.equal(presence.configured, false);
  assert.equal(presence.TAWK_PROPERTY_ID, 'unset');
  assert.equal(presence.TAWK_WIDGET_ID, 'unset');
  assert.equal(presence.TAWK_API_KEY, 'unset');
  assert.equal(presence.TAWK_KNOWLEDGE_BASE_URL, 'unset');
});

test('formatTawkEnvPresenceLog is one line without secrets', () => {
  const line = formatTawkEnvPresenceLog(
    describeTawkEnvPresence({
      TAWK_PROPERTY_ID: 'abcdefghijklmnop',
      TAWK_WIDGET_ID: 'widget01',
      TAWK_API_KEY: 'nope',
    }),
  );
  assert.match(line, /TAWK_PROPERTY_ID=set:len=16:…mnop/);
  assert.match(line, /TAWK_API_KEY=set/);
  assert.match(line, /configured=true/);
  assert.doesNotMatch(line, /nope/);
  assert.doesNotMatch(line, /abcdefghijklmnop/);
});
