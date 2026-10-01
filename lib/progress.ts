import type { Book, ReaderPosition } from '@/types';

export interface ReadingProgress {
  /** 0-100, redondeado. */
  percent: number;
  /** Capítulo donde quedó el lector del ePub, si se conoce. */
  chapter: string | null;
  /**
   * En los ePub el "número de página" sale de las locations de epub.js y cambia al generarlas,
   * así que se muestra solo el porcentaje.
   */
  byPercent: boolean;
}

export function readingProgress(book: Book, position?: ReaderPosition | null): ReadingProgress {
  const pageRatio = book.pageCount > 0 ? book.currentPage / book.pageCount : 0;
  if (!book.epubUri) {
    return { percent: toPercent(pageRatio), chapter: null, byPercent: false };
  }
  const ratio = typeof position?.percent === 'number' ? position.percent : pageRatio;
  return { percent: toPercent(ratio), chapter: position?.chapter?.trim() || null, byPercent: true };
}

function toPercent(ratio: number) {
  return Math.min(100, Math.max(0, Math.round(ratio * 100)));
}
