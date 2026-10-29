import { sanitizeFrameAncestors } from './csp.js';

/**
 * CSP for /ui with Tawk chat embed + Knowledge Base iframe.
 * Keep Hosting frame-ancestors; widen script/frame/connect/img for Tawk hosts.
 */
export function buildQuickViewCsp(frameAncestorsEnv?: string): string {
  const frameAncestors = sanitizeFrameAncestors(
    frameAncestorsEnv ?? process.env.ATRIUM_FRAME_ANCESTORS,
  );

  // Chat widget: embed.tawk.to + *.tawk.to (script, XHR/WS, images).
  const tawkHttps = 'https://embed.tawk.to https://*.tawk.to https://tawk.to';
  const tawkWs = 'wss://*.tawk.to wss://tawk.to';
  // Document library KB lives on *.tawk.help (not tawk.to).
  const tawkHelp = 'https://lettingadviceservice.tawk.help https://*.tawk.help';

  return [
    `frame-ancestors ${frameAncestors}`,
    "default-src 'none'",
    `script-src 'unsafe-inline' ${tawkHttps}`,
    "style-src 'unsafe-inline' https://fonts.googleapis.com",
    'font-src https://fonts.gstatic.com',
    `connect-src 'self' ${tawkHttps} ${tawkWs} ${tawkHelp}`,
    `img-src 'self' data: blob: ${tawkHttps} ${tawkHelp}`,
    `frame-src ${tawkHttps} ${tawkHelp}`,
    `child-src ${tawkHttps} ${tawkHelp}`,
    "base-uri 'none'",
    "form-action 'self'",
  ].join('; ');
}
