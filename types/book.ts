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
  completedAt: string | null; // ISO date, set when status → DONE
  currentPage: number;
  epubUri: string | null;
  rating: number | null;    // 1-5 stars
  review: string | null;    // free-text personal review
  tags: string[];           // custom user tags (genre, theme, etc.)
}

export type BookSearchResult = Omit<Book, 'id' | 'addedAt' | 'completedAt' | 'currentPage' | 'status' | 'epubUri'>;
