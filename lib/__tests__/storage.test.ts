import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveJson, saveJsonMany } from '../storage';
import { useStorageHealthStore } from '../storageHealth';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiSet: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  useStorageHealthStore.setState({ readError: null, writeError: null });
});

test('serializes writes to the same storage key', async () => {
  let finishFirst: (() => void) | undefined;
  jest.mocked(AsyncStorage.setItem)
    .mockImplementationOnce(() => new Promise<void>((resolve) => { finishFirst = resolve; }))
    .mockResolvedValueOnce(undefined);

  const first = saveJson('books', [{ id: 'first' }]);
  const second = saveJson('books', [{ id: 'first' }, { id: 'second' }]);
  await Promise.resolve();
  await Promise.resolve();
  expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);

  finishFirst?.();
  await Promise.all([first, second]);
  expect(AsyncStorage.setItem).toHaveBeenNthCalledWith(2, 'books', '[{"id":"first"},{"id":"second"}]');
});

test('reports a failed write and clears it after that key is saved', async () => {
  jest.mocked(AsyncStorage.setItem)
    .mockRejectedValueOnce(new Error('disk full'))
    .mockResolvedValueOnce(undefined);

  await expect(saveJson('books', [])).rejects.toThrow('disk full');
  expect(useStorageHealthStore.getState().writeError).toBe('books');

  await saveJson('books', []);
  expect(useStorageHealthStore.getState().writeError).toBeNull();
});

test('saves several keys in one call after pending writes to those keys', async () => {
  let finishFirst: (() => void) | undefined;
  jest.mocked(AsyncStorage.setItem)
    .mockImplementationOnce(() => new Promise<void>((resolve) => { finishFirst = resolve; }));
  jest.mocked(AsyncStorage.multiSet).mockResolvedValueOnce(undefined);

  const first = saveJson('books', []);
  const both = saveJsonMany({ books: [{ id: 'b' }], sessions: [{ id: 's' }] });
  await Promise.resolve();
  await Promise.resolve();
  expect(AsyncStorage.multiSet).not.toHaveBeenCalled();

  finishFirst?.();
  await Promise.all([first, both]);
  expect(AsyncStorage.multiSet).toHaveBeenCalledWith([
    ['books', '[{"id":"b"}]'],
    ['sessions', '[{"id":"s"}]'],
  ]);
});

test('reports a failed multi-key write', async () => {
  jest.mocked(AsyncStorage.multiSet).mockRejectedValueOnce(new Error('disk full'));

  await expect(saveJsonMany({ books: [], sessions: [] })).rejects.toThrow('disk full');
  expect(useStorageHealthStore.getState().writeError).not.toBeNull();
});
