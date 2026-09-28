/**
 * Design tokens para Aleph.
 *
 * `spacing`, `radius`, `fontSize` y `fontWeight` son constantes (no dependen del
 * tema). Los colores tienen una paleta clara y una oscura con las mismas claves;
 * los componentes obtienen la activa con `useTheme()`, que sigue al esquema del
 * sistema vía `useColorScheme()`.
 */

import { useColorScheme } from "react-native";

export const lightColors = {
  // Superficies
  background: "#fff",
  surface: "#f5f5f5",
  surfaceAlt: "#f9f9f9",
  surfaceTint: "#f0f7ff", // fondo de botón celeste suave
  card: "#fff", // tarjetas elevadas / modales sobre el backdrop

  // Texto
  textPrimary: "#000",
  textSecondary: "#666",
  textTertiary: "#999",
  textMuted: "#888",

  // Marca / semántico
  primary: "#007AFF",
  primaryTint: "#EBF2FF",
  success: "#34C759",
  warning: "#FF9500",
  danger: "#FF3B30",
  dangerStrong: "#c00",
  accent: "#8B5CF6",

  // Líneas / rellenos
  border: "#ddd",
  borderLight: "#e0e0e0",
  divider: "#f0f0f0",
  track: "#ddd", // fondo de barras de progreso

  // Chip de tag
  tagText: "#1A73E8",
  tagBg: "#E8F0FE",

  // Texto sobre color
  onPrimary: "#fff",

  // Tint neutro para íconos de placeholder / estados vacíos
  icon: "#ccc",
} as const;

export type ThemeColors = Record<keyof typeof lightColors, string>;

export const darkColors: ThemeColors = {
  // Superficies (escala iOS dark)
  background: "#000",
  surface: "#1c1c1e",
  surfaceAlt: "#2c2c2e",
  surfaceTint: "#0a2540",
  card: "#1c1c1e",

  // Texto
  textPrimary: "#fff",
  textSecondary: "#aeaeb2",
  textTertiary: "#8e8e93",
  textMuted: "#8e8e93",

  // Marca / semántico (variantes dark de iOS)
  primary: "#0A84FF",
  primaryTint: "#0a2a4a",
  success: "#30D158",
  warning: "#FF9F0A",
  danger: "#FF453A",
  dangerStrong: "#FF6961",
  accent: "#9F7AEA",

  // Líneas / rellenos
  border: "#38383a",
  borderLight: "#48484a",
  divider: "#2c2c2e",
  track: "#3a3a3c",

  // Chip de tag
  tagText: "#8AB4F8",
  tagBg: "#1e3a5f",

  // Texto sobre color
  onPrimary: "#fff",

  // Tint neutro para íconos de placeholder / estados vacíos
  icon: "#5a5a5e",
};

/** Devuelve la paleta activa según el esquema de color del sistema. */
export function useTheme(): ThemeColors {
  const scheme = useColorScheme();
  return scheme === "dark" ? darkColors : lightColors;
}

/**
 * Alias estático a la paleta clara. Sirve de fallback para usos fuera de
 * componentes; dentro de componentes preferí `useTheme()` para que respeten el
 * dark mode.
 */
export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 10,
  xl: 12,
  pill: 999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 14,
  base: 15,
  lg: 16,
  xl: 17,
  xxl: 20,
  title: 24,
  display: 28,
  hero: 32,
  timer: 64,
} as const;

export const fontWeight = {
  thin: "200",
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;
