import type { SpeciesConfig, DepthLayer } from './fish';
import type { DangerZone } from '../data/types';

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
  type: 'FISHING' | 'PREDATOR' | 'STORM' | 'DEAD_ZONE' | 'HIGH_RISK';
  name: string;
  severity: number;
  coord: [number, number];
  radius: number;
}

export type CurrentAlignment = 'WITH' | 'AGAINST' | 'CROSS';

/** The one ocean current acting on the fish this tick. */
export interface CurrentEffect {
  id: string;
  nameKo: string;
  /** Speed multiplier the engine applied, e.g. 1.28 (순류) or 0.82 (역류). */
  factor: number;
  alignment: CurrentAlignment;
  /** 0..1, 1 = on the current's axis. */
  proximity: number;
}

/** Strongest danger zone around the fish, for atmosphere and stamina drain (not the threat roll). */
export interface EnvironmentHazard {
  type: DangerZone['type'];
  id: string;
  nameKo: string;
  /** 0..1 = baseDanger × proximity × seasonal peak, clamped. */
  intensity: number;
}

/** Food available at the fish's position. */
export interface FeedingStatus {
  /** 0..1, 0 = barren water. */
  density: number;
  groundId: string | null;
  groundNameKo: string | null;
  prey: string | null;
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
  skillRemainingSeconds: number;
  skillCooldownRemaining: number;
  isSleepModeActive: boolean;
  /** True only while sleep mode is armed AND the simulated clock is inside the night window. */
  isSleeping: boolean;
  sleepStart: number;
  sleepEnd: number;
  /** Effective cruising speed for the last tick, as the engine actually applied it. */
  currentSpeedKmH: number;
  dangerCountdown: number;
  currentDanger: DangerEvent | null;
  dnaPoints: number;
  totalDnaEarned: number;
  logs: LogEntry[];
  gravesites: Gravesite[];
  pathHistory: [number, number][];
  simSpeed: number;
  deathCause: string;

  // Environment — recomputed by the engine every tick.
  /** Simulated local hour, 0..24. */
  simHour: number;
  /** 1-based voyage day. */
  simDay: number;
  currentEffect: CurrentEffect | null;
  nearbyHazard: EnvironmentHazard | null;

  // Stamina & feeding.
  /** 0..100. Below 30 the fish slows and evades worse; 24 sim-hours at 0 is fatal. */
  stamina: number;
  food: FeedingStatus;
  isFeeding: boolean;
  /** Sim seconds left in the current hunt. */
  feedingRemainingSeconds: number;
  /** Sim seconds until the next hunt is allowed. */
  huntCooldownRemaining: number;
  /** Sim seconds spent at stamina 0. */
  starvingSeconds: number;
}

export interface LogEntry {
  time: string;
  message: string;
  type: 'info' | 'warning' | 'danger' | 'success' | 'system';
}
