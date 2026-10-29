/**
 * Client-side catalogue helpers (mirrors src/documents/catalogue.ts).
 * DOCUMENT_CATALOGUE is injected by the server bootstrap.
 */

function filterDocumentsByCategory(items, category) {
  var list = items || [];
  return list.filter(function (item) {
    return item && item.category === category;
  });
}

function searchDocumentsByTitle(items, query) {
  var list = items || [];
  var q = String(query || '')
    .trim()
    .toLowerCase();
  if (!q) return list.slice();
  return list.filter(function (item) {
    return item && String(item.title || '').toLowerCase().indexOf(q) !== -1;
  });
}

function catalogueHasDocuments(items) {
  var list = items || [];
  return list.length > 0;
}

function countDocumentsByCategory(items, category) {
  return filterDocumentsByCategory(items, category).length;
}

var DOCUMENT_CATEGORY_LABELS = {
  guides: 'Guides',
  templates: 'Templates',
  videos: 'Videos',
};
