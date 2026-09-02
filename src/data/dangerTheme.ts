import type { DangerEvent } from '../types/game';

export interface DangerTheme {
  icon: string;
  /** Banner headline, e.g. "어선 출몰!" */
  label: string;
  /** Accent colour for text and borders. */
  hex: string;
  /** Same colour as an "r,g,b" triplet so callers can pick their own alpha. */
  rgb: string;
}

// Single source of truth for how each danger type looks, shared by the alert
// modal, the banner and the screen effects so they never disagree.
export const DANGER_THEME: Record<DangerEvent['type'], DangerTheme> = {
  FISHING:   { icon: '🚢', label: '어선 출몰!',   hex: '#fb923c', rgb: '251,146,60' },
  STORM:     { icon: '🌀', label: '태풍 출몰!',   hex: '#c084fc', rgb: '192,132,252' },
  PREDATOR:  { icon: '🦈', label: '포식자 접근!', hex: '#f87171', rgb: '248,113,113' },
  DEAD_ZONE: { icon: '☠️', label: '데드존 진입!', hex: '#4ade80', rgb: '74,222,128' },
  HIGH_RISK: { icon: '⚓', label: '선박 밀집!',   hex: '#fbbf24', rgb: '251,191,36' },
};

export const dangerRgba = (type: DangerEvent['type'], alpha: number) =>
  `rgba(${DANGER_THEME[type].rgb},${alpha})`;
