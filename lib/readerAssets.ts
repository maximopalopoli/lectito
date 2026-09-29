import { getReaderHtml } from '@/lib/readerHtml';

// Metro transforms these text files into JavaScript string modules. No asset
// download or filesystem read is needed when the reader opens.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const jszipScript: string = require('../assets/reader/jszip-3.10.1.min.txt');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const epubScript: string = require('../assets/reader/epubjs-0.3.93.min.txt');

export function getBundledReaderHtml(): string {
  return getReaderHtml(jszipScript, epubScript);
}
