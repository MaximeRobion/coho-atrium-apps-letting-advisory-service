import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parentOrigin } from './csp.js';

const here = dirname(fileURLToPath(import.meta.url));
const componentsDir = join(here, 'components');

function readUiAsset(name: string): string {
  return readFileSync(join(here, name), 'utf8');
}

function readCohoCss(): string {
  const candidates = [
    join(here, '..', '..', 'design', 'coho.css'),
    join(here, '..', '..', '..', 'design', 'coho.css'),
    join(process.cwd(), 'design', 'coho.css'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return readFileSync(candidate, 'utf8');
  }
  throw new Error('Missing design/coho.css');
}

const JS_ORDER = [
  'shared/app-boot.js',
  'shared/chat-hours.js',
  'app/las-app.js',
];

function readOrderedJs(paths: string[]): string {
  return paths.map((p) => readFileSync(join(componentsDir, p), 'utf8')).join('\n');
}

const BOOTSTRAP_MARKER = '/* __BOOTSTRAP__ */';

/**
 * Assemble the quick-view HTML document.
 * Static quickView.html links coho.css for check:design; the served document
 * inlines kit CSS + app chrome (CSP style-src 'unsafe-inline').
 */
export function quickViewHtml(opts: {
  connectionReference: string;
  usageToken: string;
}): string {
  let html = readUiAsset('quickView.html');
  const cohoCss = readCohoCss();
  const appCss = readFileSync(join(componentsDir, 'app', 'app.css'), 'utf8');
  const clientJs = readOrderedJs(JS_ORDER);

  const bootstrap =
    `const CONNECTION_REFERENCE = ${JSON.stringify(opts.connectionReference)};\n` +
    `const USAGE_TOKEN = ${JSON.stringify(opts.usageToken)};\n` +
    `const PARENT_ORIGIN = ${JSON.stringify(parentOrigin())};\n`;

  if (!clientJs.includes(BOOTSTRAP_MARKER)) {
    throw new Error('las-app.js missing bootstrap marker');
  }
  const script = clientJs.replace(BOOTSTRAP_MARKER, bootstrap);

  html = html.replace(
    /<link rel="stylesheet" href="[^"]*coho\.css">/,
    `<style>\n${cohoCss}\n</style>\n  <style>\n${appCss}\n</style>`,
  );

  html = html.replace(BOOTSTRAP_MARKER, '').replace('__SCRIPT__', script);
  return html;
}

/** Exported for tests / diagnostics. */
export function listUiComponentFolders(): string[] {
  return readdirSync(componentsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}
