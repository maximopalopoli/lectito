import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { exportBackup, importBackup } from '../backup';
import { EpubUnavailableError, readEpubAsBase64, restoreEpub } from '../epubStorage';
import { useBooksStore } from '@/store/books';
import { useSessionsStore } from '@/store/sessions';
import { useQuotesStore } from '@/store/quotes';
import { useGoalsStore } from '@/store/goals';
import { useReaderSettingsStore } from '@/store/readerSettings';
import { useListsStore } from '@/store/lists';
import { saveJsonMany } from '../storage';

jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  EncodingType: { UTF8: 'utf8' },
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  StorageAccessFramework: {
    requestDirectoryPermissionsAsync: jest.fn(),
    createFileAsync: jest.fn(),
    writeAsStringAsync: jest.fn(),
  },
}));
jest.mock('expo-sharing', () => ({ shareAsync: jest.fn() }));
jest.mock('../epubStorage', () => ({
  EpubUnavailableError: jest.requireActual('../epubStorage').EpubUnavailableError,
  readEpubAsBase64: jest.fn(),
  restoreEpub: jest.fn(),
}));
jest.mock('../storage', () => ({
  flushStorageWrites: jest.fn().mockResolvedValue(undefined),
  saveJsonMany: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/store/books', () => ({
  BOOKS_STORAGE_KEY: 'aleph-books',
  useBooksStore: { getState: jest.fn(), setState: jest.fn() },
}));
jest.mock('@/store/sessions', () => ({
  SESSIONS_STORAGE_KEY: 'aleph-sessions',
  useSessionsStore: { getState: jest.fn(), setState: jest.fn() },
}));
jest.mock('@/store/quotes', () => ({
  QUOTES_STORAGE_KEY: 'aleph-quotes',
  useQuotesStore: { getState: jest.fn(), setState: jest.fn() },
}));
jest.mock('@/store/goals', () => ({
  GOAL_STORAGE_KEY: 'aleph-goals',
  useGoalsStore: { getState: jest.fn(), setState: jest.fn() },
}));
jest.mock('@/store/readerSettings', () => ({
  READER_STORAGE_KEY: 'aleph-readerSettings',
  useReaderSettingsStore: { getState: jest.fn(), setState: jest.fn() },
}));
jest.mock('@/store/lists', () => ({
  LISTS_STORAGE_KEY: 'aleph-lists',
  useListsStore: { getState: jest.fn(), setState: jest.fn() },
}));

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
const list = { id: 'list-1', name: 'Favoritos', bookIds: ['book-1'], createdAt: '2026-01-01T00:00:00.000Z' };

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'ios';
  jest.mocked(useBooksStore.getState).mockReturnValue({
    _hydrated: true, books: [book], replaceBooks: jest.fn(),
  } as never);
  jest.mocked(useSessionsStore.getState).mockReturnValue({
    _hydrated: true, sessions: [], replaceSessions: jest.fn(),
  } as never);
  jest.mocked(useQuotesStore.getState).mockReturnValue({
    _hydrated: true, quotes: [], replaceQuotes: jest.fn(),
  } as never);
  jest.mocked(useGoalsStore.getState).mockReturnValue({
    _hydrated: true, goal: null, setGoal: jest.fn(), clearGoal: jest.fn(),
  } as never);
  jest.mocked(useReaderSettingsStore.getState).mockReturnValue({
    _hydrated: true, ...reader, replaceReaderData: jest.fn(),
  } as never);
  jest.mocked(useListsStore.getState).mockReturnValue({
    _hydrated: true, lists: [list], replaceLists: jest.fn(),
  } as never);
});

