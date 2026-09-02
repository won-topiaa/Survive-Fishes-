import type { GameState, LogEntry, DangerEvent, Gravesite, CurrentEffect, EnvironmentHazard, FeedingStatus } from '../types/game';
import type { SpeciesConfig, DepthLayer, SpeciesTier } from '../types/fish';
import type { FishingZone, MarineProtectedArea } from '../data/types';
import { WORLD_TOUR_ROUTE, ROUTE_TOTAL_DISTANCE_KM, ROUTE_LEG_TABLES } from '../data/oceanRoutes';
import { OCEAN_CURRENTS } from '../data/currents';
import { FISHING_ZONES } from '../data/fishingZones';
import { MARINE_PROTECTED_AREAS } from '../data/marineProtectedAreas';
import { DANGER_ZONES } from '../data/dangerZones';
import { findFeedingGround } from '../data/feedingGrounds';
import { SPECIES_REAL_DATA } from '../data/speciesData';
import type { LatLng } from '../utils/geo';
import {
  distanceToSegment, lerpMercator, arcTableToT, samplePath, minDistanceToPoint,
  bearingRad, haversineKm, clamp,
} from '../utils/geo';
import { formatKm, formatSleepWindow } from '../utils/format';

const TOTAL_DISTANCE_KM = ROUTE_TOTAL_DISTANCE_KM;
const BASE_COMPLETION_SECONDS = 21 * 24 * 3600;
const BOOST_DURATION = 30 * 60;
const BOOST_COOLDOWN = 5 * 3600;
// Real seconds. The simulation is paused while an alert is open, so the evade
// window must not scale with simSpeed.
export const DANGER_COUNTDOWN = 300;
const SHIELD_MAX = 2;
const PATH_SAMPLE_KM = 10;
const PATH_SAMPLE_MAX_STEPS = 64;
const PATH_HISTORY_MAX = 800;

// Currents. A current within CURRENT_BAND_KM of the fish speeds it up when the
// route runs with the flow and slows it down against it; surface currents
// weaken with depth, and a headwind costs a little less than the matching
// tailwind gives.
const CURRENT_BAND_KM = 300;
const CURRENT_HEADWIND_RATIO = 0.8;
const CURRENT_DEPTH_FACTOR: Record<DepthLayer, number> = { SURFACE: 1.0, MID: 0.75, ABYSS: 0.3 };
const CURRENT_CROSS_COS = 0.35;
const CURRENT_LOG_PROXIMITY = 0.5;

// Stamina. Both the drain and the grazing regen scale with the species' speed
// multiplier ("metabolism"), so the budget is per km travelled rather than per
// sim-hour and every tier experiences the same hunger curve along the route:
// 100 % ≈ 15,500 km of open water, which is more than the barren Pacific
// crossing but not by much.
const STAMINA_MAX = 100;
const STAMINA_FULL_DAYS = 4;
const STAMINA_DRAIN_PER_SEC = STAMINA_MAX / (STAMINA_FULL_DAYS * 86400);
const STAMINA_GRAZE_HOURS = 8;
const STAMINA_GRAZE_PER_SEC = STAMINA_MAX / (STAMINA_GRAZE_HOURS * 3600);
const ABYSS_DRAIN = 1.1;   // on top of the halved speed, i.e. ~2.2× per km
const SLEEP_DRAIN = 0.4;
const BOOST_DRAIN = 2.0;
export const HUNT_DURATION = 20 * 60;
export const HUNT_GAIN = 45;             // × food density
const HUNT_COOLDOWN = 3 * 3600;          // ÷ metabolism
export const HUNT_MIN_DENSITY = 0.25;
const STAMINA_HUNGRY = 30;
const STAMINA_EXHAUSTED = 10;
const STAMINA_RECOVERED = 35;
export const STARVATION_SECONDS = 86400;
const HAZARD_LOG_MIN_INTENSITY = 0.1;

// Per-check chance that a natural predator is nearby, before the depth multiplier
// and the shared trigger roll in the tick. Severity must clear the tier threshold
// (SMALL 0.20, MEDIUM/LARGE 0.35, APEX 0.50) or the encounter can never fire.
const PREDATOR_ENCOUNTER: Record<SpeciesTier, number> = { SMALL: 0.03, MEDIUM: 0.012, LARGE: 0.005, APEX: 0.0005 };
const PREDATOR_SEVERITY: Record<SpeciesTier, number> = { SMALL: 0.65, MEDIUM: 0.5, LARGE: 0.45, APEX: 0.55 };

const NO_DANGER = { level: 0, source: null } as const;
const NO_FOOD: FeedingStatus = { density: 0, groundId: null, groundNameKo: null, prey: null };

type StaminaStage = 'OK' | 'HUNGRY' | 'EXHAUSTED' | 'STARVING';
const STAGE_RANK: Record<StaminaStage, number> = { OK: 0, HUNGRY: 1, EXHAUSTED: 2, STARVING: 3 };

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

const ROUTE_LEN = WORLD_TOUR_ROUTE.length;

function legEndpoints(index: number): [LatLng, LatLng] {
  return [WORLD_TOUR_ROUTE[index].coord, WORLD_TOUR_ROUTE[(index + 1) % ROUTE_LEN].coord];
}

// Leg i runs from waypoint i to waypoint (i + 1) % ROUTE_LEN, so the route is a
// loop and a voyage that starts mid-route still circles back to its origin.
// Positions follow the straight line the map draws between waypoints, and each
// leg's arc table keeps progress along it uniform in km, not in Mercator t.
const LEG_KM: number[] = ROUTE_LEG_TABLES.map(table => table.totalKm);

// `fraction` is the share of the leg's km already covered.
function pointOnLeg(index: number, fraction: number): LatLng {
  const [from, to] = legEndpoints(index);
  return lerpMercator(from, to, arcTableToT(ROUTE_LEG_TABLES[index], fraction * LEG_KM[index]));
}

