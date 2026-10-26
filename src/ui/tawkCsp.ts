import { sanitizeFrameAncestors } from './csp.js';

/**
 * CSP for /ui with Tawk embed.
 * Keep Hosting frame-ancestors; widen script/frame/connect/img for Tawk hosts.
 */
export function buildQuickViewCsp(frameAncestorsEnv?: string): string {
  const frameAncestors = sanitizeFrameAncestors(
    frameAncestorsEnv ?? process.env.ATRIUM_FRAME_ANCESTORS,
  );

  // Tawk widget loads embed.tawk.to, spawns iframes, XHR/WS, and images from *.tawk.to.
  const tawkHttps = 'https://embed.tawk.to https://*.tawk.to https://tawk.to';
  const tawkWs = 'wss://*.tawk.to wss://tawk.to';

  return [
    `frame-ancestors ${frameAncestors}`,
    "default-src 'none'",
    `script-src 'unsafe-inline' ${tawkHttps}`,
    "style-src 'unsafe-inline' https://fonts.googleapis.com",
    'font-src https://fonts.gstatic.com',
    `connect-src 'self' ${tawkHttps} ${tawkWs}`,
    `img-src 'self' data: blob: ${tawkHttps}`,
    `frame-src ${tawkHttps}`,
    `child-src ${tawkHttps}`,
    "base-uri 'none'",
    "form-action 'self'",
  ].join('; ');
}
