import type { BookSearchResult } from '@/types';
import fetchWithTimeout from './fetchWithTimeout';

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
  alternate_names?: string[];
}

// --- API functions ---

const BASE_URL = 'https://openlibrary.org';
const COVERS_URL = 'https://covers.openlibrary.org/b/isbn';

function normalizeISBN(isbn: string): string {
  return isbn.replace(/[-\s]/g, '');
}

function isLatin(text: string): boolean {
  return /^[\u0000-\u024F\u1E00-\u1EFF\s\-'.,()\d]+$/.test(text);
}

async function fetchAuthorName(authorKey: string): Promise<string> {
  const res = await fetchWithTimeout(`${BASE_URL}${authorKey}.json`);
  if (!res.ok) return 'Autor desconocido';
  const data: OpenLibraryAuthor = await res.json();
  const name = data.name ?? 'Autor desconocido';

  // If name is in non-Latin script, try to find a Latin alternate name
  if (!isLatin(name) && data.alternate_names?.length) {
    const latinName = data.alternate_names.find(isLatin);
    if (latinName) return latinName;
  }

  return name;
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

// --- Types for Open Library Search API ---

interface OpenLibrarySearchResponse {
  docs: OpenLibrarySearchDoc[];
}

interface OpenLibrarySearchDoc {
  title: string;
  author_name?: string[];
  isbn?: string[];
  cover_i?: number;
  number_of_pages_median?: number;
}

const COVERS_BY_ID_URL = 'https://covers.openlibrary.org/b/id';

function searchDocToResult(doc: OpenLibrarySearchDoc): BookSearchResult | null {
  if (!doc.title) return null;

  const isbn13 = doc.isbn?.find((i) => i.length === 13) ?? null;
  const isbn10 = doc.isbn?.find((i) => i.length === 10) ?? null;

  return {
    title: doc.title,
    authors: doc.author_name ?? ['Autor desconocido'],
    coverUrl: doc.cover_i ? `${COVERS_BY_ID_URL}/${doc.cover_i}-L.jpg` : null,
    isbn13,
    isbn10,
    pageCount: doc.number_of_pages_median ?? 0,
  };
}

export async function searchBooksByText(query: string): Promise<BookSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    throw new Error('La búsqueda no puede estar vacía');
  }

  const url = `${BASE_URL}/search.json?q=${encodeURIComponent(trimmed)}&limit=10&fields=title,author_name,isbn,cover_i,number_of_pages_median`;
  const res = await fetchWithTimeout(url);

  if (!res.ok) {
    throw new Error(`Error al buscar "${trimmed}" (HTTP ${res.status})`);
  }

  const data: OpenLibrarySearchResponse = await res.json();

  return data.docs
    .map(searchDocToResult)
    .filter((book): book is BookSearchResult => book !== null);
}

export async function fetchBookByISBN(isbn: string): Promise<BookSearchResult> {
  const normalized = normalizeISBN(isbn);
  if (!normalized) {
    throw new Error('ISBN vacío');
  }

  const res = await fetchWithTimeout(`${BASE_URL}/isbn/${normalized}.json`);

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

  const hasCover = edition.covers && edition.covers.length > 0 && edition.covers[0] !== -1;

  return {
    title: edition.title,
    authors,
    coverUrl: hasCover ? `${COVERS_URL}/${normalized}-L.jpg` : null,
    isbn13: edition.isbn_13?.[0] ?? null,
    isbn10: edition.isbn_10?.[0] ?? null,
    pageCount: edition.number_of_pages ?? 0,
  };
}
