/**
 * Design tokens — Syncology Android
 * Dark mode by default, mengikuti palet warna desktop.
 */

export const Colors = {
  // Background layers
  bg0: '#0a0a0f',
  bg1: '#0f1117',
  bg2: '#161b27',
  bg3: '#1e2533',
  bg4: '#252d3d',

  // Surface / card
  surface: 'rgba(255,255,255,0.04)',
  surfaceHover: 'rgba(255,255,255,0.08)',
  border: 'rgba(255,255,255,0.09)',
  borderStrong: 'rgba(255,255,255,0.16)',

  // Brand gradient stops
  blue: '#3b82f6',
  blueLight: '#60a5fa',
  indigo: '#6366f1',
  indigoLight: '#818cf8',
  sky: '#38bdf8',

  // Text
  text1: '#f1f5f9',
  text2: '#94a3b8',
  text3: '#64748b',
  textMuted: 'rgba(148,163,184,0.6)',

  // Semantic
  green: '#22c55e',
  greenDim: 'rgba(34,197,94,0.15)',
  greenBorder: 'rgba(34,197,94,0.3)',
  red: '#ef4444',
  redDim: 'rgba(239,68,68,0.12)',
  redBorder: 'rgba(239,68,68,0.25)',
  yellow: '#eab308',
  yellowDim: 'rgba(234,179,8,0.12)',
  orange: '#f97316',

  // Status colors (task status)
  statusProposed: '#6366f1',
  statusTodo: '#3b82f6',
  statusUnderReview: '#eab308',
  statusCompleted: '#22c55e',
  statusDisputed: '#ef4444',

  // White / Black helpers
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
} as const;

export type ColorKey = keyof typeof Colors;
