/**
 * Clasificación de gestos del lector. Es JS plano (ES5) porque se inyecta en el HTML
 * del WebView; los tests lo evalúan con `new Function` para probar la misma fuente.
 */
export const READER_GESTURES_JS = `
var SWIPE_MIN_DISTANCE = 40;
var SWIPE_MAX_DURATION = 800;

/** Deslizar a la izquierda avanza, a la derecha retrocede. Devuelve null si no fue un swipe horizontal. */
function classifySwipe(dx, dy, dt) {
  if (dt > SWIPE_MAX_DURATION) return null;
  if (Math.abs(dx) < SWIPE_MIN_DISTANCE) return null;
  if (Math.abs(dx) < Math.abs(dy) * 1.5) return null;
  return dx < 0 ? 'next' : 'prev';
}

/** Tocar el 30% izquierdo retrocede, el 30% derecho avanza y el centro muestra u oculta las barras. */
function tapZone(x, width) {
  if (x < width * 0.3) return 'prev';
  if (x > width * 0.7) return 'next';
  return 'menu';
}
`;
