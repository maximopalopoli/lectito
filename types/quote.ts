export type QuoteColor = 'yellow' | 'blue' | 'green' | 'pink' | 'purple';

export interface Quote {
  id: string;
  bookId: string;
  text: string;
  pageNumber: number | null;
  note: string | null;
  color: QuoteColor;
  createdAt: string; // ISO date
}
