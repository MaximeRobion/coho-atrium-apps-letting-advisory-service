import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, test } from 'node:test';
import {
  DEFAULT_FRAME_ANCESTORS,
  sanitizeFrameAncestors,
} from '../src/ui/csp.js';
import { buildQuickViewCsp } from '../src/ui/tawkCsp.js';

const previousAncestors = process.env.ATRIUM_FRAME_ANCESTORS;
const previousParent = process.env.ATRIUM_PARENT_ORIGIN;

afterEach(() => {
  if (previousAncestors === undefined) delete process.env.ATRIUM_FRAME_ANCESTORS;
  else process.env.ATRIUM_FRAME_ANCESTORS = previousAncestors;
  if (previousParent === undefined) delete process.env.ATRIUM_PARENT_ORIGIN;
  else process.env.ATRIUM_PARENT_ORIGIN = previousParent;
});

test('frame-ancestors defaults to localhost only when unset', () => {
  delete process.env.ATRIUM_FRAME_ANCESTORS;
  delete process.env.ATRIUM_PARENT_ORIGIN;
  assert.equal(sanitizeFrameAncestors(undefined), DEFAULT_FRAME_ANCESTORS);
});

test('Tawk CSP keeps frame-ancestors and allows embed hosts (no KB iframe)', () => {
  delete process.env.ATRIUM_PARENT_ORIGIN;
  const csp = buildQuickViewCsp('https://applabs.coho.management');
  assert.match(csp, /frame-ancestors https:\/\/applabs\.coho\.management/);
  assert.match(csp, /script-src[^;]*https:\/\/embed\.tawk\.to/);
  assert.match(csp, /style-src[^;]*https:\/\/embed\.tawk\.to/);
  assert.match(csp, /style-src[^;]*https:\/\/\*\.tawk\.to/);
  assert.match(csp, /frame-src[^;]*https:\/\/\*\.tawk\.to/);
  assert.doesNotMatch(csp, /tawk\.help/);
  assert.match(csp, /frame-src[^;]*https:\/\/www\.youtube\.com/);
  assert.match(csp, /frame-src[^;]*https:\/\/www\.youtube-nocookie\.com/);
  assert.match(csp, /connect-src[^;]*wss:\/\/\*\.tawk\.to/);
  assert.match(csp, /img-src[^;]*https:\/\/\*\.tawk\.to/);
  assert.match(csp, /connect-src[^;]*'self'/);
  assert.match(csp, /form-action[^;]*'self'/);
  assert.match(csp, /form-action[^;]*https:\/\/\*\.tawk\.to/);
  assert.match(csp, /font-src[^;]*https:\/\/embed\.tawk\.to/);
  assert.match(csp, /script-src[^;]*https:\/\/cdn\.jsdelivr\.net/);
  assert.match(csp, /style-src[^;]*https:\/\/cdn\.jsdelivr\.net/);
});

test('Dockerfile does not bake Tawk secrets or frame-ancestors', () => {
  const docker = readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8');
  assert.doesNotMatch(docker, /ENV ATRIUM_FRAME_ANCESTORS=/);
  assert.doesNotMatch(docker, /TAWK_API_KEY=/);
  assert.doesNotMatch(docker, /10ddf363/);
});
