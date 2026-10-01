import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { randomUUID } from 'expo-crypto';
import { Platform } from 'react-native';

/**
 * Let the user pick a file and return a URI this app can read.
 *
 * On Android the picker's own cache copy can land outside the folders the app may
 * read (Expo Go scopes file access per project), so the original content:// URI is
 * copied into this app's cache directory instead. Returns null when cancelled.
 */
export async function pickDocument(type: string): Promise<string | null> {
  const isAndroid = Platform.OS === 'android';
  const result = await DocumentPicker.getDocumentAsync({ type, copyToCacheDirectory: !isAndroid });
  if (result.canceled || result.assets.length === 0) return null;

  const { uri } = result.assets[0];
  if (!isAndroid) return uri;

  const copy = `${FileSystem.cacheDirectory}picked-${randomUUID()}`;
  await FileSystem.copyAsync({ from: uri, to: copy });
  return copy;
}
