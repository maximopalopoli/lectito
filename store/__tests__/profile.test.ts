import AsyncStorage from '@react-native-async-storage/async-storage';
import { reportReadError, saveJson } from '@/lib/storage';
import { normalizeName, useProfileStore } from '../profile';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn().mockResolvedValue(null) }));
jest.mock('@/lib/storage', () => ({
  loadStored: (key: string) => jest.requireMock('@react-native-async-storage/async-storage').getItem(key),
  saveJson: jest.fn().mockResolvedValue(undefined), reportReadError: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
});

test('normalizes names and treats blank ones as not given', () => {
  expect(normalizeName('  María   José ')).toBe('María José');
  expect(normalizeName('   ')).toBeNull();
  expect(normalizeName('x'.repeat(60))).toHaveLength(40);
});

test('finishing the welcome saves the name and never shows it again', async () => {
  await Promise.resolve();
  useProfileStore.setState({ name: null, welcomeDone: false, _hydrated: true });

  useProfileStore.getState().finishWelcome(' Máximo ');

  expect(useProfileStore.getState()).toMatchObject({ name: 'Máximo', welcomeDone: true });
  expect(saveJson).toHaveBeenCalledWith('aleph-profile', { name: 'Máximo', welcomeDone: true });
});

test('changing the name later keeps the welcome as done', async () => {
  await Promise.resolve();
  useProfileStore.setState({ name: 'Máximo', welcomeDone: true, _hydrated: true });

  useProfileStore.getState().setName('');

  expect(saveJson).toHaveBeenCalledWith('aleph-profile', { name: null, welcomeDone: true });
});

test('keeps the profile locked after a failed read', async () => {
  jest.mocked(AsyncStorage.getItem).mockImplementationOnce(() => Promise.resolve('[]'));
  let store: typeof useProfileStore;
  jest.isolateModules(() => {
    store = require('../profile').useProfileStore;
  });
  await Promise.resolve();
  await Promise.resolve();

  expect(reportReadError).toHaveBeenCalledWith('aleph-profile');
  store!.getState().finishWelcome('Máximo');
  expect(saveJson).not.toHaveBeenCalled();
  expect(store!.getState().welcomeDone).toBe(false);
});
