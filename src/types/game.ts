import type { SpeciesConfig, DepthLayer } from './fish';

export interface Gravesite {
  id: string;
  coord: [number, number];
  species: string;
  nickname: string;
  causeOfDeath: string;
  diedAt: string;
  distanceTraveled: number;
}

export interface DangerEvent {
  type: 'FISHING' | 'PREDATOR' | 'STORM' | 'DEAD_ZONE';
  name: string;
  severity: number;
  coord: [number, number];
  radius: number;
}

export interface GameState {
  phase: 'MENU' | 'SPECIES_SELECT' | 'PLAYING' | 'DANGER_ALERT' | 'GAME_OVER' | 'CLEARED';
  species: SpeciesConfig | null;
  currentCoord: [number, number];
  startCoord: [number, number];
  depth: DepthLayer;
  progressPct: number;
  distanceKm: number;
  elapsedSeconds: number;
  shieldTokens: number;
  isBoostActive: boolean;
  boostRemainingSeconds: number;
  boostCooldownRemaining: number;
  isSkillActive: boolean;
  skillCooldownRemaining: number;
  isSleepModeActive: boolean;
  sleepStart: number;
  sleepEnd: number;
  dangerCountdown: number;
  currentDanger: DangerEvent | null;
  dnaPoints: number;
  totalDnaEarned: number;
  logs: LogEntry[];
  gravesites: Gravesite[];
  pathHistory: [number, number][];
  simSpeed: number;
  deathCause: string;
}

export interface LogEntry {
  time: string;
  message: string;
  type: 'info' | 'warning' | 'danger' | 'success' | 'system';
}
