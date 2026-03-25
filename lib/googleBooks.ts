import type { BookSearchResult } from '@/types';

// --- Types for Google Books API responses ---

interface GoogleBooksResponse {
  totalItems: number;
  items?: GoogleBooksVolume[];
}

interface GoogleBooksVolume {
  volumeInfo: {
    title?: string;
    authors?: string[];
    pageCount?: number;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    industryIdentifiers?: {
      type: 'ISBN_10' | 'ISBN_13' | string;
      identifier: string;
    }[];
  };
}

// --- API functions ---

const BASE_URL = 'https://www.googleapis.com/books/v1/volumes';

function volumeToBookSearchResult(volume: GoogleBooksVolume): BookSearchResult | null {
  const info = volume.volumeInfo;
  if (!info.title) return null;

  const isbn13 = info.industryIdentifiers?.find((id) => id.type === 'ISBN_13')?.identifier ?? null;
  const isbn10 = info.industryIdentifiers?.find((id) => id.type === 'ISBN_10')?.identifier ?? null;

  // Google Books thumbnails come as http — upgrade to https
  const thumbnail = info.imageLinks?.thumbnail?.replace('http://', 'https://') ?? null;

  return {
    title: info.title,
    authors: info.authors ?? ['Autor desconocido'],
    coverUrl: thumbnail,
    isbn13,
    isbn10,
    pageCount: info.pageCount ?? 0,
  };
}

export async function searchBooksByText(query: string): Promise<BookSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error('La búsqueda no puede estar vacía');
  }

  const url = `${BASE_URL}?q=${encodeURIComponent(trimmed)}&maxResults=10`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Error al buscar "${trimmed}" (HTTP ${res.status})`);
  }

  const data: GoogleBooksResponse = await res.json();

  if (!data.items || data.items.length === 0) {
    return [];
  }

  return data.items
    .map(volumeToBookSearchResult)
    .filter((book): book is BookSearchResult => book !== null);
}
