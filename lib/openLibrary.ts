import type { Book } from '@/types';

// --- Types for Open Library API responses ---

interface OpenLibraryEdition {
  title: string;
  authors?: { key: string }[];
  author?: string[];
  number_of_pages?: number;
  isbn_13?: string[];
  isbn_10?: string[];
  covers?: number[];
}

interface OpenLibraryAuthor {
  name: string;
}

// --- Public types ---

export type BookSearchResult = Omit<Book, 'id' | 'addedAt' | 'currentPage' | 'status'>;

// --- API functions ---

const BASE_URL = 'https://openlibrary.org';
const COVERS_URL = 'https://covers.openlibrary.org/b/isbn';

function normalizeISBN(isbn: string): string {
  return isbn.replace(/[-\s]/g, '');
}

async function fetchAuthorName(authorKey: string): Promise<string> {
  const res = await fetch(`${BASE_URL}${authorKey}.json`);
  if (!res.ok) return 'Autor desconocido';
  const data: OpenLibraryAuthor = await res.json();
  return data.name ?? 'Autor desconocido';
}

async function resolveAuthors(edition: OpenLibraryEdition): Promise<string[]> {
  // Case 1: authors with key references → fetch names in parallel
  if (edition.authors && edition.authors.length > 0) {
    const names = await Promise.all(
      edition.authors.map((a) => fetchAuthorName(a.key)),
    );
    return names;
  }

  // Case 2: plain author strings
  if (edition.author && edition.author.length > 0) {
    return edition.author;
  }

  return ['Autor desconocido'];
}

export async function fetchBookByISBN(isbn: string): Promise<BookSearchResult> {
  const normalized = normalizeISBN(isbn);
  if (!normalized) {
    throw new Error('ISBN vacío');
  }

  const res = await fetch(`${BASE_URL}/isbn/${normalized}.json`);

  if (res.status === 404) {
    throw new Error(`No se encontró un libro con ISBN ${normalized}`);
  }
  if (!res.ok) {
    throw new Error(`Error al buscar ISBN ${normalized} (HTTP ${res.status})`);
  }

  const edition: OpenLibraryEdition = await res.json();

  if (!edition.title) {
    throw new Error(`La respuesta para ISBN ${normalized} no contiene título`);
  }

  const authors = await resolveAuthors(edition);

  return {
    title: edition.title,
    authors,
    coverUrl: `${COVERS_URL}/${normalized}-L.jpg`,
    isbn13: edition.isbn_13?.[0] ?? null,
    isbn10: edition.isbn_10?.[0] ?? null,
    pageCount: edition.number_of_pages ?? 0,
  };
}
