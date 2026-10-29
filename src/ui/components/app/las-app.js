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
  var library = document.getElementById('screen-library');
  var statusEl = document.getElementById('chat-status');
  var libraryStatusEl = document.getElementById('library-status');
  var embedHost = document.getElementById('tawk-embed');
  var libraryFrame = document.getElementById('library-frame');
  var libraryExternal = document.getElementById('library-open-external');
  var tawkLoaded = false;
  var libraryLoaded = false;
  var DEFAULT_KB_URL = 'https://lettingadviceservice.tawk.help';

  function showHome() {
    home.hidden = false;
    chat.hidden = true;
    library.hidden = true;
  }

  function showChat() {
    home.hidden = true;
    chat.hidden = false;
    library.hidden = true;
  }

  function showLibrary() {
    home.hidden = true;
    chat.hidden = true;
    library.hidden = false;
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text || '';
  }

  function setLibraryStatus(text) {
    if (libraryStatusEl) libraryStatusEl.textContent = text || '';
  }

  function loadTawkWidget(embedUrl) {
    if (tawkLoaded) return;
    tawkLoaded = true;

    var propertyId = embedUrl.split('/')[3] || '';
    var hostId = 'tawk_' + propertyId;
    embedHost.id = hostId;

    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();
    window.Tawk_API.embedded = hostId;

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

    var config = await apiGet('/api/tawk/config');
    if (!config.ok || !config.body || !config.body.ok || !config.body.embedUrl) {
      setStatus(
        (config.body && config.body.message) ||
          'Chat is not configured yet. Ask COHO to set TAWK_PROPERTY_ID and TAWK_WIDGET_ID on Hosting.',
      );
      return;
    }

    setStatus('Chat ready.');
    loadTawkWidget(config.body.embedUrl);
  }

  async function openLibrary() {
    showLibrary();
    setLibraryStatus('Loading document library…');

    var kbUrl = DEFAULT_KB_URL;
    var config = await apiGet('/api/tawk/config');
    if (config.ok && config.body && config.body.knowledgeBaseUrl) {
      kbUrl = config.body.knowledgeBaseUrl;
    }

    if (libraryExternal) {
      libraryExternal.href = kbUrl;
    }

    if (!libraryLoaded && libraryFrame) {
      libraryFrame.src = kbUrl;
      libraryLoaded = true;
    }

    setLibraryStatus(
      'Showing the Tawk Knowledge Base below. If the panel is blank (some browsers block the embed), use Open in new tab.',
    );
  }

  document.getElementById('open-chat').addEventListener('click', function () {
    openChat().catch(function (err) {
      setStatus(err && err.message ? err.message : 'Failed to open chat');
      showChat();
    });
  });
  document.getElementById('open-library').addEventListener('click', function () {
    openLibrary().catch(function (err) {
      setLibraryStatus(err && err.message ? err.message : 'Failed to open document library');
      showLibrary();
    });
  });
  document.getElementById('back-home').addEventListener('click', showHome);
  document.getElementById('back-home-library').addEventListener('click', showHome);
  document.getElementById('close-home').addEventListener('click', closeQuickView);
  document.getElementById('close-chat').addEventListener('click', closeQuickView);
  document.getElementById('close-library').addEventListener('click', closeQuickView);
})();
