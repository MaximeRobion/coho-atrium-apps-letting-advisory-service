/* __BOOTSTRAP__ */

(function () {
  // Strip usage token from the address bar after bootstrap (token stays in memory).
  try {
    var clean = new URL(window.location.href);
    if (clean.searchParams.has('atriumUsageToken')) {
      clean.searchParams.delete('atriumUsageToken');
      window.history.replaceState({}, '', clean.pathname + clean.search + clean.hash);
    }
  } catch (err) {
    /* ignore */
  }

  var fromQuery = new URLSearchParams(location.search).get('theme');
  if (fromQuery === 'dark' || fromQuery === 'light') applyTheme(fromQuery);

  window.addEventListener('message', function (event) {
    if (event.origin !== PARENT_ORIGIN) return;
    if (event.data && event.data.type === 'atrium.quickView.theme') {
      applyTheme(event.data.theme);
    }
  });

  try {
    parent.postMessage({ type: 'atrium.quickView.ready' }, PARENT_ORIGIN);
  } catch (err) {
    /* ignore */
  }

  var home = document.getElementById('screen-home');
  var chat = document.getElementById('screen-chat');
  var statusEl = document.getElementById('chat-status');
  var embedHost = document.getElementById('tawk-embed');
  var tawkLoaded = false;

  function showHome() {
    home.hidden = false;
    chat.hidden = true;
  }

  function showChat() {
    home.hidden = true;
    chat.hidden = false;
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text || '';
  }

  function loadTawkWidget(embedUrl, login) {
    if (tawkLoaded) return;
    tawkLoaded = true;

    var propertyId = embedUrl.split('/')[3] || '';
    var hostId = 'tawk_' + propertyId;
    embedHost.id = hostId;

    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();
    window.Tawk_API.embedded = hostId;

    if (login && login.userId && login.hash) {
      window.Tawk_API.onLoad = function () {
        try {
          window.Tawk_API.login({
            userId: login.userId,
            hash: login.hash,
            name: login.name || '',
            email: login.email || '',
          });
        } catch (err) {
          setStatus('Chat loaded. Visitor login could not be applied.');
        }
      };
    }

    var script = document.createElement('script');
    script.async = true;
    script.src = embedUrl;
    script.charset = 'UTF-8';
    script.setAttribute('crossorigin', '*');
    document.body.appendChild(script);
  }

  async function openChat() {
    showChat();
    setStatus('Loading chat…');

    var visitor = await apiGet('/api/tawk/visitor');
    if (!visitor.ok || !visitor.body || !visitor.body.ok) {
      var config = await apiGet('/api/tawk/config');
      if (config.ok && config.body && config.body.embedUrl) {
        setStatus(
          visitor.body && visitor.body.message
            ? visitor.body.message
            : 'Opening chat without Secure Mode login.',
        );
        loadTawkWidget(config.body.embedUrl, null);
        return;
      }
      setStatus(
        (visitor.body && visitor.body.message) ||
          'Chat is not configured yet. Ask COHO to set TAWK_PROPERTY_ID and TAWK_WIDGET_ID on Hosting.',
      );
      return;
    }

    var embedUrl = visitor.body.embedUrl;
    if (!embedUrl) {
      setStatus('Chat embed URL missing.');
      return;
    }

    if (visitor.body.secureModeEnabled && visitor.body.login) {
      setStatus('Chat ready. Identifying you securely…');
      loadTawkWidget(embedUrl, visitor.body.login);
    } else {
      setStatus(
        visitor.body.reason ||
          'Chat ready. Secure Mode is off — widget loads without visitor login.',
      );
      loadTawkWidget(embedUrl, null);
    }
  }

  document.getElementById('open-chat').addEventListener('click', function () {
    openChat().catch(function (err) {
      setStatus(err && err.message ? err.message : 'Failed to open chat');
      showChat();
    });
  });
  document.getElementById('back-home').addEventListener('click', showHome);
  document.getElementById('close-home').addEventListener('click', closeQuickView);
  document.getElementById('close-chat').addEventListener('click', closeQuickView);
})();
