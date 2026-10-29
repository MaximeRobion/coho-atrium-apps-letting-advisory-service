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

  var TAB_LIBRARY = 'library';
  var TAB_CHAT = 'chat';
  var navLibrary = document.getElementById('nav-library');
  var navChat = document.getElementById('nav-chat');
  var panelLibrary = document.getElementById('panel-library');
  var panelChat = document.getElementById('panel-chat');
  var chatErrorEl = document.getElementById('chat-error');
  var embedHost = document.getElementById('tawk-embed');
  var libraryFrame = document.getElementById('library-frame');
  var tawkLoaded = false;
  var libraryLoaded = false;
  var chatLoading = false;
  var DEFAULT_KB_URL = 'https://lettingadviceservice.tawk.help';

  function tabStorageKey() {
    return 'las:' + CONNECTION_REFERENCE + ':activeTab';
  }

  function readStoredTab() {
    try {
      var raw = localStorage.getItem(tabStorageKey());
      if (raw === TAB_CHAT) return TAB_CHAT;
    } catch (e) {
      /* private mode / blocked storage */
    }
    return TAB_LIBRARY;
  }

  function writeStoredTab(tab) {
    if (tab !== TAB_LIBRARY && tab !== TAB_CHAT) return;
    try {
      localStorage.setItem(tabStorageKey(), tab);
    } catch (e) {
      /* ignore */
    }
  }

  function setChatError(text) {
    if (!chatErrorEl) return;
    if (text) {
      chatErrorEl.hidden = false;
      chatErrorEl.textContent = text;
    } else {
      chatErrorEl.hidden = true;
      chatErrorEl.textContent = '';
    }
  }

  function showTab(tab) {
    var onChat = tab === TAB_CHAT;
    writeStoredTab(onChat ? TAB_CHAT : TAB_LIBRARY);

    panelLibrary.hidden = onChat;
    panelChat.hidden = !onChat;
    navLibrary.setAttribute('aria-selected', onChat ? 'false' : 'true');
    navChat.setAttribute('aria-selected', onChat ? 'true' : 'false');
  }

  /**
   * Tawk embedded mode mounts into the element whose id equals Tawk_API.embedded.
   * It renames #tawk-embed to #tawk_<propertyId>. Size that host with [id^="tawk_"] CSS
   * (not #tawk-embed alone) or the widget collapses to the clipped bubble / tawk.link state.
   */
  function loadTawkWidget(embedUrl) {
    if (tawkLoaded || !embedHost) return;
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

  async function ensureLibrary() {
    if (libraryLoaded && libraryFrame && libraryFrame.getAttribute('src')) return;

    var kbUrl = DEFAULT_KB_URL;
    try {
      var config = await apiGet('/api/tawk/config');
      if (config.ok && config.body && config.body.knowledgeBaseUrl) {
        kbUrl = config.body.knowledgeBaseUrl;
      }
    } catch (err) {
      /* keep default KB URL */
    }

    if (libraryFrame) {
      libraryFrame.src = kbUrl;
      libraryLoaded = true;
    }
  }

  async function ensureChat() {
    if (tawkLoaded || chatLoading) return;
    chatLoading = true;
    setChatError('');

    try {
      var config = await apiGet('/api/tawk/config');
      if (!config.ok || !config.body || !config.body.ok || !config.body.embedUrl) {
        setChatError(
          (config.body && config.body.message) ||
            'Chat is not configured yet. Ask COHO to set TAWK_PROPERTY_ID and TAWK_WIDGET_ID on Hosting.',
        );
        return;
      }
      loadTawkWidget(config.body.embedUrl);
    } catch (err) {
      setChatError(err && err.message ? err.message : 'Failed to open chat');
    } finally {
      chatLoading = false;
    }
  }

  function openLibraryTab() {
    showTab(TAB_LIBRARY);
    ensureLibrary().catch(function () {
      /* KB iframe still uses default URL */
    });
  }

  function openChatTab() {
    showTab(TAB_CHAT);
    ensureChat().catch(function (err) {
      setChatError(err && err.message ? err.message : 'Failed to open chat');
    });
  }

  navLibrary.addEventListener('click', function (event) {
    event.preventDefault();
    openLibraryTab();
  });
  navChat.addEventListener('click', function (event) {
    event.preventDefault();
    openChatTab();
  });

  if (readStoredTab() === TAB_CHAT) {
    openChatTab();
  } else {
    openLibraryTab();
  }
})();
