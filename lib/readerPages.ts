/** Caracteres por location: tiene que coincidir con `book.locations.generate(...)` en readerHtml. */
export const CHARS_PER_LOCATION = 1024;

/** Un capítulo más corto (portada, dedicatoria) no alcanza para estimar cuánto entra en una página. */
const MIN_SAMPLE_PAGES = 3;

/**
 * Ninguna pantalla real muestra menos texto por página. Lecturas así salen de un layout a medio
 * armar (por ejemplo, el visor con alto 0 al abrir), que reparte el capítulo en cientos de páginas.
 */
const MIN_CHARS_PER_PAGE = 100;

/** Caracteres por página medidos en cada capítulo (índice de la sección), con el layout actual. */
export type PageSamples = Readonly<Record<number, number>>;

/**
 * Guarda la última medición del capítulo: si una lectura salió mal, la próxima del mismo
 * capítulo la reemplaza. Al cambiar letra, tipografía o tamaño del visor hay que empezar de cero.
 */
export function addPageSample(
  samples: PageSamples,
  sectionIndex: number,
  chapterChars: number,
  chapterPages: number,
): PageSamples {
  if (chapterPages < MIN_SAMPLE_PAGES || chapterChars <= 0) return samples;
  const charsPerPage = chapterChars / chapterPages;
  if (charsPerPage < MIN_CHARS_PER_PAGE) return samples;
  return { ...samples, [sectionIndex]: charsPerPage };
}

/** Mediana entre capítulos, para que uno raro (lleno de imágenes, por ejemplo) no mueva el total. */
export function charsPerPage(samples: PageSamples): number | null {
  const values = Object.values(samples).sort((a, b) => a - b);
  if (values.length === 0) return null;
  const mid = Math.floor(values.length / 2);
  return values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
}

/**
 * Páginas de pantalla de todo el libro con la letra actual: más letra, menos caracteres
 * por página y más páginas. La posición sale del porcentaje, que no depende del layout.
 */
export function estimatePages(
  rawPercent: number,
  totalLocations: number,
  perPage: number | null,
): { page: number; total: number } | null {
  if (!perPage || totalLocations <= 0 || rawPercent < 0) return null;
  const total = Math.max(1, Math.round((totalLocations * CHARS_PER_LOCATION) / perPage));
  const page = Math.min(total, Math.floor(rawPercent * total) + 1);
  return { page, total };
}
