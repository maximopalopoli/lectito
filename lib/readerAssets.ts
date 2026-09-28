import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { getReaderHtml } from '@/lib/readerHtml';

// Metro packages these text assets into the native app. The ePub WebView gets
// their contents inline, so its HTML never needs to fetch a CDN script.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const jszipAsset = require('../assets/reader/jszip-3.10.1.min.txt');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const epubAsset = require('../assets/reader/epubjs-0.3.93.min.txt');

async function readScript(moduleId: number): Promise<string> {
  const asset = Asset.fromModule(moduleId);
  if (Platform.OS === 'web') {
    const response = await fetch(asset.uri);
    if (!response.ok) throw new Error(`No se pudo cargar ${asset.name}`);
    return response.text();
  }

  await asset.downloadAsync();
  if (!asset.localUri) throw new Error(`No se pudo cargar ${asset.name}`);
  return FileSystem.readAsStringAsync(asset.localUri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
}

let htmlPromise: Promise<string> | null = null;

export function loadReaderHtml(): Promise<string> {
  if (!htmlPromise) {
    htmlPromise = Promise.all([readScript(jszipAsset), readScript(epubAsset)])
      .then(([jszip, epub]) => getReaderHtml(jszip, epub))
      .catch((error) => {
        htmlPromise = null;
        throw error;
      });
  }
  return htmlPromise;
}
