import { Platform } from 'react-native';
import JSZip from 'jszip';

import type { BookSearchResult } from '@/types';

/**
 * Parse an ePub file and extract book metadata.
 * ePub is a ZIP containing META-INF/container.xml → .opf with metadata.
 */
export async function parseEpub(uri: string): Promise<BookSearchResult> {
  const arrayBuffer = await readFileAsArrayBuffer(uri);
  const zip = await JSZip.loadAsync(arrayBuffer);

  // 1. Find the OPF path from container.xml
  const containerXml = await readZipFile(zip, 'META-INF/container.xml');
  if (!containerXml) {
    throw new Error('ePub inválido: no se encontró container.xml');
  }

  const opfPath = extractAttribute(containerXml, 'rootfile', 'full-path');
  if (!opfPath) {
    throw new Error('ePub inválido: no se encontró la ruta al OPF');
  }

  // 2. Read and parse OPF
  const opfXml = await readZipFile(zip, opfPath);
  if (!opfXml) {
    throw new Error('ePub inválido: no se encontró el archivo OPF');
  }

  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

  // 3. Extract metadata
  const title = extractTagContent(opfXml, 'dc:title') ?? extractTagContent(opfXml, 'title') ?? 'Sin título';
  const authors = extractAllTagContents(opfXml, 'dc:creator');
  if (authors.length === 0) {
    const fallback = extractAllTagContents(opfXml, 'creator');
    authors.push(...fallback);
  }

  const identifiers = extractAllTagContents(opfXml, 'dc:identifier');
  const { isbn13, isbn10 } = extractISBNs(identifiers);

  // 4. Count spine items as page approximation
  const spineMatches = opfXml.match(/<itemref\b/g);
  const pageCount = spineMatches ? spineMatches.length : 0;

  // 5. Extract cover image
  const coverUrl = await extractCover(zip, opfXml, opfDir, title);

  return {
    title,
    authors: authors.length > 0 ? authors : ['Autor desconocido'],
    coverUrl,
    isbn13,
    isbn10,
    pageCount,
  };
}

async function readFileAsArrayBuffer(uri: string): Promise<ArrayBuffer> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    return response.arrayBuffer();
  }

  // Native: use expo-file-system legacy API
  const FileSystem = await import('expo-file-system/legacy');
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

async function readZipFile(zip: JSZip, path: string): Promise<string | null> {
  const file = zip.file(path);
  if (!file) return null;
  return file.async('text');
}

function extractAttribute(xml: string, tag: string, attr: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*\\s${attr}="([^"]*)"`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : null;
}

function extractTagContent(xml: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : null;
}

function extractAllTagContents(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'gi');
  const results: string[] = [];
  let match;
  while ((match = regex.exec(xml)) !== null) {
    results.push(match[1].trim());
  }
  return results;
}

function extractISBNs(identifiers: string[]): { isbn13: string | null; isbn10: string | null } {
  let isbn13: string | null = null;
  let isbn10: string | null = null;

  for (const id of identifiers) {
    const cleaned = id.replace(/[-\s]/g, '');
    if (/^\d{13}$/.test(cleaned) && (cleaned.startsWith('978') || cleaned.startsWith('979'))) {
      isbn13 = cleaned;
    } else if (/^\d{10}$/.test(cleaned) || /^\d{9}X$/i.test(cleaned)) {
      isbn10 = cleaned;
    }
  }

  return { isbn13, isbn10 };
}

/** Ancho máximo de la tapa guardada en web: va dentro de localStorage, que es chico. */
const WEB_COVER_MAX_WIDTH = 300;

/**
 * Re-extrae la tapa de un ePub ya guardado (en base64). Sirve para reparar libros importados
 * en web cuando la tapa se guardaba como `blob:`, que deja de existir al recargar.
 */
export async function extractCoverFromBase64(base64: string, title: string): Promise<string | null> {
  const zip = await JSZip.loadAsync(base64, { base64: true });
  const containerXml = await readZipFile(zip, 'META-INF/container.xml');
  const opfPath = containerXml ? extractAttribute(containerXml, 'rootfile', 'full-path') : null;
  const opfXml = opfPath ? await readZipFile(zip, opfPath) : null;
  if (!opfPath || !opfXml) return null;
  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';
  return extractCover(zip, opfXml, opfDir, title);
}

