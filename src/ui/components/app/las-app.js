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

  postToParent({ type: 'atrium.quickView.ready' });

  var chatErrorEl = document.getElementById('chat-error');
  var outOfHoursEl = document.getElementById('chat-out-of-hours');
  var oohLeadEl = document.getElementById('chat-ooh-lead');
  var documentsHost = document.getElementById('documents-host');
  var tawkLoaded = false;
  var tawkForcedOffline = false;
  var chatLoading = false;
  var lastHoursStatus = null;

  var documentsEnabled =
    window.LasDocuments && typeof window.LasDocuments.hasDocuments === 'function'
      ? window.LasDocuments.hasDocuments()
      : typeof DOCUMENT_CATALOGUE !== 'undefined' &&
        catalogueHasDocuments(DOCUMENT_CATALOGUE);

  if (!documentsEnabled && documentsHost) {
    documentsHost.hidden = true;
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

  function showOutOfHours(status) {
    lastHoursStatus = status || lastHoursStatus || getChatHoursStatus();
    var hours = lastHoursStatus;
    if (oohLeadEl) {
      var next = hours.nextChangeText || '';
      if (hours.tawkOfflineDuringHours) {
        oohLeadEl.textContent =
          "We're currently offline. Advisors are not available right now — please try again shortly, or during the hours below.";
      } else if (next.indexOf('opens ') === 0) {
        oohLeadEl.textContent = "We're currently offline. Live chat " + next + '.';
      } else {
        oohLeadEl.textContent = "We're currently offline.";
      }
    }
    if (outOfHoursEl) outOfHoursEl.hidden = false;
  }

  function hideOutOfHours() {
    if (outOfHoursEl) outOfHoursEl.hidden = true;
  }

  function concealTawkChat() {
    try {
      if (window.Tawk_API) {
        if (typeof window.Tawk_API.minimize === 'function') {
          window.Tawk_API.minimize();
        }
        if (typeof window.Tawk_API.hideWidget === 'function') {
          window.Tawk_API.hideWidget();
        }
      }
    } catch (err) {
      /* ignore */
    }
  }

  function applyTawkOfflineSafetyNet(status) {
    if (typeof FORCE_CHAT_OPEN !== 'undefined' && FORCE_CHAT_OPEN) return;
    if (status !== 'offline') return;
    tawkForcedOffline = true;
    var hours = getChatHoursStatus();
    showOutOfHours({
      isOpen: false,
      statusText: "We're offline",
      nextChangeText: hours.isOpen ? '' : hours.nextChangeText,
      tawkOfflineDuringHours: hours.isOpen,
    });
    concealTawkChat();
  }

  /**
   * Same mode as https://lettingsadviceservice.co.uk/livechat:
   * Inline floating bubble on the Documents page (no Chat tab, no Tawk_API.embedded).
   * Embedded mode on Julie's Inline widget IDs collapses the composer and blocks sends.
   */
  function loadTawkWidget(embedUrl) {
    if (tawkLoaded) return;
    tawkLoaded = true;

    var forceOpen = typeof FORCE_CHAT_OPEN !== 'undefined' && FORCE_CHAT_OPEN;

    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();
    // Local dogfood: let Tawk auto-start so the Inline bubble appears without
    // racing start()/showWidget against an offline status.
    window.Tawk_API.autoStart = forceOpen ? true : false;

    window.Tawk_API.onStatusChange = function (status) {
      applyTawkOfflineSafetyNet(status);
    };

    window.Tawk_API.onLoad = function () {
      var status = null;
      try {
        if (typeof window.Tawk_API.getStatus === 'function') {
          status = window.Tawk_API.getStatus();
        }
      } catch (err) {
        status = null;
      }

      if (status === 'offline' && !forceOpen) {
        applyTawkOfflineSafetyNet('offline');
        return;
      }

      try {
        if (!forceOpen && typeof window.Tawk_API.start === 'function') {
          window.Tawk_API.start();
        }
      } catch (err) {
        /* ignore */
      }

      try {
        if (typeof window.Tawk_API.showWidget === 'function') {
          window.Tawk_API.showWidget();
        }
      } catch (err) {
        /* ignore */
      }

      // Local dogfood: open the panel so chat is obvious (bubble alone is easy to miss).
      if (forceOpen) {
        try {
          if (typeof window.Tawk_API.maximize === 'function') {
            window.Tawk_API.maximize();
          }
        } catch (err) {
          /* ignore */
        }
      }
    };

    var script = document.createElement('script');
    script.async = true;
    script.src = embedUrl;
    script.charset = 'UTF-8';
    script.setAttribute('crossorigin', '*');
    document.body.appendChild(script);
  }

  async function ensureChat() {
    if (chatLoading) return;
    chatLoading = true;
    setChatError('');

    try {
      var hours = getChatHoursStatus();
      lastHoursStatus = hours;

      if (!hours.isOpen || tawkForcedOffline) {
        showOutOfHours(
          tawkForcedOffline
            ? {
                isOpen: false,
                statusText: "We're offline",
                nextChangeText: hours.isOpen ? '' : hours.nextChangeText,
                tawkOfflineDuringHours: hours.isOpen,
              }
            : hours,
        );
        concealTawkChat();
        return;
      }

      hideOutOfHours();

      if (tawkLoaded) {
        try {
          if (typeof window.Tawk_API.showWidget === 'function') {
            window.Tawk_API.showWidget();
          }
        } catch (err) {
          /* ignore */
        }
        return;
      }

      var config = await apiGet('/api/tawk/config');
      if (!config.ok || !config.body || !config.body.ok || !config.body.embedUrl) {
        setChatError(
          (config.body && config.body.message) ||
            'Chat is not configured yet. Set TAWK_PROPERTY_ID and TAWK_WIDGET_ID in Hosting runtime secrets (or local .env).',
        );
        return;
      }

      hours = getChatHoursStatus();
      lastHoursStatus = hours;
      if (!hours.isOpen) {
        showOutOfHours(hours);
        return;
      }

      loadTawkWidget(config.body.embedUrl);
    } catch (err) {
      setChatError(err && err.message ? err.message : 'Failed to open chat');
    } finally {
      chatLoading = false;
    }
  }

  ensureChat().catch(function (err) {
    setChatError(err && err.message ? err.message : 'Failed to open chat');
  });
})();
