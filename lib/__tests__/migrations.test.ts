import AsyncStorage from '@react-native-async-storage/async-storage';
import { migrateStorage, SCHEMA_VERSION_KEY, type Migration } from '../migrations';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  multiSet: jest.fn().mockResolvedValue(undefined),
}));

let stored: Record<string, string>;

beforeEach(() => {
  jest.clearAllMocks();
  stored = {};
  jest.mocked(AsyncStorage.getItem).mockImplementation(async (key) => stored[key] ?? null);
});

test('marks existing unversioned data as the current version without changing it', async () => {
  stored['aleph-books'] = '[{"id":"book-1"}]';

  await migrateStorage([]);

  expect(AsyncStorage.multiSet).toHaveBeenCalledWith([[SCHEMA_VERSION_KEY, '1']]);
});

test('does not write when data is already current', async () => {
  stored[SCHEMA_VERSION_KEY] = '1';

  await migrateStorage([]);

  expect(AsyncStorage.multiSet).not.toHaveBeenCalled();
});

test('runs pending migrations in order and saves them with the new version in one call', async () => {
  stored[SCHEMA_VERSION_KEY] = '1';
  stored['aleph-books'] = '[{"id":"book-1"}]';
  const toV2: Migration = async (read) => ({
    'aleph-books': ((await read('aleph-books')) as object[]).map((book) => ({ ...book, tags: [] })),
  });
  const toV3: Migration = async (read) => ({
    'aleph-books': ((await read('aleph-books')) as object[]).map((book) => ({ ...book, rating: null })),
  });

  await migrateStorage([toV2, toV3]);

  expect(AsyncStorage.multiSet).toHaveBeenCalledTimes(1);
  expect(AsyncStorage.multiSet).toHaveBeenCalledWith([
    ['aleph-books', '[{"id":"book-1","tags":[],"rating":null}]'],
    [SCHEMA_VERSION_KEY, '3'],
  ]);
});

test('skips migrations the data already has', async () => {
  stored[SCHEMA_VERSION_KEY] = '2';
  const toV2 = jest.fn<ReturnType<Migration>, Parameters<Migration>>();
  const toV3: Migration = async () => ({ 'aleph-goal': null });

  await migrateStorage([toV2, toV3]);

  expect(toV2).not.toHaveBeenCalled();
  expect(AsyncStorage.multiSet).toHaveBeenCalledWith([['aleph-goal', 'null'], [SCHEMA_VERSION_KEY, '3']]);
});

test('refuses data written by a newer version of the app', async () => {
  stored[SCHEMA_VERSION_KEY] = '5';

  await expect(migrateStorage([])).rejects.toThrow('newer');
  expect(AsyncStorage.multiSet).not.toHaveBeenCalled();
});

test('saves nothing when a migration fails', async () => {
  stored[SCHEMA_VERSION_KEY] = '1';
  const broken: Migration = async () => { throw new Error('bad data'); };

  await expect(migrateStorage([broken])).rejects.toThrow('bad data');
  expect(AsyncStorage.multiSet).not.toHaveBeenCalled();
});
