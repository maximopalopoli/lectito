import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { pickDocument } from '../pickDocument';

jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///data/app/cache/scoped/',
  copyAsync: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'uuid-1' }));

const picked = (uri: string) => ({ canceled: false, assets: [{ uri, name: 'libro.epub' }] }) as never;

beforeEach(() => jest.clearAllMocks());

test('on Android copies the picked content URI into the app cache', async () => {
  Platform.OS = 'android';
  jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue(picked('content://downloads/libro.epub'));

  await expect(pickDocument('application/epub+zip')).resolves.toBe('file:///data/app/cache/scoped/picked-uuid-1');
  expect(DocumentPicker.getDocumentAsync).toHaveBeenCalledWith({ type: 'application/epub+zip', copyToCacheDirectory: false });
  expect(FileSystem.copyAsync).toHaveBeenCalledWith({
    from: 'content://downloads/libro.epub', to: 'file:///data/app/cache/scoped/picked-uuid-1',
  });
});

test('elsewhere returns the picker copy as is', async () => {
  Platform.OS = 'ios';
  jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue(picked('file:///tmp/libro.epub'));

  await expect(pickDocument('application/epub+zip')).resolves.toBe('file:///tmp/libro.epub');
  expect(DocumentPicker.getDocumentAsync).toHaveBeenCalledWith({ type: 'application/epub+zip', copyToCacheDirectory: true });
  expect(FileSystem.copyAsync).not.toHaveBeenCalled();
});

test('returns null when the user cancels', async () => {
  jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({ canceled: true, assets: null } as never);

  await expect(pickDocument('application/json')).resolves.toBeNull();
});