// Heading of the route at `fraction` along leg `index`, taken from the arc
// table's sub-segment the fish is on (the table's t values are evenly spaced).
function legHeadingRad(index: number, fraction: number): number {
  const table = ROUTE_LEG_TABLES[index];
  const tm = arcTableToT(table, fraction * table.totalKm);
  const steps = table.points.length - 1;
  const j = clamp(Math.floor(tm * steps), 0, steps - 1);
  return bearingRad(table.points[j], table.points[j + 1]);
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const SAMPLE_GRAVESITES: Gravesite[] = [
  { id: 'g1', coord: [35.2, 129.8], species: '고등어', nickname: '참치장인', causeOfDeath: '동해 정치망 어선단 진입', diedAt: '2024-03-15', distanceTraveled: 12400 },
  { id: 'g2', coord: [25.0, -80.5], species: '날치', nickname: 'SpeedRunner', causeOfDeath: '카리브해 바라쿠다 포식', diedAt: '2024-03-18', distanceTraveled: 31200 },
  { id: 'g3', coord: [-35.0, 20.0], species: '연어', nickname: '남극탐험가', causeOfDeath: '희망봉 폭풍 해역 (아굴라스 해류 충돌)', diedAt: '2024-03-20', distanceTraveled: 8900 },
  { id: 'g4', coord: [2.0, 102.0], species: '멸치', nickname: '작지만강한', causeOfDeath: '말라카 해협 대형 선망 어선', diedAt: '2024-03-22', distanceTraveled: 5600 },
  { id: 'g5', coord: [45.3, -50.0], species: '황새치', nickname: 'SwordMaster', causeOfDeath: '그랜드 뱅크스 연승선 주낙', diedAt: '2024-03-25', distanceTraveled: 22000 },
  { id: 'g6', coord: [-56.0, -66.0], species: '참다랑어', nickname: '드레이크의꿈', causeOfDeath: '드레이크 해협 폭풍 (풍속 50m/s)', diedAt: '2024-04-01', distanceTraveled: 38000 },
  { id: 'g7', coord: [18.0, 135.0], species: '가시복', nickname: 'PufferKing', causeOfDeath: '서태평양 태풍 (카테고리 5)', diedAt: '2024-04-05', distanceTraveled: 4200 },
  { id: 'g8', coord: [-12.0, -78.0], species: '멸치', nickname: 'Anchoa', causeOfDeath: '페루 연안 선망 어선단 (멸치잡이)', diedAt: '2024-04-10', distanceTraveled: 35000 },
];

// Fields that outlive a single voyage.
interface CarryOver {
  gravesites: Gravesite[];
  totalDnaEarned: number;
}

function createInitialState(carry?: CarryOver): GameState {
  return {
    phase: 'MENU',
    species: null,
    currentCoord: [0, 0],
    startCoord: [0, 0],
    depth: 'MID',
    progressPct: 0,
    distanceKm: 0,
    elapsedSeconds: 0,
    shieldTokens: SHIELD_MAX,
    isBoostActive: false,
    boostRemainingSeconds: 0,
    boostCooldownRemaining: 0,
    isSkillActive: false,
    skillRemainingSeconds: 0,
    skillCooldownRemaining: 0,
    isSleepModeActive: false,
    isSleeping: false,
    sleepStart: 23,
    sleepEnd: 7,
    currentSpeedKmH: 0,
    dangerCountdown: 0,
    currentDanger: null,
    dnaPoints: 0,
    totalDnaEarned: carry?.totalDnaEarned ?? 0,
    logs: [],
    gravesites: carry ? [...carry.gravesites] : [...SAMPLE_GRAVESITES],
    pathHistory: [],
    simSpeed: 1,
    deathCause: '',
    simHour: 0,
    simDay: 1,
    currentEffect: null,
    nearbyHazard: null,
    stamina: STAMINA_MAX,
    food: NO_FOOD,
    isFeeding: false,
    feedingRemainingSeconds: 0,
    huntCooldownRemaining: 0,
    starvingSeconds: 0,
  };
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class OceanEngine {
  state: GameState;
  private listeners: Set<() => void> = new Set();
  private tickTimer: number | null = null;
  private dangerTimer: number | null = null;
  private nextDangerCheck = 0;
  private waypointIndex = 0;
  private waypointT = 0;
  private lastRegionLog = '';
  private lastZoneLog = '';
  private lastCurrentKey = '';
  private loggedCurrent: { id: string; nameKo: string } | null = null;
  private lastHazardLog = '';
  private lastFoodLog = '';
  private staminaStage: StaminaStage = 'OK';
  private feedingGainPerSec = 0;
  private voyageStartMonth = 1;
  private voyageStartHour = 0;

  constructor() {
    this.state = createInitialState();
    this.addLog('시스템 초기화 완료. 출발 좌표를 지정하세요...', 'system');
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  notify() {
    this.listeners.forEach(l => l());
  }

  openSpeciesSelect() {
    this.state.phase = 'SPECIES_SELECT';
    this.notify();
  }

  selectSpeciesAndSpawn(species: SpeciesConfig, lat: number, lng: number) {
    this.clearTimers();
    this.resetTrackers();
    this.state = createInitialState(this.carryOver());
    this.state.species = species;

    // Start on the route itself, at the closest point to the pin, so the first
    // tick does not teleport the fish to a waypoint that may be hundreds of km away.
    const start = this.findNearestRoutePosition([lat, lng]);
    this.waypointIndex = start.index;
    this.waypointT = start.t;
    this.state.startCoord = start.point;
    this.state.currentCoord = start.point;
    this.state.pathHistory = [start.point];
    this.state.phase = 'PLAYING';
    this.nextDangerCheck = 30 + Math.random() * 60;

    const now = new Date();
    this.voyageStartMonth = now.getMonth() + 1;
    this.voyageStartHour = now.getHours() + now.getMinutes() / 60;

    const realData = SPECIES_REAL_DATA[species.id];
    const wp = WORLD_TOUR_ROUTE[start.index];

    this.addLog(`${species.emoji} ${species.nameKo}(${species.name})로 출발!`, 'success');
    this.addLog(`출발 좌표: [${start.point[0].toFixed(2)}°, ${start.point[1].toFixed(2)}°]`, 'info');
    if (start.snapKm >= 1) {
      this.addLog(`클릭 지점에서 ${formatKm(start.snapKm)}km 떨어진 가장 가까운 항로 위에서 출발합니다.`, 'system');
    }
    this.addLog(`현재 항로 구간: ${wp.region} (${wp.name})`, 'info');
    this.addLog(`목표: 전 세계 해양 ${TOTAL_DISTANCE_KM.toLocaleString()}km 일주`, 'info');
    this.addLog(`예상 소요: ${species.expectedStandardDays}일 (배율 ${species.baseSpeedMultiplier}x)`, 'info');
    if (realData) {
      this.addLog(`실제 순항 속도: ${realData.cruisingSpeedKmH} km/h | 순간 속도: ${realData.burstSpeedKmH} km/h`, 'system');
    }
    if (species.passiveTrait) {
      this.addLog(`🧬 ${species.passiveTrait.nameKo}: ${species.passiveTrait.description}`, 'system');
    }
    // The clock, currents, hazards and food need the voyage start fields above.
    this.updateEnvironment();
    this.startTick();
    this.notify();
  }

  setDepth(depth: DepthLayer) {
    if (this.state.phase !== 'PLAYING') return;
    const prev = this.state.depth;
    this.state.depth = depth;
    const labels: Record<DepthLayer, string> = {
      SURFACE: '표층 0~50m (+30% 속도, 해류 영향 최대, 어선·포식 취약)',
      MID: '중층 50~200m (표준, 연승선 위험)',
      ABYSS: '심해 200m+ (-50% 속도, 어선·선박 면역, 체력 소모 2배↑)',
    };
    if (prev !== depth) {
      this.addLog(`수심 변경: ${labels[depth]}`, 'info');
    }
    this.notify();
  }

  activateBoost() {
    if (this.state.phase !== 'PLAYING') return;
    if (this.state.boostCooldownRemaining > 0) return;
    this.state.isBoostActive = true;
    this.state.boostRemainingSeconds = BOOST_DURATION;
    this.state.boostCooldownRemaining = BOOST_COOLDOWN;
    this.addLog('2x 터보 부스트 가동! (30분 지속, 쿨다운 5시간, 체력 소모 2배)', 'success');
    this.notify();
  }

  activateSkill() {
    if (this.state.phase !== 'PLAYING') return;
    if (!this.state.species?.activeSkill) return;
    if (this.state.skillCooldownRemaining > 0 || this.state.isSkillActive) return;
    const skill = this.state.species.activeSkill;
    this.state.isSkillActive = true;
    this.state.skillRemainingSeconds = skill.durationSec;
    this.state.skillCooldownRemaining = skill.cooldownSec;
    this.addLog(`${skill.nameKo} 발동! ${skill.description} (${skill.durationSec}초)`, 'success');
    this.notify();
  }

  toggleSleepMode() {
    if (this.state.phase !== 'PLAYING' && this.state.phase !== 'DANGER_ALERT') return;
    this.state.isSleepModeActive = !this.state.isSleepModeActive;
    this.state.isSleeping = this.isSleeping();
    if (this.state.isSleepModeActive) {
      const window = formatSleepWindow(this.state.sleepStart, this.state.sleepEnd);
      this.addLog(`야간 잠항 예약 ON (매일 ${window} 어선·선박·포식 면역, 속도 -70%, 체력 소모 -60%)`, 'info');
    } else {
      this.addLog('야간 잠항 예약 OFF', 'info');
    }
    this.notify();
  }

  setSimSpeed(speed: number) {
    this.state.simSpeed = speed;
    this.addLog(`시뮬레이션 속도: ${speed}x`, 'system');
    this.notify();
  }

  // Stop for HUNT_DURATION sim-seconds and eat what the local ground offers.
  hunt() {
    const s = this.state;
    if (s.phase !== 'PLAYING') return;
    if (s.isFeeding || s.huntCooldownRemaining > 0) return;
    if (s.food.density < HUNT_MIN_DENSITY) {
      this.addLog('이 해역은 먹이가 부족합니다. 먹이 지대(🦐) 중심부로 이동하세요.', 'warning');
      this.notify();
      return;
    }
    const gain = HUNT_GAIN * s.food.density;
    s.isFeeding = true;
    s.feedingRemainingSeconds = HUNT_DURATION;
    this.feedingGainPerSec = gain / HUNT_DURATION;
    s.huntCooldownRemaining = HUNT_COOLDOWN / this.metabolism();
    s.currentSpeedKmH = 0;   // the fish stops now, not at the next tick
    this.addLog(
      `🍽️ 먹이 사냥 시작 — ${s.food.groundNameKo} (${s.food.prey}) · ${HUNT_DURATION / 60}분 정지, 예상 +${Math.round(gain)}%`,
      'success',
    );
    this.notify();
  }

  evadeDanger() {
    if (this.state.phase !== 'DANGER_ALERT') return;
    this.clearDangerTimer();
    this.state.phase = 'PLAYING';
    this.state.dangerCountdown = 0;
    this.state.currentDanger = null;
    this.addLog('긴급 회피 성공! 안전 지대로 이탈.', 'success');
    this.nextDangerCheck = this.state.elapsedSeconds + 90 + Math.random() * 120;
    this.notify();
  }

  restart() {
    this.clearTimers();
    this.resetTrackers();
    this.state = createInitialState(this.carryOver());
    this.state.phase = 'MENU';
    this.addLog('시스템 재시작. 새 항해를 시작하세요.', 'system');
    this.notify();
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private carryOver(): CarryOver {
    return { gravesites: this.state.gravesites, totalDnaEarned: this.state.totalDnaEarned };
  }

  private resetTrackers() {
    this.lastRegionLog = '';
    this.lastZoneLog = '';
    this.lastCurrentKey = '';
    this.loggedCurrent = null;
    this.lastHazardLog = '';
    this.lastFoodLog = '';
    this.staminaStage = 'OK';
    this.feedingGainPerSec = 0;
  }

  private clearDangerTimer() {
    if (this.dangerTimer !== null) {
      clearInterval(this.dangerTimer);
      this.dangerTimer = null;
    }
  }

  private clearTimers() {
    if (this.tickTimer !== null) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    this.clearDangerTimer();
  }

  private addLog(message: string, type: LogEntry['type']) {
    const now = new Date();
    const time = now.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.state.logs.unshift({ time, message, type });
    if (this.state.logs.length > 100) this.state.logs.pop();
  }

  private getSimulatedHour(): number {
    return (this.voyageStartHour + this.state.elapsedSeconds / 3600) % 24;
  }

  private getSimulatedMonth(): number {
    const monthsElapsed = Math.floor(this.state.elapsedSeconds / (30 * 86400));
    return ((this.voyageStartMonth - 1 + monthsElapsed) % 12) + 1;
  }

  private isSleeping(): boolean {
    if (!this.state.isSleepModeActive) return false;
    const hour = this.getSimulatedHour();
    const { sleepStart, sleepEnd } = this.state;
    return sleepStart > sleepEnd
      ? hour >= sleepStart || hour < sleepEnd
      : hour >= sleepStart && hour < sleepEnd;
  }

  // Speed multiplier stands in for metabolic rate: fast species burn and eat faster.
  private metabolism(): number {
    return this.state.species?.baseSpeedMultiplier ?? 1;
  }

  // Passive trait always applies; the active skill's value applies while it runs.
  private reduction(kind: 'headwindReduction' | 'abyssDrainReduction'): number {
    const species = this.state.species;
    if (!species) return 0;
    const passive = species.passiveTrait?.[kind] ?? 0;
    const active = this.state.isSkillActive ? species.activeSkill?.[kind] ?? 0 : 0;
    return clamp(Math.max(passive, active), 0, 1);
  }

  // Vessels (fishing fleets, shipping lanes, pirates) only threaten a fish they can
  // reach: not while it is night-diving, and never at abyssal depth.
  private vesselsCanReach(sleeping: boolean): boolean {
    return !sleeping && this.state.depth !== 'ABYSS';
  }

  // Closest point on the drawn route to p. Each leg is measured through its arc
  // table's sub-segments, i.e. against the Mercator-straight line the fish will
  // actually travel, not the great circle between the waypoints.
  private findNearestRoutePosition(p: LatLng): { index: number; t: number; point: LatLng; snapKm: number } {
    let best = { index: 0, fraction: 0, distKm: Infinity };
    for (let i = 0; i < ROUTE_LEN; i++) {
      const table = ROUTE_LEG_TABLES[i];
      for (let j = 0; j < table.points.length - 1; j++) {
        const { distKm, t } = distanceToSegment(p, table.points[j], table.points[j + 1]);
        if (distKm < best.distKm) {
          const km = table.km[j] + t * (table.km[j + 1] - table.km[j]);
          best = { index: i, fraction: table.totalKm > 0 ? km / table.totalKm : 0, distKm };
        }
      }
    }
    return { index: best.index, t: best.fraction, point: pointOnLeg(best.index, best.fraction), snapKm: best.distKm };
  }

  // The one current that matters this tick: the in-band current segment whose
  // effect (with or against the route heading) is strongest. Path point order is
  // the flow direction for every current in the data.
  private computeCurrentEffect(): CurrentEffect | null {
    const pos = this.state.currentCoord;
    const heading = legHeadingRad(this.waypointIndex, this.waypointT);
    const depthFactor = CURRENT_DEPTH_FACTOR[this.state.depth];
    const headwindKeep = 1 - this.reduction('headwindReduction');
    let best: CurrentEffect | null = null;

    for (const current of OCEAN_CURRENTS) {
      for (let i = 0; i < current.path.length - 1; i++) {
        const a = current.path[i];
        const b = current.path[i + 1];
        const { distKm } = distanceToSegment(pos, a, b);
        if (distKm >= CURRENT_BAND_KM) continue;

        const proximity = 1 - distKm / CURRENT_BAND_KM;
        const cos = Math.cos(heading - bearingRad(a, b));
        const strength = (current.boostMultiplier - 1) * proximity * depthFactor;
        const factor = cos >= 0
          ? 1 + strength * cos
          : 1 - strength * -cos * CURRENT_HEADWIND_RATIO * headwindKeep;
        const alignment = Math.abs(cos) < CURRENT_CROSS_COS ? 'CROSS' : cos > 0 ? 'WITH' : 'AGAINST';

        if (!best || Math.abs(factor - 1) > Math.abs(best.factor - 1)) {
          best = { id: current.id, nameKo: current.nameKo, factor, alignment, proximity };
        }
      }
    }
    return best;
  }

  private updateCurrentEffect() {
    const effect = this.computeCurrentEffect();
    this.state.currentEffect = effect;

    if (this.loggedCurrent && (!effect || effect.id !== this.loggedCurrent.id)) {
      this.addLog(`🌊 ${this.loggedCurrent.nameKo} 이탈`, 'system');
      this.loggedCurrent = null;
      this.lastCurrentKey = '';
    }
    if (!effect || effect.proximity <= CURRENT_LOG_PROXIMITY) return;

    const key = `${effect.id}:${effect.alignment}`;
    if (key === this.lastCurrentKey) return;
    this.lastCurrentKey = key;
    this.loggedCurrent = { id: effect.id, nameKo: effect.nameKo };

    const pct = Math.round(Math.abs(effect.factor - 1) * 100);
    if (effect.alignment === 'WITH') {
      const avg = OCEAN_CURRENTS.find(c => c.id === effect.id)?.avgSpeedKmH ?? 0;
      this.addLog(`🌊 ${effect.nameKo} 순류 진입 — 해류 가속 +${pct}% (${avg}km/h)`, 'info');
    } else if (effect.alignment === 'AGAINST') {
      this.addLog(`🌊 ${effect.nameKo} 역류! 속도 -${pct}%, 체력 소모 증가 (표층일수록 해류 영향이 큽니다)`, 'warning');
    } else {
      this.addLog(`🌊 ${effect.nameKo} 횡단 중 (해류 영향 미미)`, 'system');
    }
  }

  // Strongest danger zone around the fish. This drives the weather effects and
  // the stamina drain, not the threat roll, so nothing is filtered by depth.
  private updateNearbyHazard() {
    const pos = this.state.currentCoord;
    const month = this.getSimulatedMonth();
    let hazard: EnvironmentHazard | null = null;
    let peak = 0;   // the zone's intensity at its centre this month

    for (const zone of DANGER_ZONES) {
      const d = haversineKm(pos, zone.center);
      if (d >= zone.radiusKm) continue;
      const seasonal = zone.seasonalPeak.includes(month) ? 1.3 : 1;
      const intensity = Math.min(1, zone.baseDanger * (1 - d / zone.radiusKm) * seasonal);
      if (!hazard || intensity > hazard.intensity) {
        hazard = { type: zone.type, id: zone.id, nameKo: zone.nameKo, intensity };
        peak = Math.min(1, zone.baseDanger * seasonal);
      }
    }
    this.state.nearbyHazard = hazard;

    if (!hazard) {
      this.lastHazardLog = '';
      return;
    }
    // Logged at the zone's edge, so quote the strength it builds up to.
    if (hazard.id === this.lastHazardLog || hazard.intensity < HAZARD_LOG_MIN_INTENSITY) return;
    this.lastHazardLog = hazard.id;
    const pct = Math.round(peak * 100);
    if (hazard.type === 'STORM_CORRIDOR') {
      this.addLog(`🌀 ${hazard.nameKo} 접근 — 폭풍우 해역 (최대 강도 ${pct}%, 체력 소모 증가)`, 'warning');
    } else if (hazard.type === 'DEAD_ZONE') {
      this.addLog(`☠️ ${hazard.nameKo} — 저산소 해역, 체력 소모 증가`, 'warning');
    } else {
      this.addLog(`⚓ ${hazard.nameKo} — 선박 밀집 해역`, 'warning');
    }
  }

  private updateFood() {
    const found = findFeedingGround(this.state.currentCoord);
    this.state.food = found
      ? { density: found.density, groundId: found.ground.id, groundNameKo: found.ground.nameKo, prey: found.ground.prey }
      : NO_FOOD;

    if (!found) {
      this.lastFoodLog = '';
      return;
    }
    // Log once the fish is far enough inside the ground that a hunt is possible.
    // The message quotes the ground's richness: the live density at this moment
    // is just the gate value, and the HUD/EnvironmentBar already show it.
    if (found.ground.id === this.lastFoodLog || found.density < HUNT_MIN_DENSITY) return;
    this.lastFoodLog = found.ground.id;
    this.addLog(`🦐 ${found.ground.nameKo} 진입 — ${found.ground.prey} (먹이 풍부도 ${Math.round(found.ground.richness * 100)}%)`, 'info');
  }

  // Everything the surroundings decide: clock, hazard, food and current. Runs
  // at the top of every tick (after the clock advanced) and once at spawn.
  private updateEnvironment() {
    this.state.simHour = this.getSimulatedHour();
    this.state.simDay = Math.floor(this.state.elapsedSeconds / 86400) + 1;
    this.updateNearbyHazard();
    this.updateFood();
    this.updateCurrentEffect();
  }

  // Pure lookup: closest MPA whose radius the path enters, or null.
  private findMPA(path: [number, number][]): MarineProtectedArea | null {
    let closest: MarineProtectedArea | null = null;
    let closestDist = Infinity;
    for (const mpa of MARINE_PROTECTED_AREAS) {
      const d = minDistanceToPoint(path, mpa.center);
      if (d < mpa.radiusKm && d < closestDist) {
        closest = mpa;
        closestDist = d;
      }
    }
    return closest;
  }

  private logMPAEntry(mpa: MarineProtectedArea) {
    if (this.lastZoneLog === mpa.id) return;
    this.lastZoneLog = mpa.id;
    const riskLabel = mpa.protection === 'FULL' ? '어업 위험 0%' : '어업 위험 50% 감소';
    this.addLog(`🏝️ ${mpa.nameKo} 진입 (해양보호구역, ${riskLabel})`, 'success');
  }

  // Pure: strongest fishing pressure along the path, after the MPA effect.
  private getFishingIntensity(path: LatLng[], mpa: MarineProtectedArea | null): { intensity: number; zone: FishingZone | null } {
    if (mpa?.protection === 'FULL') return { intensity: 0, zone: null };

    let maxIntensity = 0;
    let bestZone: FishingZone | null = null;
    for (const zone of FISHING_ZONES) {
      const d = minDistanceToPoint(path, zone.center);
      if (d < zone.radiusKm) {
        const proximity = 1 - d / zone.radiusKm;
        const intensity = zone.intensity * proximity;
        if (intensity > maxIntensity) { maxIntensity = intensity; bestZone = zone; }
      }
    }
    if (mpa?.protection === 'PARTIAL') maxIntensity *= 0.5;
    return { intensity: maxIntensity, zone: bestZone };
  }

  // Ambient predation risk: an encounter roll per check, scaled by tier and depth.
  private getPredatorDanger(): { level: number; source: DangerEvent | null } {
    const species = this.state.species;
    if (!species) return NO_DANGER;
    const predators = SPECIES_REAL_DATA[species.id]?.naturalPredators ?? [];
    if (predators.length === 0 || predators.some(p => p.includes('없음'))) return NO_DANGER;

    const depthMultiplier = this.state.depth === 'SURFACE' ? 1.5 : this.state.depth === 'ABYSS' ? 0.4 : 1.0;
    if (Math.random() >= PREDATOR_ENCOUNTER[species.tier] * depthMultiplier) return NO_DANGER;

    const severity = PREDATOR_SEVERITY[species.tier];
    const predatorName = predators[Math.floor(Math.random() * predators.length)];
    return {
      level: severity,
      source: {
        type: 'PREDATOR',
        name: `${predatorName} 접근`,
        severity,
        coord: [...this.state.currentCoord],
        radius: 50,
      },
    };
  }

  private getDangerLevel(path: LatLng[]): { level: number; source: DangerEvent | null } {
    const sleeping = this.isSleeping();
    const vessels = this.vesselsCanReach(sleeping);
    const month = this.getSimulatedMonth();
    let maxDanger = 0;
    let source: DangerEvent | null = null;

    const mpa = this.findMPA(path);
    if (mpa) this.logMPAEntry(mpa);

    for (const zone of DANGER_ZONES) {
      const type: DangerEvent['type'] =
        zone.type === 'STORM_CORRIDOR' ? 'STORM' : zone.type === 'DEAD_ZONE' ? 'DEAD_ZONE' : 'HIGH_RISK';
      // Weather and hypoxia reach every depth; shipping lanes do not.
      if (type === 'HIGH_RISK' && !vessels) continue;

      const d = minDistanceToPoint(path, zone.center);
      if (d >= zone.radiusKm) continue;
      const proximity = 1 - d / zone.radiusKm;
      let danger = zone.baseDanger * proximity;
      if (zone.seasonalPeak.includes(month)) danger *= 1.3;
      if (danger > maxDanger) {
        maxDanger = danger;
        source = { type, name: zone.nameKo, severity: danger, coord: zone.center, radius: zone.radiusKm };
      }
    }

    if (vessels) {
      const fishing = this.getFishingIntensity(path, mpa);
      if (fishing.intensity > maxDanger && fishing.zone) {
        maxDanger = fishing.intensity;
        source = {
          type: 'FISHING',
          name: `${fishing.zone.nameKo} 어선단 (${fishing.zone.gearTypes[0]})`,
          severity: fishing.intensity,
          coord: fishing.zone.center,
          radius: fishing.zone.radiusKm,
        };
      }

    }

    if (!sleeping) {
      const predator = this.getPredatorDanger();
      if (predator.level > maxDanger && predator.source) {
        maxDanger = predator.level;
        source = predator.source;
      }
    }

    return { level: maxDanger, source };
  }

  // A hungry fish slows down: full speed above 30 %, half speed at 0 %.
  private staminaSpeedFactor(): number {
    const s = this.state.stamina;
    return s >= STAMINA_HUNGRY ? 1 : 0.5 + 0.5 * (s / STAMINA_HUNGRY);
  }

  private getEffectiveSpeed(): number {
    if (!this.state.species) return 0;
    const baseKmPerSec = TOTAL_DISTANCE_KM / BASE_COMPLETION_SECONDS;
    let speed = baseKmPerSec * this.state.species.baseSpeedMultiplier;

    if (this.state.isBoostActive) speed *= 2;
    if (this.state.depth === 'SURFACE') speed *= 1.3;
    if (this.state.depth === 'ABYSS') speed *= 0.5;
    if (this.isSleeping()) speed *= 0.3;
    speed *= this.state.currentEffect?.factor ?? 1;

    return speed * this.staminaSpeedFactor();
  }

  // How fast the fish burns stamina relative to plain cruising at mid depth.
  private drainMultiplier(): number {
    const s = this.state;
    let m = 1;
    if (s.isBoostActive) m *= BOOST_DRAIN;
    if (s.depth === 'ABYSS') m *= ABYSS_DRAIN * (1 - this.reduction('abyssDrainReduction'));
    if (s.isSleeping) m *= SLEEP_DRAIN;
    const factor = s.currentEffect?.factor ?? 1;
    if (factor < 1) m *= 1 + (1 - factor) * 2;   // fighting a headwind
    const hazard = s.nearbyHazard;
    if (hazard?.type === 'STORM_CORRIDOR') m *= 1 + hazard.intensity;
    if (hazard?.type === 'DEAD_ZONE') m *= 1 + 2.5 * hazard.intensity;
    return m;
  }

  private updateStaminaStage() {
    const s = this.state.stamina;
    const stage: StaminaStage =
      s <= 0 ? 'STARVING' : s < STAMINA_EXHAUSTED ? 'EXHAUSTED' : s < STAMINA_HUNGRY ? 'HUNGRY' : 'OK';

    if (STAGE_RANK[stage] > STAGE_RANK[this.staminaStage]) {
      // Only ever announce a turn for the worse; recovery is one message, below.
      this.staminaStage = stage;
      if (stage === 'HUNGRY') {
        this.addLog('🍽️ 배고픔 — 체력 30% 이하. 먹이 지대(🦐)를 찾으세요 (속도 저하 시작)', 'warning');
      } else if (stage === 'EXHAUSTED') {
        this.addLog('탈진 임박 — 체력 10%! 회피 능력 저하', 'danger');
      } else {
        this.addLog(`☠️ 기아 상태! ${STARVATION_SECONDS / 3600}시간 내 먹이를 찾지 못하면 사망합니다`, 'danger');
      }
    } else if (this.staminaStage !== 'OK' && s > STAMINA_RECOVERED) {
      this.staminaStage = 'OK';
      this.addLog('먹이 섭취로 체력 회복', 'success');
    }
  }

  // Feeding, grazing, drain and starvation for one tick. The hunt's countdown
  // and its gain are one operation, so the total gain is exact at any simSpeed.
  private updateStamina(dt: number) {
    const s = this.state;
    const metabolism = this.metabolism();

    if (s.isFeeding) {
      const step = Math.min(dt, s.feedingRemainingSeconds);
      s.stamina += this.feedingGainPerSec * step;
      s.feedingRemainingSeconds -= step;
      if (s.feedingRemainingSeconds <= 0) {
        s.isFeeding = false;
        s.feedingRemainingSeconds = 0;
        this.feedingGainPerSec = 0;
        s.stamina = Math.min(STAMINA_MAX, s.stamina);
        this.addLog(`🍽️ 먹이 사냥 완료 — 체력 ${Math.round(s.stamina)}%`, 'success');
      }
    } else {
      if (s.food.density > 0) s.stamina += s.food.density * STAMINA_GRAZE_PER_SEC * metabolism * dt;
      s.stamina -= STAMINA_DRAIN_PER_SEC * metabolism * this.drainMultiplier() * dt;
    }
    s.stamina = clamp(s.stamina, 0, STAMINA_MAX);

    if (s.stamina <= 0) s.starvingSeconds += dt;
    else s.starvingSeconds = 0;

    this.updateStaminaStage();

    if (s.starvingSeconds >= STARVATION_SECONDS) {
      this.die('기아 — 먹이 부족으로 탈진');
    }
  }

  private checkEvasion(danger: DangerEvent): boolean {
    if (!this.state.species) return false;
    const { fishingEvasion, predatorEvasion } = this.state.species;
    // Hunger dulls the species' own reflexes, but never a rule that pins the
    // rate to 100 (abyssal immunity, Sky Leap), which are applied afterwards.
    const stamina = this.state.stamina;
    const staminaFactor = stamina >= STAMINA_HUNGRY ? 1 : 0.6 + 0.4 * (stamina / STAMINA_HUNGRY);
    let evasionRate = 0;

    if (danger.type === 'FISHING' || danger.type === 'HIGH_RISK') {
      // Vessel hazards: fishing fleets, shipping lanes, pirates. Unreachable at depth.
      evasionRate = fishingEvasion * staminaFactor;
      if (this.state.depth === 'ABYSS') evasionRate = 100;
      if (this.state.isSkillActive) evasionRate = Math.min(100, evasionRate + 40);
    } else if (danger.type === 'PREDATOR') {
      evasionRate = predatorEvasion * staminaFactor;
      if (this.state.isSkillActive) evasionRate = Math.min(100, evasionRate + 30);
    } else {
      evasionRate = (30 + predatorEvasion * 0.3) * staminaFactor;
      if (this.state.depth === 'ABYSS') evasionRate += 25;
    }

    return Math.random() * 100 < evasionRate;
  }

  private die(cause: string) {
    this.clearTimers();
    this.state.phase = 'GAME_OVER';
    this.state.deathCause = cause;
    const dna = Math.floor(
      (this.state.distanceKm / 100) * (1 + this.state.progressPct / 100)
      + (this.state.elapsedSeconds / 3600) * 2
    );
    this.state.dnaPoints = dna;
    this.state.totalDnaEarned += dna;
    this.addLog(`사망: ${cause}`, 'danger');
    this.addLog(`획득 DNA: ${dna}pt | 항해 거리: ${formatKm(this.state.distanceKm)}km`, 'system');

    this.state.gravesites.push({
      id: `g_${Date.now()}`,
      coord: [...this.state.currentCoord],
      species: this.state.species?.nameKo ?? '',
      nickname: '플레이어',
      causeOfDeath: cause,
      diedAt: new Date().toISOString().slice(0, 10),
      distanceTraveled: Math.floor(this.state.distanceKm),
    });

    this.notify();
  }

  private triggerDanger(source: DangerEvent) {
    this.state.currentDanger = source;
    this.state.phase = 'DANGER_ALERT';
    this.state.dangerCountdown = DANGER_COUNTDOWN;
    this.addLog(`🚨 ${source.name}! 위험도 ${(source.severity * 100).toFixed(0)}% — ${DANGER_COUNTDOWN / 60}분 내 회피하세요!`, 'danger');

    this.clearDangerTimer();
    this.dangerTimer = window.setInterval(() => {
      if (this.state.phase !== 'DANGER_ALERT') {
        this.clearDangerTimer();
        return;
      }
      // The simulation is paused during an alert, so this counts real seconds.
      this.state.dangerCountdown -= 1;
      if (this.state.dangerCountdown <= 0) {
        this.clearDangerTimer();
        if (this.state.shieldTokens > 0) {
          this.state.shieldTokens--;
          this.state.phase = 'PLAYING';
          this.state.currentDanger = null;
          this.addLog(`🛡️ 비상 회피 버블 자동 소모! (남은: ${this.state.shieldTokens}/${SHIELD_MAX})`, 'warning');
          this.nextDangerCheck = this.state.elapsedSeconds + 90 + Math.random() * 120;
        } else if (this.checkEvasion(source)) {
          this.state.phase = 'PLAYING';
          this.state.currentDanger = null;
          this.addLog('위기 탈출! 간신히 생존했습니다.', 'success');
          this.nextDangerCheck = this.state.elapsedSeconds + 90 + Math.random() * 120;
        } else {
          this.die(source.name);
          return;
        }
      }
      this.notify();
    }, 1000);
  }

  // Consumes distKm along the looped route, leg by leg, so leftover distance on a
  // crossed waypoint is carried into the next leg in km rather than as a fraction.
  private advanceAlongRoute(distKm: number) {
    let remaining = distKm;
    let guard = 0;
    while (remaining > 0 && guard++ < ROUTE_LEN) {
      const legKm = LEG_KM[this.waypointIndex];
      const legLeftKm = (1 - this.waypointT) * legKm;
      if (remaining < legLeftKm) {
        this.waypointT += remaining / legKm;
        return;
      }
      remaining -= legLeftKm;
      this.waypointIndex = (this.waypointIndex + 1) % ROUTE_LEN;
      this.waypointT = 0;
      const wp = WORLD_TOUR_ROUTE[this.waypointIndex];
      if (wp.region !== this.lastRegionLog) {
        this.lastRegionLog = wp.region;
        this.addLog(`📍 ${wp.region} (${wp.name}) 도달`, 'info');
      }
    }
  }

  private startTick() {
    this.clearTimers();

    this.tickTimer = window.setInterval(() => {
      if (this.state.phase !== 'PLAYING') return;

      const dt = this.state.simSpeed;
      this.state.elapsedSeconds += dt;

      const sleeping = this.isSleeping();
      if (sleeping !== this.state.isSleeping) {
        this.state.isSleeping = sleeping;
        this.addLog(
          sleeping ? '🌙 야간 잠항 시작 (어선·선박·포식 면역, 속도 -70%)' : '☀️ 야간 잠항 종료, 순항 속도 복귀',
          'info',
        );
      }

      // Surroundings first: the speed below depends on the current, and the
      // stamina drain on the hazard.
      this.updateEnvironment();

      // Movement. A hunting fish holds position for the whole hunt, including
      // the tick that finishes it.
      const prevCoord: [number, number] = [...this.state.currentCoord];
      const speed = this.state.isFeeding ? 0 : this.getEffectiveSpeed();
      const distDelta = speed * dt;
      this.state.currentSpeedKmH = speed * 3600;
      this.state.distanceKm += distDelta;
      this.state.progressPct = Math.min(100, (this.state.distanceKm / TOTAL_DISTANCE_KM) * 100);

      if (distDelta > 0) {
        this.advanceAlongRoute(distDelta);
        this.state.currentCoord = pointOnLeg(this.waypointIndex, this.waypointT);
      }
      const tickPath = samplePath(prevCoord, this.state.currentCoord, PATH_SAMPLE_KM, PATH_SAMPLE_MAX_STEPS);

      const sampleDue = distDelta > 0 && this.state.elapsedSeconds % Math.max(5, 30 / this.state.simSpeed) < dt;
      if (sampleDue || this.state.pathHistory.length === 0) {
        // New array on purpose: react-leaflet only redraws when the reference changes.
        const history = this.state.pathHistory.length >= PATH_HISTORY_MAX
          ? this.state.pathHistory.slice(1)
          : this.state.pathHistory.slice();
        history.push([...this.state.currentCoord]);
        this.state.pathHistory = history;
      }

      // Timers (sim time)
      if (this.state.boostRemainingSeconds > 0) {
        this.state.boostRemainingSeconds = Math.max(0, this.state.boostRemainingSeconds - dt);
        if (this.state.boostRemainingSeconds <= 0) {
          this.state.isBoostActive = false;
          this.addLog('터보 부스트 종료', 'info');
        }
      }
      if (this.state.boostCooldownRemaining > 0) {
        this.state.boostCooldownRemaining = Math.max(0, this.state.boostCooldownRemaining - dt);
      }
      if (this.state.isSkillActive) {
        this.state.skillRemainingSeconds = Math.max(0, this.state.skillRemainingSeconds - dt);
        if (this.state.skillRemainingSeconds <= 0) {
          this.state.isSkillActive = false;
          this.addLog(`${this.state.species?.activeSkill?.nameKo ?? '스킬'} 종료`, 'info');
        }
      }
      if (this.state.skillCooldownRemaining > 0) {
        this.state.skillCooldownRemaining = Math.max(0, this.state.skillCooldownRemaining - dt);
      }
      if (this.state.huntCooldownRemaining > 0) {
        this.state.huntCooldownRemaining = Math.max(0, this.state.huntCooldownRemaining - dt);
      }

      // Stamina, which can end the voyage; nothing below may touch a dead fish.
      this.updateStamina(dt);
      if (this.state.phase !== 'PLAYING') return;

      // Danger evaluation
      if (this.state.elapsedSeconds >= this.nextDangerCheck) {
        const { level, source } = this.getDangerLevel(tickPath);
        const tier = this.state.species?.tier;
        const triggerThreshold = 0.35 - (tier === 'SMALL' ? 0.15 : tier === 'APEX' ? -0.15 : 0);

        if (level > triggerThreshold && source && Math.random() < level * 0.6) {
          this.triggerDanger(source);
        } else {
          this.nextDangerCheck = this.state.elapsedSeconds + 30 + Math.random() * 60;
        }
      }

      // Milestones
      const pct = this.state.progressPct;
      if (pct < 100) {
        const markers = [5, 10, 25, 50, 75, 90, 95];
        for (const m of markers) {
          if (pct >= m && pct - (distDelta / TOTAL_DISTANCE_KM * 100) < m) {
            this.addLog(`🏁 항해 진행률 ${m}% 돌파! (${formatKm(this.state.distanceKm)}km)`, 'success');
          }
        }
      }

      if (this.state.progressPct >= 100) {
        this.state.progressPct = 100;
        this.state.phase = 'CLEARED';
        const days = (this.state.elapsedSeconds / 86400).toFixed(1);
        this.addLog(`🏆 세계 일주 완주! ${days}일 소요. 보상을 선택하세요!`, 'success');
        this.clearTimers();
      }

      this.notify();
    }, 1000);
  }
}

export const engine = new OceanEngine();
