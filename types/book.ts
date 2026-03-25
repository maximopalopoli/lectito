export type BookStatus = 'TBR' | 'READING' | 'DONE' | 'DNF';

export interface Book {
  id: string;
  title: string;
  authors: string[];
  coverUrl: string | null;
  isbn13: string | null;
  isbn10: string | null;
  pageCount: number;
  status: BookStatus;
  addedAt: string; // ISO date
  currentPage: number;
}

export type BookSearchResult = Omit<Book, 'id' | 'addedAt' | 'currentPage' | 'status'>;
