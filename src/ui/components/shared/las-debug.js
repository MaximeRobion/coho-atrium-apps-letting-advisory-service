/* LAS chat diagnostics — enabled by ?lasDebug=1 or ATRIUM_DEV_MODE bootstrap. */

function isLasDebugEnabled() {
  try {
    if (new URLSearchParams(location.search).get('lasDebug') === '1') return true;
  } catch (err) {
    /* ignore */
  }
  return typeof ATRIUM_DEV_MODE !== 'undefined' && ATRIUM_DEV_MODE === true;
}

function lasDebugLog() {
  if (!isLasDebugEnabled()) return;
  var args = Array.prototype.slice.call(arguments);
  args.unshift('[LAS chat]');
  try {
    console.log.apply(console, args);
  } catch (err) {
    /* ignore */
  }
}

function ensureLasDebugStrip() {
  if (!isLasDebugEnabled()) return null;
  var existing = document.getElementById('las-debug-strip');
  if (existing) return existing;
  var el = document.createElement('pre');
  el.id = 'las-debug-strip';
  el.className = 'u-text--small u-margin-bottom--10';
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');
  var shell = document.getElementById('las-shell');
  if (shell && shell.firstChild) {
    shell.insertBefore(el, shell.firstChild);
  } else if (shell) {
    shell.appendChild(el);
  } else {
    document.body.insertBefore(el, document.body.firstChild);
  }
  return el;
}

function lasDebugStripLine(line) {
  if (!isLasDebugEnabled()) return;
  var el = ensureLasDebugStrip();
  if (!el) return;
  var stamp = new Date().toISOString().slice(11, 19);
  el.textContent = (el.textContent ? el.textContent + '\n' : '') + stamp + ' ' + line;
}

function lasDebugBootSnapshot() {
  if (!isLasDebugEnabled()) return;
  var env =
    typeof LAS_TAWK_ENV !== 'undefined' && LAS_TAWK_ENV
      ? LAS_TAWK_ENV
      : { note: 'LAS_TAWK_ENV missing from bootstrap' };
  var force =
    typeof FORCE_CHAT_OPEN !== 'undefined' && FORCE_CHAT_OPEN ? true : false;
  var hours =
    typeof getChatHoursStatus === 'function' ? getChatHoursStatus() : null;
  lasDebugLog('boot', {
    atriumDevMode: typeof ATRIUM_DEV_MODE !== 'undefined' && ATRIUM_DEV_MODE,
    forceChatOpen: force,
    tawkEnv: env,
    hours: hours
      ? {
          isOpen: hours.isOpen,
          statusText: hours.statusText,
          nextChangeText: hours.nextChangeText,
        }
      : null,
  });
  lasDebugStripLine(
    'env ' +
      JSON.stringify(env) +
      ' | forceChatOpen=' +
      force +
      ' | hours.isOpen=' +
      (hours ? hours.isOpen : '?'),
  );
}
