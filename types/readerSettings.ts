export interface ReaderPosition {
  cfi: string;
  updatedAt: string; // ISO date
}

export type ReaderThemeName = 'light' | 'dark' | 'sepia';

export interface ReaderTheme {
  fontSize: number; // percentage, default 100
  fontFamily: 'default' | 'serif' | 'sans-serif' | 'monospace';
  theme: ReaderThemeName;
}
