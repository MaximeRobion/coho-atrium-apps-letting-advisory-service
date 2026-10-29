import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DOCUMENT_CATALOGUE,
  catalogueHasDocuments,
  countByCategory,
  filterByCategory,
  searchByTitle,
  type DocumentItem,
} from '../src/documents/catalogue.js';

test('catalogue includes scraped guides, free templates, and video placeholders', () => {
  assert.ok(DOCUMENT_CATALOGUE.length > 0);
  assert.equal(countByCategory(DOCUMENT_CATALOGUE, 'guides'), 67);
  assert.equal(countByCategory(DOCUMENT_CATALOGUE, 'templates'), 48);
  assert.equal(countByCategory(DOCUMENT_CATALOGUE, 'videos'), 3);
  assert.ok(catalogueHasDocuments(DOCUMENT_CATALOGUE));
});

test('filterByCategory returns only the requested category', () => {
  const guides = filterByCategory(DOCUMENT_CATALOGUE, 'guides');
  assert.ok(guides.every((item) => item.category === 'guides'));
  assert.equal(guides.length, 67);

  const templates = filterByCategory(DOCUMENT_CATALOGUE, 'templates');
  assert.ok(templates.every((item) => item.category === 'templates'));
  assert.equal(templates.length, 48);
});

test('searchByTitle is case-insensitive and trims', () => {
  const sample: DocumentItem[] = [
    { id: '1', title: 'Empty Dwelling Management Orders', category: 'guides', url: 'https://example.com/a' },
    { id: '2', title: 'Pet policy template', category: 'templates', url: 'https://example.com/b' },
    { id: '3', title: 'Placeholder: Ask the Expert', category: 'videos', url: '' },
  ];

  assert.equal(searchByTitle(sample, '').length, 3);
  assert.equal(searchByTitle(sample, '  ').length, 3);
  assert.deepEqual(
    searchByTitle(sample, 'empty dwelling').map((item) => item.id),
    ['1'],
  );
  assert.deepEqual(
    searchByTitle(sample, 'PET').map((item) => item.id),
    ['2'],
  );
  assert.deepEqual(
    searchByTitle(sample, 'placeholder').map((item) => item.id),
    ['3'],
  );
  assert.equal(searchByTitle(sample, 'zzzz-missing').length, 0);
});

test('catalogueHasDocuments is false for an empty list', () => {
  assert.equal(catalogueHasDocuments([]), false);
});

test('guides and templates have view URLs; video placeholders may be empty', () => {
  const guides = filterByCategory(DOCUMENT_CATALOGUE, 'guides');
  const templates = filterByCategory(DOCUMENT_CATALOGUE, 'templates');
  assert.ok(guides.every((item) => item.title.trim().length > 0));
  assert.ok(templates.every((item) => item.title.trim().length > 0));
  assert.ok(guides.every((item) => item.url.trim().length > 0));
  assert.ok(templates.every((item) => item.url.trim().length > 0));

  const videos = filterByCategory(DOCUMENT_CATALOGUE, 'videos');
  assert.ok(videos.every((item) => /placeholder/i.test(item.title)));
});
