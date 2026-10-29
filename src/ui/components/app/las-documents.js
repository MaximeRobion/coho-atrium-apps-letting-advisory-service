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

  function listRowsHtml(filtered) {
    if (!filtered.length) {
      return (
        '<div class="form__message form__message--notification u-margin-top--10" id="documents-empty">' +
        '<div class="form__message-text u-padding--10">' +
        (state.query
          ? 'No documents match "' + escapeHtml(state.query) + '".'
          : 'No documents in this category yet.') +
        '</div>' +
        '</div>'
      );
    }

    return (
      '<table class="compact__table compact__table--narrow" id="documents-table">' +
      '<thead><tr>' +
      '<th class="width-f-350 one-line">Title</th>' +
      '<th class="width-f-100 u-text-align--right">Actions</th>' +
      '</tr></thead><tbody>' +
      filtered
        .map(function (item) {
          var hasUrl = !!(item.url && String(item.url).trim());
          var viewBtn = hasUrl
            ? '<div class="button__group-item">' +
              '<button type="button" class="button button--secondary button--small" data-action="view" data-id="' +
              escapeAttr(item.id) +
              '">View</button>' +
              '</div>'
            : '';
          var downloadBtn = hasUrl
            ? '<div class="button__group-item">' +
              '<button type="button" class="button button--ghost button--small button--icon" data-action="download" data-id="' +
              escapeAttr(item.id) +
              '">' +
              '<span class="icon" aria-hidden="true"><svg class="icon-download"><use href="#icon-download"></use></svg></span>' +
              'Download</button>' +
              '</div>'
            : '<span class="u-text--small u-text-color--grey">Link pending</span>';
          return (
            '<tr>' +
            '<td class="documents-row-title">' +
            escapeHtml(item.title) +
            '</td>' +
            '<td class="documents-row-actions u-text-align--right">' +
            '<div class="button__group u-margin-bottom--none u-flex--end">' +
            viewBtn +
            downloadBtn +
            '</div>' +
            '</td>' +
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
        render();
      });
    });
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
        openUrl(item.url, action === 'download');
      });
    });
  }

  function refreshListResults() {
    var inCategory = filterDocumentsByCategory(catalogue, state.category);
    var filtered = searchDocumentsByTitle(inCategory, state.query);
    var results = document.getElementById('documents-results');
    if (!results) return filtered;
    results.innerHTML = listRowsHtml(filtered);
    bindListActions(filtered);
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
  }

  window.LasDocuments = {
    mount: render,
    hasDocuments: function () {
      return catalogueHasDocuments(catalogue);
    },
  };

  render();
})();
