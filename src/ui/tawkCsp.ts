import { sanitizeFrameAncestors } from './csp.js';

/**
 * CSP for /ui with Tawk chat embed + Documents tab (external View/Download links).
 * Keep Hosting frame-ancestors; widen script/style/frame/connect/img/font for Tawk.
 * Align with https://help.tawk.to/article/why-are-images-not-showing-up-in-the-widget
 */
export function buildQuickViewCsp(frameAncestorsEnv?: string): string {
  const frameAncestors = sanitizeFrameAncestors(
    frameAncestorsEnv ?? process.env.ATRIUM_FRAME_ANCESTORS,
  );

  // Chat widget: embed.tawk.to + *.tawk.to (script, CSS, XHR/WS, images, fonts).
  const tawkHttps = 'https://embed.tawk.to https://*.tawk.to https://tawk.to';
  const tawkWs = 'wss://*.tawk.to wss://tawk.to';
  // Tawk messenger pulls emoji assets from jsDelivr.
  const jsdelivr = 'https://cdn.jsdelivr.net';
  // Documents may open YouTube videos in a new window; keep frames for safety.
  const youtubeFrames =
    'https://www.youtube.com https://www.youtube-nocookie.com https://youtube.com';

  return [
    `frame-ancestors ${frameAncestors}`,
    "default-src 'none'",
    `script-src 'unsafe-inline' ${tawkHttps} ${jsdelivr}`,
    `style-src 'unsafe-inline' https://fonts.googleapis.com ${tawkHttps} ${jsdelivr}`,
    `font-src https://fonts.gstatic.com ${tawkHttps} data:`,
    `connect-src 'self' ${tawkHttps} ${tawkWs}`,
    `img-src 'self' data: blob: ${tawkHttps} ${jsdelivr} https://tawk.link https://*.amazonaws.com`,
    `frame-src ${tawkHttps} ${youtubeFrames}`,
    `child-src ${tawkHttps} ${youtubeFrames}`,
    "base-uri 'none'",
    // Tawk's composer can POST to tawk hosts; 'self' alone drops visitor messages.
    `form-action 'self' ${tawkHttps}`,
  ].join('; ');
}
