import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const WEB_STORAGE_PREFIX = 'aleph-epub-';

/**
 * Persist an ePub from the cache/temp directory to a permanent location.
 * Returns a permanent URI (file path on native, storage key on web).
 */
export async function persistEpub(cacheUri: string, filename: string): Promise<string> {
  if (Platform.OS === 'web') {
    // On web, blob URIs are temporary. Read the file and store as base64 in localStorage.
    const response = await fetch(cacheUri);
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    const key = WEB_STORAGE_PREFIX + filename;
    localStorage.setItem(key, base64);
    return key;
  }

  const dir = `${FileSystem.documentDirectory}epubs/`;
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }

  const destUri = `${dir}${filename}.epub`;
  await FileSystem.copyAsync({ from: cacheUri, to: destUri });
  return destUri;
}

/** The book's ePub file can no longer be read; it has to be attached again or restored. */
export class EpubUnavailableError extends Error {
  constructor() {
    super('No se puede abrir el archivo ePub de este libro. Volvé a adjuntarlo o restaurá un backup.');
    this.name = 'EpubUnavailableError';
  }
}

/**
 * Read an ePub file as base64 for passing to the WebView/iframe.
 * Stored paths are absolute, so if the app's directory moved (an iOS update or an
 * Expo Go upgrade), the file is also looked up by name in the current epubs folder.
 */
export async function readEpubAsBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    // URI is a localStorage key
    const base64 = localStorage.getItem(uri);
    if (!base64) throw new EpubUnavailableError();
    return base64;
  }

  const moved = `${FileSystem.documentDirectory}epubs/${uri.slice(uri.lastIndexOf('/') + 1)}`;
  for (const candidate of moved === uri ? [uri] : [uri, moved]) {
    try {
      if (!(await FileSystem.getInfoAsync(candidate)).exists) continue;
      return await FileSystem.readAsStringAsync(candidate, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch {
      // Outside the directories this app may read; try the next location.
    }
  }
  throw new EpubUnavailableError();
}

/** Restore an ePub from a backup under a stable book-specific name. */
export async function restoreEpub(bookId: string, base64: string): Promise<string> {
  const safeId = bookId.replace(/[^a-zA-Z0-9_-]/g, '_');
  if (Platform.OS === 'web') {
    const key = WEB_STORAGE_PREFIX + safeId;
    localStorage.setItem(key, base64);
    return key;
  }

  const dir = `${FileSystem.documentDirectory}epubs/`;
  const dirInfo = await FileSystem.getInfoAsync(dir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
  const uri = `${dir}${safeId}.epub`;
  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return uri;
}

/**
 * Delete an ePub file from permanent storage.
 */
export async function deleteEpub(uri: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(uri);
    return;
  }

  const info = await FileSystem.getInfoAsync(uri);
  if (info.exists) {
    await FileSystem.deleteAsync(uri);
  }
}
