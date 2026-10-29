import http from 'node:http';
import { URL } from 'node:url';
import { isAtriumDevMode, localDevUsageToken } from '../dev/devMode.js';
import { verifyBrowserLaunch } from '../http/auth.js';
import { sendHtml } from '../http/respond.js';
import { quickViewHtml } from './quickView.js';
import { buildQuickViewCsp } from './tawkCsp.js';

export async function handleQuickView(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL,
): Promise<void> {
  const connectionReference = verifyBrowserLaunch(req, res, url);
  if (!connectionReference) return;
  let usageToken = url.searchParams.get('atriumUsageToken') || '';
  if (isAtriumDevMode() && !usageToken) {
    usageToken = localDevUsageToken(connectionReference);
  }
  const html = quickViewHtml({ connectionReference, usageToken });
  sendHtml(res, html, {
    'Content-Security-Policy': buildQuickViewCsp(),
    // Tawk needs a referrer (no-referrer breaks embed / message delivery).
    // https://help.tawk.to/article/how-to-change-the-referrer-policy-setting-on-your-website
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });
}
