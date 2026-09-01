export interface RouteWaypoint {
  coord: [number, number];
  name: string;
  region: string;
}

export interface OceanCurrent {
  id: string;
  name: string;
  nameKo: string;
  path: [number, number][];
  direction: 'CW' | 'CCW' | 'LINEAR';
  avgSpeedKmH: number;
  boostMultiplier: number;
}

export interface FishingZone {
  id: string;
  name: string;
  nameKo: string;
  center: [number, number];
  radiusKm: number;
  intensity: number;
  gearTypes: string[];
}

export interface MarineProtectedArea {
  id: string;
  name: string;
  nameKo: string;
  center: [number, number];
  radiusKm: number;
  protection: 'FULL' | 'PARTIAL';
}

export interface DangerZone {
  id: string;
  name: string;
  nameKo: string;
  type: 'STORM_CORRIDOR' | 'DEAD_ZONE' | 'HIGH_RISK';
  center: [number, number];
  radiusKm: number;
  seasonalPeak: number[];
  baseDanger: number;
}

export interface SpeciesRealData {
  id: string;
  cruisingSpeedKmH: number;
  burstSpeedKmH: number;
  typicalDepthM: [number, number];
  migrationRangeKm: number;
  naturalPredators: string[];
  dietaryHabits: string;
}
