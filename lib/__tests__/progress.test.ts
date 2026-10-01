import { readingProgress } from '../progress';
import type { Book } from '@/types';

const book: Book = {
  id: 'b1',
  title: 'Meditaciones',
  authors: ['Marco Aurelio'],
  coverUrl: null,
  isbn13: null,
  isbn10: null,
  pageCount: 200,
  status: 'READING',
  addedAt: '2026-01-01T00:00:00.000Z',
  completedAt: null,
  currentPage: 50,
  epubUri: null,
  rating: null,
  review: null,
  tags: [],
};

test('paper books use pages', () => {
  expect(readingProgress(book)).toEqual({ percent: 25, chapter: null, byPercent: false });
});

test('ePub books prefer the reader position percent and chapter', () => {
  const epub = { ...book, epubUri: 'file://meditaciones.epub', pageCount: 518, currentPage: 24 };
  const position = { cfi: 'epubcfi(/6/8)', updatedAt: '2026-01-02T00:00:00.000Z', percent: 0.374, chapter: ' Libro II ' };
  expect(readingProgress(epub, position)).toEqual({ percent: 37, chapter: 'Libro II', byPercent: true });
});

test('ePub books without a stored percent fall back to pages, still shown as a percent', () => {
  const epub = { ...book, epubUri: 'file://x.epub', pageCount: 518, currentPage: 259 };
  expect(readingProgress(epub, { cfi: 'x', updatedAt: '' })).toEqual({ percent: 50, chapter: null, byPercent: true });
});

test('progress is clamped to 0-100', () => {
  expect(readingProgress({ ...book, currentPage: 260 }).percent).toBe(100);
});
