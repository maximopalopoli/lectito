export function looksLikeISBN(query: string): boolean {
  const normalized = query.replace(/[-\s]/g, "");
  return /^\d{10}(\d{3})?$/.test(normalized);
}

/** Espera tras la última tecla antes de buscar solo. */
export const LIVE_SEARCH_DELAY_MS = 600;
const LIVE_SEARCH_MIN_CHARS = 3;

/** Búsqueda automática al tipear: no para ISBN a medio escribir (solo dígitos que todavía no son un ISBN). */
export function shouldLiveSearch(query: string): boolean {
  const trimmed = query.trim();
  if (trimmed.length < LIVE_SEARCH_MIN_CHARS) return false;
  if (/^[\d-\s]+[xX]?$/.test(trimmed)) return looksLikeISBN(trimmed);
  return true;
}
