/**
 * Documents tab: category filter cards + searchable list.
 * Expects DOCUMENT_CATALOGUE + helpers from bootstrap / documents-helpers.js.
 */
(function () {
  var root = document.getElementById('documents-root');
  if (!root) return;

  var catalogue =
    typeof DOCUMENT_CATALOGUE !== 'undefined' && Array.isArray(DOCUMENT_CATALOGUE)
      ? DOCUMENT_CATALOGUE
      : [];

  var CATS = ['guides', 'templates', 'videos'];

  var state = {
    category: firstCategoryWithDocs(),
    query: '',
    playingVideoId: null,
  };
  var searchDebounceTimer = null;

  function clearSearchDebounce() {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = null;
    }
  }

  function applySearchFromInput(input) {
    state.query = (input && input.value) || '';
    refreshListResults();
  }

  function firstCategoryWithDocs() {
    for (var i = 0; i < CATS.length; i++) {
      if (countDocumentsByCategory(catalogue, CATS[i]) > 0) return CATS[i];
    }
    return CATS[0];
  }

  function categoryMeta(category) {
    var labels = DOCUMENT_CATEGORY_LABELS || {};
    return {
      category: category,
      label: labels[category] || category,
      count: countDocumentsByCategory(catalogue, category),
    };
  }

  function openUrl(url, download) {
    var href = String(url || '').trim();
    if (!href) return;
    if (download) {
      var a = document.createElement('a');
      a.href = href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.setAttribute('download', '');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
    window.open(href, '_blank', 'noopener,noreferrer');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/'/g, '&#39;');
  }

  function filterCardsHtml() {
    return CATS.map(function (cat) {
      var meta = categoryMeta(cat);
      var inactive = meta.count === 0;
      var isActive = !inactive && state.category === meta.category;
      var classes = 'card card__filters' + (inactive ? ' card__filters--inactive' : '');
      var attrs = inactive
        ? 'aria-disabled="true" tabindex="-1"'
        : 'href="javascript:void(0);" data-category="' +
          meta.category +
          '"' +
          (isActive ? ' aria-current="true"' : '');
      var tag = inactive ? 'div' : 'a';
      return (
        '<div class="grid-span-12 grid-span-sm-4">' +
        '<' +
        tag +
        ' class="' +
        classes +
        '" ' +
        attrs +
        '>' +
        '<div class="card__count">' +
        meta.count +
        '</div>' +
        '<div class="card__title">' +
        meta.label +
        '</div>' +
        '</' +
        tag +
        '>' +
        '</div>'
      );
    }).join('');
  }

  function rowActionsHtml(item) {
    var hasUrl = !!(item.url && String(item.url).trim());
    if (!hasUrl) {
      return '<span class="u-text--small u-text-color--grey">Link pending</span>';
    }

    if (item.category === 'videos') {
      if (state.playingVideoId === item.id) {
        return (
          '<div class="button__group-item">' +
          '<button type="button" class="button button--ghost button--small button--icon button--icon-only" data-action="watch-close" data-id="' +
          escapeAttr(item.id) +
          '" aria-label="Close video">' +
          '<span class="icon" aria-hidden="true"><svg class="icon-cross"><use href="#icon-cross"></use></svg></span>' +
          '</button>' +
          '</div>'
        );
      }
      if (!youtubeEmbedUrl(item.url)) {
        return '<span class="u-text--small u-text-color--grey">Link pending</span>';
      }
      return (
        '<div class="button__group-item">' +
        '<button type="button" class="button button--ghost button--small button--icon" data-action="watch-now" data-id="' +
        escapeAttr(item.id) +
        '">' +
        '<span class="icon" aria-hidden="true"><svg class="icon-video"><use href="#icon-video"></use></svg></span>' +
        'Watch</button>' +
        '</div>'
      );
    }

    var label = item.category === 'templates' ? 'Download' : 'View';
    return (
      '<div class="button__group-item">' +
      '<button type="button" class="button button--ghost button--small" data-action="view" data-id="' +
      escapeAttr(item.id) +
      '">' +
      label +
      '</button>' +
      '</div>'
    );
  }

  function inlineVideoHtml(item) {
    var embed = youtubeEmbedUrl(item.url);
    if (!embed) return '';
    return (
      '<td class="documents-row-player" colspan="2">' +
      '<div class="documents-video-frame" id="documents-video-player">' +
      '<iframe title="' +
      escapeAttr(item.title) +
      '" src="' +
      escapeAttr(embed) +
      '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>' +
      '</div>' +
      '</td>'
    );
  }

  function listRowsHtml(filtered) {
    if (!filtered.length) {
      return (
        '<p class="u-text--small u-text-color--grey u-margin-top--10 u-margin-bottom--none" id="documents-empty">' +
        (state.query
          ? 'No documents match "' + escapeHtml(state.query) + '".'
          : 'No documents in this category yet.') +
        '</p>'
      );
    }

    return (
      '<table class="compact__table compact__table--narrow" id="documents-table">' +
      '<tbody>' +
      filtered
        .map(function (item) {
          var playing = state.playingVideoId === item.id;
          return (
            '<tr' +
            (playing ? ' class="is-playing"' : '') +
            '>' +
            '<td class="documents-row-title" title="' +
            escapeAttr(item.title) +
            '">' +
            escapeHtml(item.title) +
            '</td>' +
            '<td class="documents-row-actions u-text-align--right">' +
            '<div class="button__group u-margin-bottom--none u-flex--end">' +
            rowActionsHtml(item) +
            '</div>' +
            '</td>' +
            (playing ? inlineVideoHtml(item) : '') +
            '</tr>'
          );
        })
        .join('') +
      '</tbody></table>'
    );
  }

  function bindCategoryCards() {
    root.querySelectorAll('[data-category]').forEach(function (el) {
      el.addEventListener('click', function (event) {
        event.preventDefault();
        if (el.getAttribute('aria-disabled') === 'true') return;
        var category = el.getAttribute('data-category');
        if (!category || category === state.category) return;
        state.category = category;
        state.query = '';
        state.playingVideoId = null;
        render();
      });
    });
  }

  function bindVideoPlayer() {
    var player = document.getElementById('documents-video-player');
    if (player && typeof player.scrollIntoView === 'function') {
      player.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function paintResults(filtered) {
    var results = document.getElementById('documents-results');
    if (results) results.innerHTML = listRowsHtml(filtered);
    bindListActions(filtered);
    bindVideoPlayer();
  }

  function bindListActions(filtered) {
    var byId = {};
    filtered.forEach(function (item) {
      byId[item.id] = item;
    });
    root.querySelectorAll('[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        var action = btn.getAttribute('data-action');
        var item = byId[id];
        if (!item) return;
        if (action === 'watch-now') {
          state.playingVideoId = item.id;
          paintResults(filtered);
          return;
        }
        if (action === 'watch-close') {
          state.playingVideoId = null;
          paintResults(filtered);
          return;
        }
        openUrl(item.url, false);
      });
    });
  }

  function refreshListResults() {
    var inCategory = filterDocumentsByCategory(catalogue, state.category);
    var filtered = searchDocumentsByTitle(inCategory, state.query);
    if (
      state.playingVideoId &&
      !filtered.some(function (item) {
        return item.id === state.playingVideoId;
      })
    ) {
      state.playingVideoId = null;
    }
    paintResults(filtered);
    return filtered;
  }

  function render() {
    var inCategory = filterDocumentsByCategory(catalogue, state.category);
    var filtered = searchDocumentsByTitle(inCategory, state.query);

    clearSearchDebounce();

    root.innerHTML =
      '<section class="page__section page__section--narrow">' +
      '<div class="grid grid--12 grid-gap-md" id="documents-category-grid">' +
      filterCardsHtml() +
      '</div>' +
      '<form class="form form--inline form--slimmer form--full-width u-margin-top--10" id="documents-search-form" novalidate>' +
      '<div class="form__grid">' +
      '<div class="form__grid-element">' +
      '<input id="documents-search" type="search" placeholder="Search by name" aria-label="Search by name" value="' +
      escapeAttr(state.query) +
      '">' +
      '</div>' +
      '</div>' +
      '</form>' +
      '<div id="documents-results">' +
      listRowsHtml(filtered) +
      '</div>' +
      '</section>';

    bindCategoryCards();

    var form = document.getElementById('documents-search-form');
    var input = document.getElementById('documents-search');
    if (form && input) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        clearSearchDebounce();
        applySearchFromInput(input);
      });
      input.addEventListener('blur', function () {
        clearSearchDebounce();
        applySearchFromInput(input);
      });
      input.addEventListener('input', function () {
        clearSearchDebounce();
        searchDebounceTimer = setTimeout(function () {
          searchDebounceTimer = null;
          applySearchFromInput(input);
        }, 500);
      });
    }

    bindListActions(filtered);
    bindVideoPlayer();
  }

  window.LasDocuments = {
    mount: render,
    hasDocuments: function () {
      return catalogueHasDocuments(catalogue);
    },
  };

  render();
})();