test('exports an ePub and reader position with the backup', async () => {
  jest.mocked(readEpubAsBase64).mockResolvedValue('ZXB1Yg==');
  await exportBackup('share');

  const json = jest.mocked(FileSystem.writeAsStringAsync).mock.calls[0][1];
  const backup = JSON.parse(json);
  expect(backup.version).toBe(3);
  expect(backup.epubs['book-1']).toBe('ZXB1Yg==');
  expect(backup.reader).toEqual(reader);
  expect(backup.lists).toEqual([list]);
  expect(Sharing.shareAsync).toHaveBeenCalled();
});

test('backs up everything else when an ePub file cannot be read', async () => {
  jest.mocked(readEpubAsBase64).mockRejectedValue(new EpubUnavailableError());

  await expect(exportBackup('share')).resolves.toEqual({ saved: true, skippedEpubs: ['Ejemplo'] });

  const backup = JSON.parse(jest.mocked(FileSystem.writeAsStringAsync).mock.calls[0][1]);
  expect(backup.epubs).toEqual({});
  // Without its file the book must not claim an ePub, or importing this backup would be rejected.
  expect(backup.books).toEqual([{ ...book, epubUri: null }]);
  expect(backup.reader).toEqual(reader);
});

test('still fails the export on unexpected ePub read errors', async () => {
  jest.mocked(readEpubAsBase64).mockRejectedValue(new Error('Out of memory'));

  await expect(exportBackup('share')).rejects.toThrow('Out of memory');
  expect(Sharing.shareAsync).not.toHaveBeenCalled();
});

test('saves a backup to the Android folder selected by the user', async () => {
  Platform.OS = 'android';
  jest.mocked(readEpubAsBase64).mockResolvedValue('ZXB1Yg==');
  jest.mocked(FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync).mockResolvedValue({
    granted: true, directoryUri: 'content://chosen-folder',
  });
  jest.mocked(FileSystem.StorageAccessFramework.createFileAsync).mockResolvedValue('content://backup.json');

  await expect(exportBackup('save')).resolves.toEqual({ saved: true, skippedEpubs: [] });

  expect(FileSystem.StorageAccessFramework.createFileAsync).toHaveBeenCalledWith(
    'content://chosen-folder', expect.stringMatching(/^aleph-backup-\d{4}-\d{2}-\d{2}-\d{6}$/), 'application/json',
  );
  const json = jest.mocked(FileSystem.StorageAccessFramework.writeAsStringAsync).mock.calls[0][1];
  expect(JSON.parse(json).epubs['book-1']).toBe('ZXB1Yg==');
  expect(Sharing.shareAsync).not.toHaveBeenCalled();
});

test('removes an incomplete Android backup if writing fails', async () => {
  Platform.OS = 'android';
  jest.mocked(readEpubAsBase64).mockResolvedValue('ZXB1Yg==');
  jest.mocked(FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync).mockResolvedValue({
    granted: true, directoryUri: 'content://chosen-folder',
  });
  jest.mocked(FileSystem.StorageAccessFramework.createFileAsync).mockResolvedValue('content://backup.json');
  jest.mocked(FileSystem.StorageAccessFramework.writeAsStringAsync).mockRejectedValueOnce(new Error('Disk full'));

  await expect(exportBackup('save')).rejects.toThrow('Disk full');
  expect(FileSystem.deleteAsync).toHaveBeenCalledWith('content://backup.json', { idempotent: true });
});

test('does not create a backup when Android folder selection is cancelled', async () => {
  Platform.OS = 'android';
  jest.mocked(readEpubAsBase64).mockResolvedValue('ZXB1Yg==');
  jest.mocked(FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync).mockResolvedValue({ granted: false });

  await expect(exportBackup('save')).resolves.toEqual({ saved: false });

  expect(FileSystem.StorageAccessFramework.createFileAsync).not.toHaveBeenCalled();
  expect(Sharing.shareAsync).not.toHaveBeenCalled();
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
  expect(saveJsonMany).toHaveBeenCalledTimes(1);
  expect(saveJsonMany).toHaveBeenCalledWith({
    'aleph-books': [{ ...book, epubUri: 'file:///new.epub' }],
    'aleph-sessions': [],
    'aleph-quotes': [],
    'aleph-goals': null,
    'aleph-lists': [],
    'aleph-readerSettings': reader,
  });
  expect(useBooksStore.setState).toHaveBeenCalledWith({ books: [{ ...book, epubUri: 'file:///new.epub' }] });
  expect(useReaderSettingsStore.setState).toHaveBeenCalledWith(reader);
  expect(useListsStore.setState).toHaveBeenCalledWith({ lists: [] });
});

