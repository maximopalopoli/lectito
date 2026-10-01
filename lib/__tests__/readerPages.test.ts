import { estimatePages, updatePageSample } from '@/lib/readerPages';

describe('updatePageSample', () => {
  it('ignores chapters too short to measure', () => {
    expect(updatePageSample(null, 300, 1)).toBeNull();
    expect(updatePageSample(null, 0, 5)).toBeNull();
  });

  it('keeps the sample from the longest chapter', () => {
    const long = updatePageSample(null, 20000, 20);
    expect(long).toEqual({ charsPerPage: 1000, pages: 20 });
    expect(updatePageSample(long, 4000, 5)).toBe(long);
    expect(updatePageSample(long, 45000, 30)).toEqual({ charsPerPage: 1500, pages: 30 });
  });
});

describe('estimatePages', () => {
  it('needs a sample, locations and a known position', () => {
    const sample = { charsPerPage: 1024, pages: 10 };
    expect(estimatePages(0.5, 60, null)).toBeNull();
    expect(estimatePages(0.5, 0, sample)).toBeNull();
    expect(estimatePages(-1, 60, sample)).toBeNull();
  });

  it('doubles the pages when half as much text fits on a page', () => {
    expect(estimatePages(0.5, 60, { charsPerPage: 1024, pages: 10 })).toEqual({ page: 31, total: 60 });
    expect(estimatePages(0.5, 60, { charsPerPage: 512, pages: 10 })).toEqual({ page: 61, total: 120 });
  });

  it('starts at page 1 and ends on the last page', () => {
    const sample = { charsPerPage: 2048, pages: 10 };
    expect(estimatePages(0, 60, sample)).toEqual({ page: 1, total: 30 });
    expect(estimatePages(1, 60, sample)).toEqual({ page: 30, total: 30 });
  });
});
