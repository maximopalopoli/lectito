import { looksLikeISBN, shouldLiveSearch } from '../bookSearch';

test('recognizes ISBN-10 and ISBN-13 with or without dashes', () => {
  expect(looksLikeISBN('978-84-376-0494-7')).toBe(true);
  expect(looksLikeISBN('8437604947')).toBe(true);
  expect(looksLikeISBN('97884')).toBe(false);
});

test('live search waits for a few characters', () => {
  expect(shouldLiveSearch('')).toBe(false);
  expect(shouldLiveSearch('bo')).toBe(false);
  expect(shouldLiveSearch('bor')).toBe(true);
  expect(shouldLiveSearch('  ficciones ')).toBe(true);
});

test('live search skips half-typed ISBNs but runs on complete ones', () => {
  expect(shouldLiveSearch('978843')).toBe(false);
  expect(shouldLiveSearch('978-84-376')).toBe(false);
  expect(shouldLiveSearch('9788437604947')).toBe(true);
});