test('restores custom lists from a v3 backup', async () => {
  jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
    canceled: false, assets: [{ uri: 'file:///backup.json' }],
  } as never);
  jest.mocked(FileSystem.readAsStringAsync).mockResolvedValue(JSON.stringify({
    version: 3, exportedAt: '2026-01-01T00:00:00.000Z', books: [book],
    sessions: [], goal: null, quotes: [], reader, epubs: { 'book-1': 'ZXB1Yg==' }, lists: [list],
  }));
  jest.mocked(restoreEpub).mockResolvedValue('file:///new.epub');

  await importBackup();

  expect(useListsStore.setState).toHaveBeenCalledWith({ lists: [list] });
});

test('rejects a list that references a book missing from the backup', async () => {
  jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
    canceled: false, assets: [{ uri: 'file:///backup.json' }],
  } as never);
  jest.mocked(FileSystem.readAsStringAsync).mockResolvedValue(JSON.stringify({
    version: 3, books: [book], sessions: [], goal: null, quotes: [], reader,
    epubs: { 'book-1': 'ZXB1Yg==' }, lists: [{ ...list, bookIds: ['missing-book'] }],
  }));

  await expect(importBackup()).rejects.toThrow('listas inválidas');
  expect(saveJsonMany).not.toHaveBeenCalled();
});

test('rejects an incomplete backup before replacing local data', async () => {
  jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
    canceled: false, assets: [{ uri: 'file:///backup.json' }],
  } as never);
  jest.mocked(FileSystem.readAsStringAsync).mockResolvedValue(JSON.stringify({
    version: 2, books: [book], sessions: [], goal: null, quotes: [], reader, epubs: {},
  }));

  await expect(importBackup()).rejects.toThrow('ePub');
  expect(saveJsonMany).not.toHaveBeenCalled();
  expect(restoreEpub).not.toHaveBeenCalled();
});

const validBackup = JSON.stringify({
  version: 3, exportedAt: '2026-01-01T00:00:00.000Z', books: [book],
  sessions: [], goal: null, quotes: [], reader, epubs: { 'book-1': 'ZXB1Yg==' }, lists: [list],
});

test('keeps the previous data in memory when writing the restored backup fails', async () => {
  jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
    canceled: false, assets: [{ uri: 'file:///backup.json' }],
  } as never);
  jest.mocked(FileSystem.readAsStringAsync).mockResolvedValue(validBackup);
  jest.mocked(restoreEpub).mockResolvedValue('file:///new.epub');
  jest.mocked(saveJsonMany).mockRejectedValueOnce(new Error('disk full'));

  await expect(importBackup()).rejects.toThrow('disk full');
  for (const store of [useBooksStore, useSessionsStore, useQuotesStore, useGoalsStore, useReaderSettingsStore, useListsStore]) {
    expect(store.setState).not.toHaveBeenCalled();
  }
});

test('refuses to restore while some local data has not loaded', async () => {
  jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
    canceled: false, assets: [{ uri: 'file:///backup.json' }],
  } as never);
  jest.mocked(FileSystem.readAsStringAsync).mockResolvedValue(validBackup);
  jest.mocked(useListsStore.getState).mockReturnValue({ _hydrated: false, lists: [] } as never);

  await expect(importBackup()).rejects.toThrow('no terminaron de cargar');
  expect(restoreEpub).not.toHaveBeenCalled();
  expect(saveJsonMany).not.toHaveBeenCalled();
});