async function extractCover(
  zip: JSZip,
  opfXml: string,
  opfDir: string,
  title: string,
): Promise<string | null> {
  const coverHref = findCoverHref(opfXml);
  if (!coverHref) return null;

  const coverFile = zip.file(resolveZipPath(opfDir, coverHref));
  if (!coverFile) return null;

  try {
    const ext = coverHref.match(/\.(jpe?g|png|gif|webp)$/i)?.[1]?.toLowerCase() ?? 'jpg';
    const mimeType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

    if (Platform.OS === 'web') {
      const coverBytes = await coverFile.async('uint8array');
      return await toCompactDataUrl(coverBytes, mimeType);
    }

    // Native: save to document directory
    const FileSystem = await import('expo-file-system/legacy');
    const safeName = title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
    const localPath = `${FileSystem.documentDirectory}cover_${safeName}.${ext === 'jpeg' ? 'jpg' : ext}`;
    const coverBase64 = await coverFile.async('base64');
    await FileSystem.writeAsStringAsync(localPath, coverBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return localPath;
  } catch {
    return null;
  }
}

/** Resuelve el href del manifiesto (relativo al OPF, a veces con `../` o %20) a una ruta del zip. */
export function resolveZipPath(opfDir: string, href: string): string {
  let path = href.split('#')[0];
  try {
    path = decodeURIComponent(path);
  } catch {
    // href mal codificado: se usa tal cual.
  }
  const parts = (path.startsWith('/') ? path.slice(1) : opfDir + path).split('/');
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === '..') resolved.pop();
    else if (part !== '.' && part !== '') resolved.push(part);
  }
  return resolved.join('/');
}

/**
 * En web la tapa se guarda como data URL (un `blob:` muere al recargar), reducida a JPEG
 * para no llenar localStorage.
 */
async function toCompactDataUrl(bytes: Uint8Array, mimeType: string): Promise<string> {
  const url = URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: mimeType }));
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new window.Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('No se pudo leer la tapa'));
      image.src = url;
    });
    const scale = Math.min(1, WEB_COVER_MAX_WIDTH / img.naturalWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas no disponible');
    ctx.fillStyle = '#fff'; // las PNG con transparencia no quedan negras en JPEG
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Find cover image href from OPF manifest using multiple strategies. */
function findCoverHref(opfXml: string): string | null {
  const items: { id: string; href: string; properties: string; mediaType: string }[] = [];
  const itemRegex = /<item\b([^>]*)\/?\s*>/gi;
  let m;
  while ((m = itemRegex.exec(opfXml)) !== null) {
    const attrs = m[1];
    items.push({
      id: getAttr(attrs, 'id'),
      href: getAttr(attrs, 'href'),
      properties: getAttr(attrs, 'properties'),
      mediaType: getAttr(attrs, 'media-type'),
    });
  }

  // Strategy 1: item with properties="cover-image" (ePub 3)
  const byProp = items.find((i) => i.properties.includes('cover-image'));
  if (byProp) return byProp.href;

  // Strategy 2: <meta name="cover" content="item-id"> (ePub 2)
  const metaMatch = opfXml.match(/<meta[^>]*name="cover"[^>]*content="([^"]+)"/i)
    ?? opfXml.match(/<meta[^>]*content="([^"]+)"[^>]*name="cover"/i);
  if (metaMatch) {
    const byId = items.find((i) => i.id === metaMatch[1]);
    if (byId) return byId.href;
  }

  // Strategy 3: item with id containing "cover" and image media type
  const byCoverId = items.find(
    (i) => /cover/i.test(i.id) && i.mediaType.startsWith('image/'),
  );
  if (byCoverId) return byCoverId.href;

  return null;
}

function getAttr(attrs: string, name: string): string {
  const match = attrs.match(new RegExp(`${name}="([^"]*)"`, 'i'));
  return match ? match[1] : '';
}
