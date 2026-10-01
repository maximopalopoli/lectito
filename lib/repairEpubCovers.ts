import { extractCoverFromBase64 } from '@/lib/epubParser';
import { readEpubAsBase64 } from '@/lib/epubStorage';
import { useBooksStore } from '@/store/books';

/**
 * Antes, en web la tapa de un ePub importado se guardaba como `blob:`, que deja de existir al
 * recargar la página. Se vuelve a sacar del ePub guardado (una sola vez: después queda como data URL).
 */
export async function repairEpubCovers(): Promise<void> {
  const broken = useBooksStore
    .getState()
    .books.filter((b) => b.epubUri && b.coverUrl?.startsWith('blob:'));

  for (const book of broken) {
    try {
      const base64 = await readEpubAsBase64(book.epubUri!);
      const coverUrl = await extractCoverFromBase64(base64, book.title);
      useBooksStore.getState().updateBook(book.id, { coverUrl });
    } catch {
      // Sin el ePub no hay de dónde sacar la tapa: se deja como estaba.
    }
  }
}
