export interface ReaderPosition {
  cfi: string;
  updatedAt: string; // ISO date
  /** Avance en el libro (0-1) según las locations de epub.js, si ya estaban generadas. */
  percent?: number;
  /** Capítulo de la tabla de contenidos donde quedó el lector. */
  chapter?: string;
}

export type ReaderThemeName = 'light' | 'dark' | 'sepia';
export type ReaderLineHeight = 'compact' | 'normal' | 'relaxed';
export type ReaderMargin = 'normal' | 'wide' | 'wider';

export interface ReaderTheme {
  fontSize: number; // percentage, default 100
  fontFamily: 'default' | 'serif' | 'sans-serif' | 'monospace';
  theme: ReaderThemeName;
  /** Opcionales: los ajustes guardados antes de que existieran no los tienen. */
  lineHeight?: ReaderLineHeight;
  margin?: ReaderMargin;
}
