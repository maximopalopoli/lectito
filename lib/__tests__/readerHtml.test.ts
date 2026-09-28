import { getReaderHtml } from '../readerHtml';

test('embeds reader libraries locally and in dependency order', () => {
  const html = getReaderHtml('window.JSZip = "ready";', 'window.ePub = window.JSZip;');

  expect(html).toContain('<script>window.JSZip = "ready";</script>');
  expect(html).toContain('<script>window.ePub = window.JSZip;</script>');
  expect(html.indexOf('window.JSZip =')).toBeLessThan(html.indexOf('window.ePub ='));
  expect(html).not.toMatch(/<script\s+src=/i);
});

test('escapes closing script tags in bundled source', () => {
  const html = getReaderHtml('const marker = "</script>";', 'window.ePub = true;');

  expect(html).toContain('<\\/script>');
  expect(html).not.toContain('const marker = "</script>";');
});
