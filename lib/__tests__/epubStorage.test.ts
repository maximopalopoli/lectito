import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { EpubUnavailableError, readEpubAsBase64 } from '../epubStorage';

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///data/app/files/scoped/',
  EncodingType: { Base64: 'base64' },
  getInfoAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
}));

const oldUri = 'file:///data/app/files/epubs/book.epub';
const movedUri = 'file:///data/app/files/scoped/epubs/book.epub';

beforeEach(() => {
  jest.clearAllMocks();
  Platform.OS = 'android';
  jest.mocked(FileSystem.getInfoAsync).mockResolvedValue({ exists: true } as never);
});

test('reads the ePub from its stored path', async () => {
  jest.mocked(FileSystem.readAsStringAsync).mockResolvedValue('ZXB1Yg==');

  await expect(readEpubAsBase64(oldUri)).resolves.toBe('ZXB1Yg==');
  expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(oldUri, { encoding: 'base64' });
});

test('finds the file by name when the app directory moved', async () => {
  jest.mocked(FileSystem.readAsStringAsync).mockImplementation(async (uri) => {
    if (uri === oldUri) throw new Error(`Location '${uri}' isn't readable.`);
    return 'ZXB1Yg==';
  });

  await expect(readEpubAsBase64(oldUri)).resolves.toBe('ZXB1Yg==');
  expect(FileSystem.readAsStringAsync).toHaveBeenLastCalledWith(movedUri, { encoding: 'base64' });
});

test('reports a missing or unreadable file as unavailable', async () => {
  jest.mocked(FileSystem.getInfoAsync).mockImplementation(async (uri) => ({ exists: uri === oldUri }) as never);
  jest.mocked(FileSystem.readAsStringAsync).mockRejectedValue(new Error("Location isn't readable."));

  await expect(readEpubAsBase64(oldUri)).rejects.toBeInstanceOf(EpubUnavailableError);
});
