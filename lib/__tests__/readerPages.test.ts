import { addPageSample, charsPerPage, estimatePages } from '@/lib/readerPages';

describe('addPageSample', () => {
  it('ignores chapters too short to measure', () => {
    expect(addPageSample({}, 2, 300, 1)).toEqual({});
    expect(addPageSample({}, 2, 0, 5)).toEqual({});
  });

  it('ignores readings from a half-built layout', () => {
    // "About the Author" (3139 caracteres) informado en 128 páginas: ~25 caracteres por página.
    expect(addPageSample({}, 2, 3139, 128)).toEqual({});
  });

  it('replaces the previous reading of the same chapter', () => {
    const first = addPageSample({}, 4, 64000, 32);
    expect(first).toEqual({ 4: 2000 });
    expect(addPageSample(first, 4, 64000, 40)).toEqual({ 4: 1600 });
    expect(addPageSample(first, 5, 30000, 10)).toEqual({ 4: 2000, 5: 3000 });
  });
});

describe('charsPerPage', () => {
  it('is unknown without samples', () => {
    expect(charsPerPage({})).toBeNull();
  });

  it('uses the median so one odd chapter does not move it', () => {
    expect(charsPerPage({ 1: 2000, 2: 2100, 3: 300 })).toBe(2000);
    expect(charsPerPage({ 1: 2000, 2: 2200 })).toBe(2100);
  });
});

describe('estimatePages', () => {
  it('needs a sample, locations and a known position', () => {
    expect(estimatePages(0.5, 60, null)).toBeNull();
    expect(estimatePages(0.5, 0, 1024)).toBeNull();
    expect(estimatePages(-1, 60, 1024)).toBeNull();
  });

  it('doubles the pages when half as much text fits on a page', () => {
    expect(estimatePages(0.5, 60, 1024)).toEqual({ page: 31, total: 60 });
    expect(estimatePages(0.5, 60, 512)).toEqual({ page: 61, total: 120 });
  });

  it('starts at page 1 and ends on the last page', () => {
    expect(estimatePages(0, 60, 2048)).toEqual({ page: 1, total: 30 });
    expect(estimatePages(1, 60, 2048)).toEqual({ page: 30, total: 30 });
  });
});
