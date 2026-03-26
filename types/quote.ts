export type QuoteColor = 'yellow' | 'blue' | 'green' | 'pink' | 'purple';

export interface Quote {
  id: string;
  bookId: string;
  text: string;
  pageNumber: number | null;
  note: string | null;
  color: QuoteColor;
  cfi: string | null; // epub.js CFI location, null for manual quotes
  createdAt: string; // ISO date
}
