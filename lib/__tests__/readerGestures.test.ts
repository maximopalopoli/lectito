import { READER_GESTURES_JS } from '../readerGestures';
import { getReaderHtml } from '../readerHtml';

type Direction = 'next' | 'prev';

const { classifySwipe, tapZone } = new Function(
  `${READER_GESTURES_JS}; return { classifySwipe, tapZone };`,
)() as {
  classifySwipe: (dx: number, dy: number, dt: number) => Direction | null;
  tapZone: (x: number, width: number) => Direction | 'menu';
};

test('swiping left turns to the next page and swiping right goes back', () => {
  expect(classifySwipe(-120, 10, 200)).toBe('next');
  expect(classifySwipe(120, -10, 200)).toBe('prev');
});

test('short, vertical or slow drags are not swipes', () => {
  expect(classifySwipe(-20, 0, 100)).toBeNull();
  expect(classifySwipe(-80, 120, 200)).toBeNull();
  expect(classifySwipe(-200, 0, 1500)).toBeNull();
});

test('taps on the sides turn pages and the center toggles the toolbars', () => {
  expect(tapZone(30, 400)).toBe('prev');
  expect(tapZone(200, 400)).toBe('menu');
  expect(tapZone(370, 400)).toBe('next');
});

test('the reader page embeds the gesture helpers', () => {
  const html = getReaderHtml('', '');
  expect(html).toContain('function classifySwipe(');
  expect(html).toContain('function tapZone(');
});
