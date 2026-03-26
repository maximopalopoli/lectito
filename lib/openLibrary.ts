import type { BookSearchResult, RecommendationCandidate } from '@/types';
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
  key?: string;
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

// --- Subject and recommendation helpers ---

const SUBJECTS_BLOCKLIST = new Set([
  'fiction',
  'literature',
  'accessible book',
  'protected daisy',
  'large type books',
  'juvenile fiction',
  'in library',
  'lending library',
  'open library staff picks',
  'internet archive wishlist',
  'overdrive',
  'nonfiction',
]);

interface OpenLibraryWork {
  key: string;
  subjects?: string[];
}

interface OpenLibraryEditionForSubjects {
  works?: { key: string }[];
}

interface OpenLibrarySubjectResponse {
  works?: OpenLibrarySubjectWork[];
}

interface OpenLibrarySubjectWork {
  key: string;
  title: string;
  authors?: { name: string }[];
  cover_id?: number;
  ia?: string[];
  availability?: { isbn?: string };
}

export async function fetchSubjectsForBook(isbn: string): Promise<string[]> {
  const normalized = normalizeISBN(isbn);
  if (!normalized) return [];

  const editionRes = await fetchWithTimeout(`${BASE_URL}/isbn/${normalized}.json`);
  if (!editionRes.ok) return [];

  const edition: OpenLibraryEditionForSubjects = await editionRes.json();
  const workKey = edition.works?.[0]?.key;
  if (!workKey) return [];

  const workRes = await fetchWithTimeout(`${BASE_URL}${workKey}.json`);
  if (!workRes.ok) return [];

  const work: OpenLibraryWork = await workRes.json();
  if (!work.subjects?.length) return [];

  return work.subjects
    .map((s) => s.toLowerCase().trim())
    .filter((s) => !SUBJECTS_BLOCKLIST.has(s));
}

function subjectToSlug(subject: string): string {
  return subject.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

export async function searchBooksByAuthor(
  author: string,
  limit = 10,
): Promise<RecommendationCandidate[]> {
  const url = `${BASE_URL}/search.json?author=${encodeURIComponent(author)}&limit=${limit}&fields=title,author_name,isbn,cover_i,number_of_pages_median,key`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) return [];

  const data: OpenLibrarySearchResponse = await res.json();

  return data.docs
    .filter((d) => d.title)
    .map((d) => {
      const isbn13 = d.isbn?.find((i) => i.length === 13) ?? null;
      const isbn10 = d.isbn?.find((i) => i.length === 10) ?? null;
      return {
        title: d.title,
        authors: d.author_name ?? ['Autor desconocido'],
        coverUrl: d.cover_i ? `${COVERS_BY_ID_URL}/${d.cover_i}-L.jpg` : null,
        isbn13,
        isbn10,
        pageCount: d.number_of_pages_median ?? 0,
        subjects: [`autor: ${author}`],
        openLibraryKey: d.key ?? isbn13 ?? isbn10 ?? d.title,
      };
    });
}

export async function fetchBooksBySubject(
  subject: string,
  limit = 10,
): Promise<RecommendationCandidate[]> {
  const slug = subjectToSlug(subject);
  if (!slug) return [];

  const url = `${BASE_URL}/subjects/${slug}.json?limit=${limit}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) return [];

  const data: OpenLibrarySubjectResponse = await res.json();
  if (!data.works?.length) return [];

  return data.works
    .filter((w) => w.title && w.key)
    .map((w) => ({
      title: w.title,
      authors: w.authors?.map((a) => a.name) ?? ['Autor desconocido'],
      coverUrl: w.cover_id ? `${COVERS_BY_ID_URL}/${w.cover_id}-L.jpg` : null,
      isbn13: null,
      isbn10: null,
      pageCount: 0,
      subjects: [subject],
      openLibraryKey: w.key,
    }));
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
