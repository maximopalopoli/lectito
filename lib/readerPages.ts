/** Caracteres por location: tiene que coincidir con `book.locations.generate(...)` en readerHtml. */
export const CHARS_PER_LOCATION = 1024;

/** Un capítulo más corto (portada, dedicatoria) no alcanza para estimar cuánto entra en una página. */
const MIN_SAMPLE_PAGES = 3;

export interface PageSample {
  charsPerPage: number;
  /** Páginas del capítulo medido: un capítulo más largo da una muestra más confiable. */
  pages: number;
}

/**
 * Se queda con la muestra del capítulo más largo visto con el layout actual (letra y tipografía).
 * Al cambiar el layout hay que empezar de nuevo con `null`.
 */
export function updatePageSample(
  prev: PageSample | null,
  chapterChars: number,
  chapterPages: number,
): PageSample | null {
  if (chapterPages < MIN_SAMPLE_PAGES || chapterChars <= 0) return prev;
  if (prev && prev.pages > chapterPages) return prev;
  return { charsPerPage: chapterChars / chapterPages, pages: chapterPages };
}

/**
 * Páginas de pantalla de todo el libro con la letra actual: más letra, menos caracteres
 * por página y más páginas. La posición sale del porcentaje, que no depende del layout.
 */
export function estimatePages(
  rawPercent: number,
  totalLocations: number,
  sample: PageSample | null,
): { page: number; total: number } | null {
  if (!sample || totalLocations <= 0 || rawPercent < 0) return null;
  const total = Math.max(1, Math.round((totalLocations * CHARS_PER_LOCATION) / sample.charsPerPage));
  const page = Math.min(total, Math.floor(rawPercent * total) + 1);
  return { page, total };
}
