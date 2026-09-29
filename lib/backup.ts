import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

import { useBooksStore } from '@/store/books';
import { useQuotesStore } from '@/store/quotes';
import { useSessionsStore } from '@/store/sessions';
import { useGoalsStore } from '@/store/goals';
import { useReaderSettingsStore, type ReaderData } from '@/store/readerSettings';
import { useListsStore } from '@/store/lists';
import { isReadingList } from '@/lib/listValidation';
import { readEpubAsBase64, restoreEpub } from '@/lib/epubStorage';
import { flushStorageWrites } from '@/lib/storage';
import type { Book, Goal, Quote, ReadingList, Session } from '@/types';

interface BackupData {
  version: number;
  exportedAt: string;
  books: Book[];
  sessions: Session[];
  goal: Goal | null;
  quotes: Quote[];
  reader: ReaderData;
  epubs: Record<string, string>;
  lists: ReadingList[];
}

export async function exportBackup(destination: 'share' | 'save' = 'share'): Promise<boolean> {
  await flushStorageWrites();
  const books = useBooksStore.getState().books;
  const sessions = useSessionsStore.getState().sessions;
  const goal = useGoalsStore.getState().goal;
  const quotes = useQuotesStore.getState().quotes;
  const lists = useListsStore.getState().lists;
  const { positions, settings } = useReaderSettingsStore.getState();
  const epubs: Record<string, string> = {};
  for (const book of books) {
    if (book.epubUri) {
      epubs[book.id] = await readEpubAsBase64(book.epubUri);
    }
  }

  const exportedAt = new Date().toISOString();
  const data: BackupData = {
    version: 3,
    exportedAt,
    books,
    sessions,
    goal,
    quotes,
    reader: { positions, settings },
    epubs,
    lists,
  };

  const json = JSON.stringify(data, null, 2);
  const timestamp = exportedAt.slice(0, 19).replace('T', '-').replaceAll(':', '');
  const filename = `aleph-backup-${timestamp}.json`;

  if (Platform.OS === 'web') {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  }

  if (Platform.OS === 'android' && destination === 'save') {
    const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
    if (!permission.granted) return false;

    const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
      permission.directoryUri,
      filename.slice(0, -'.json'.length),
      'application/json',
    );
    try {
      await FileSystem.StorageAccessFramework.writeAsStringAsync(fileUri, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });
    } catch (error) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
      throw error;
    }
    return true;
  }

  const filePath = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(filePath, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await Sharing.shareAsync(filePath, {
    mimeType: 'application/json',
    dialogTitle: 'Exportar backup de Aleph',
  });
  return true;
}

export async function importBackup(): Promise<{ books: number; sessions: number; missingEpubs: number }> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled) {
    throw new Error('Cancelado');
  }

  const asset = result.assets[0];
  const content = Platform.OS === 'web'
    ? await (await fetch(asset.uri)).text()
    : await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

  const data: unknown = JSON.parse(content);

  if (
    !data ||
    typeof data !== 'object' ||
    !('version' in data) ||
    !('books' in data) ||
    !('sessions' in data)
  ) {
    throw new Error('El archivo no es un backup válido de Aleph');
  }

  const backup = data as Partial<BackupData>;

  if (
    (backup.version !== 1 && backup.version !== 2 && backup.version !== 3) ||
    !Array.isArray(backup.books) ||
    !Array.isArray(backup.sessions) ||
    !backup.books.every(isValidBook) ||
    !backup.sessions.every(isValidSession) ||
    (backup.quotes !== undefined && (!Array.isArray(backup.quotes) || !backup.quotes.every(isValidQuote))) ||
    (backup.goal != null && !isValidGoal(backup.goal))
  ) {
    throw new Error('El archivo no contiene datos válidos');
  }

  if ((backup.version === 2 || backup.version === 3) && (
    !isRecord(backup.epubs) ||
    !backup.books.every((book) => !book.epubUri || typeof backup.epubs?.[book.id] === 'string') ||
    !isValidReader(backup.reader)
  )) {
    throw new Error('El backup no contiene todos los ePub o ajustes del lector');
  }

  if (backup.version === 3 && !areValidLists(backup.lists, backup.books!)) {
    throw new Error('El backup contiene listas inválidas');
  }

  const missingEpubs = backup.version === 1
    ? backup.books.filter((book) => Boolean(book.epubUri)).length
    : 0;
  const books: Book[] = [];
  for (const book of backup.books) {
    const base64 = backup.version === 1 ? undefined : backup.epubs?.[book.id];
    const epubUri = base64 ? await restoreEpub(book.id, base64) : null;
    books.push({ ...book, epubUri });
  }

  useBooksStore.getState().replaceBooks(books);
  useListsStore.getState().replaceLists(backup.version === 3 ? backup.lists! : []);
  useSessionsStore.getState().replaceSessions(backup.sessions);

  if (backup.goal) {
    useGoalsStore.getState().setGoal(backup.goal);
  } else {
    useGoalsStore.getState().clearGoal();
  }

  useQuotesStore.getState().replaceQuotes(backup.quotes ?? []);
  if (backup.version !== 1 && backup.reader) {
    useReaderSettingsStore.getState().replaceReaderData(backup.reader);
  } else {
    useReaderSettingsStore.getState().replaceReaderData({
      positions: {},
      settings: { fontSize: 100, fontFamily: 'default', theme: 'light' },
    });
  }
  await flushStorageWrites();

  return { books: books.length, sessions: backup.sessions.length, missingEpubs };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function areValidLists(value: unknown, books: Book[]): value is ReadingList[] {
  if (!Array.isArray(value) || !value.every(isReadingList)) return false;
  const bookIds = new Set(books.map((book) => book.id));
  const listIds = new Set(value.map((list) => list.id));
  const names = new Set(value.map((list) => list.name.toLocaleLowerCase()));
  return listIds.size === value.length && names.size === value.length &&
    value.every((list) => list.bookIds.every((id) => bookIds.has(id)));
}

function isValidBook(value: unknown): value is Book {
  return isRecord(value) && typeof value.id === 'string' &&
    typeof value.title === 'string' && Array.isArray(value.authors) &&
    value.authors.every((author) => typeof author === 'string') &&
    typeof value.pageCount === 'number' && typeof value.currentPage === 'number' &&
    ['TBR', 'READING', 'DONE', 'DNF'].includes(String(value.status));
}

function isValidSession(value: unknown): value is Session {
  return isRecord(value) && typeof value.id === 'string' &&
    typeof value.bookId === 'string' && typeof value.startedAt === 'string' &&
    typeof value.endedAt === 'string' && typeof value.durationMin === 'number' &&
    typeof value.pagesRead === 'number';
}

function isValidQuote(value: unknown): value is Quote {
  return isRecord(value) && typeof value.id === 'string' &&
    typeof value.bookId === 'string' && typeof value.text === 'string';
}

function isValidGoal(value: unknown): value is Goal {
  return isRecord(value) && ['daily', 'weekly'].includes(String(value.period)) &&
    ['minutes', 'pages'].includes(String(value.metric)) &&
    typeof value.target === 'number' && Number.isFinite(value.target) && value.target > 0;
}

function isValidReader(value: unknown): value is ReaderData {
  return isRecord(value) && isRecord(value.positions) && isRecord(value.settings) &&
    typeof value.settings.fontSize === 'number' &&
    ['default', 'serif', 'sans-serif', 'monospace'].includes(String(value.settings.fontFamily)) &&
    ['light', 'dark', 'sepia'].includes(String(value.settings.theme));
}
