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

/** Extract a YouTube video id from watch / youtu.be / shorts / embed URLs. */
function youtubeVideoId(url) {
  var raw = String(url || '').trim();
  if (!raw) return '';
  try {
    var parsed = new URL(raw);
    var host = (parsed.hostname || '').replace(/^www\./, '').toLowerCase();
    if (host === 'youtu.be') {
      return (parsed.pathname || '').split('/').filter(Boolean)[0] || '';
    }
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      if (parsed.searchParams.get('v')) return parsed.searchParams.get('v') || '';
      var parts = (parsed.pathname || '').split('/').filter(Boolean);
      if (parts[0] === 'shorts' || parts[0] === 'embed' || parts[0] === 'live') {
        return parts[1] || '';
      }
    }
  } catch (err) {
    /* ignore invalid URL */
  }
  return '';
}

function youtubeEmbedUrl(url) {
  var id = youtubeVideoId(url);
  if (!id) return '';
  // autoplay=1: iframe is only mounted after the user clicks Watch (user gesture).
  return (
    'https://www.youtube-nocookie.com/embed/' +
    encodeURIComponent(id) +
    '?rel=0&autoplay=1'
  );
}

function youtubeWatchUrl(url) {
  var id = youtubeVideoId(url);
  if (id) return 'https://www.youtube.com/watch?v=' + encodeURIComponent(id);
  return String(url || '').trim();
}
