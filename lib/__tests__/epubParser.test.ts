import { resolveZipPath } from '../epubParser';

test('resolves manifest hrefs relative to the OPF folder', () => {
  expect(resolveZipPath('OEBPS/', 'images/cover.jpg')).toBe('OEBPS/images/cover.jpg');
  expect(resolveZipPath('', 'cover.jpg')).toBe('cover.jpg');
});

test('handles ../, ./, absolute paths, fragments and percent-encoding', () => {
  expect(resolveZipPath('OEBPS/text/', '../images/cover.jpg')).toBe('OEBPS/images/cover.jpg');
  expect(resolveZipPath('OEBPS/', './cover.jpg')).toBe('OEBPS/cover.jpg');
  expect(resolveZipPath('OEBPS/', '/cover.jpg')).toBe('cover.jpg');
  expect(resolveZipPath('OEBPS/', 'my%20cover.jpg#x')).toBe('OEBPS/my cover.jpg');
});
