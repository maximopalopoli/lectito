import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { exportBackup, importBackup } from '../backup';
import { readEpubAsBase64, restoreEpub } from '../epubStorage';
import { useBooksStore } from '@/store/books';
import { useSessionsStore } from '@/store/sessions';
import { useQuotesStore } from '@/store/quotes';
import { useGoalsStore } from '@/store/goals';
import { useReaderSettingsStore } from '@/store/readerSettings';

jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  EncodingType: { UTF8: 'utf8' },
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
}));
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn() }));
jest.mock('../epubStorage', () => ({
  readEpubAsBase64: jest.fn(),
  restoreEpub: jest.fn(),
}));
jest.mock('../storage', () => ({ flushStorageWrites: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/store/books', () => ({ useBooksStore: { getState: jest.fn() } }));
jest.mock('@/store/sessions', () => ({ useSessionsStore: { getState: jest.fn() } }));
jest.mock('@/store/quotes', () => ({ useQuotesStore: { getState: jest.fn() } }));
jest.mock('@/store/goals', () => ({ useGoalsStore: { getState: jest.fn() } }));
jest.mock('@/store/readerSettings', () => ({ useReaderSettingsStore: { getState: jest.fn() } }));

const book = {
  id: 'book-1', title: 'Ejemplo', authors: ['Autor'], coverUrl: null,
  isbn13: null, isbn10: null, pageCount: 100, currentPage: 10,
  status: 'READING', addedAt: '2026-01-01T00:00:00.000Z', completedAt: null,
  epubUri: 'file:///old.epub', rating: null, review: null, tags: [],
};
const reader = {
  positions: { 'book-1': { cfi: 'epubcfi(/6/2)', updatedAt: '2026-01-01T00:00:00.000Z' } },
  settings: { fontSize: 110, fontFamily: 'serif', theme: 'sepia' },
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useBooksStore.getState).mockReturnValue({
    books: [book], replaceBooks: jest.fn(),
  } as never);
  jest.mocked(useSessionsStore.getState).mockReturnValue({
    sessions: [], replaceSessions: jest.fn(),
  } as never);
  jest.mocked(useQuotesStore.getState).mockReturnValue({
    quotes: [], replaceQuotes: jest.fn(),
  } as never);
  jest.mocked(useGoalsStore.getState).mockReturnValue({
    goal: null, setGoal: jest.fn(), clearGoal: jest.fn(),
  } as never);
  jest.mocked(useReaderSettingsStore.getState).mockReturnValue({
    ...reader, replaceReaderData: jest.fn(),
  } as never);
});

test('exports an ePub and reader position with the backup', async () => {
  jest.mocked(readEpubAsBase64).mockResolvedValue('ZXB1Yg==');
  await exportBackup();

  const json = jest.mocked(FileSystem.writeAsStringAsync).mock.calls[0][1];
  const backup = JSON.parse(json);
  expect(backup.version).toBe(2);
  expect(backup.epubs['book-1']).toBe('ZXB1Yg==');
  expect(backup.reader).toEqual(reader);
  expect(Sharing.shareAsync).toHaveBeenCalled();
});

test('restores ePub under a new URI and restores reader position', async () => {
  jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
    canceled: false, assets: [{ uri: 'file:///backup.json' }],
  } as never);
  jest.mocked(FileSystem.readAsStringAsync).mockResolvedValue(JSON.stringify({
    version: 2, exportedAt: '2026-01-01T00:00:00.000Z', books: [book],
    sessions: [], goal: null, quotes: [], reader, epubs: { 'book-1': 'ZXB1Yg==' },
  }));
  jest.mocked(restoreEpub).mockResolvedValue('file:///new.epub');

  await importBackup();

  expect(restoreEpub).toHaveBeenCalledWith('book-1', 'ZXB1Yg==');
  expect(useBooksStore.getState().replaceBooks).toHaveBeenCalledWith([
    { ...book, epubUri: 'file:///new.epub' },
  ]);
  expect(useReaderSettingsStore.getState().replaceReaderData).toHaveBeenCalledWith(reader);
});

test('rejects an incomplete backup before replacing local data', async () => {
  jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
    canceled: false, assets: [{ uri: 'file:///backup.json' }],
  } as never);
  jest.mocked(FileSystem.readAsStringAsync).mockResolvedValue(JSON.stringify({
    version: 2, books: [book], sessions: [], goal: null, quotes: [], reader, epubs: {},
  }));

  await expect(importBackup()).rejects.toThrow('ePub');
  expect(useBooksStore.getState().replaceBooks).not.toHaveBeenCalled();
  expect(restoreEpub).not.toHaveBeenCalled();
});
