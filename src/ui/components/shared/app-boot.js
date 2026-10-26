/* Shared bootstrap helpers for the quick view. */

function applyTheme(theme) {
  var next = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  document.body.classList.toggle('coho__dark', next === 'dark');
}

function closeQuickView() {
  try {
    parent.postMessage({ type: 'atrium.quickView.close' }, PARENT_ORIGIN);
  } catch (err) {
    /* ignore */
  }
}

function apiHeaders() {
  return {
    Accept: 'application/json',
    Authorization: 'Bearer ' + USAGE_TOKEN,
    'X-Atrium-Connection-Reference': CONNECTION_REFERENCE,
  };
}

async function apiGet(path) {
  var response = await fetch(path, { method: 'GET', headers: apiHeaders() });
  var body = null;
  try {
    body = await response.json();
  } catch (err) {
    body = null;
  }
  return { ok: response.ok, status: response.status, body: body };
}
