import type { GameState, LogEntry, DangerEvent, Gravesite } from '../types/game';
import type { SpeciesConfig, DepthLayer, SpeciesTier } from '../types/fish';
import type { FishingZone, MarineProtectedArea } from '../data/types';
import { WORLD_TOUR_ROUTE, ROUTE_TOTAL_DISTANCE_KM, ROUTE_LEG_TABLES } from '../data/oceanRoutes';
import { OCEAN_CURRENTS } from '../data/currents';
import { FISHING_ZONES } from '../data/fishingZones';
import { MARINE_PROTECTED_AREAS } from '../data/marineProtectedAreas';
import { DANGER_ZONES } from '../data/dangerZones';
import { SPECIES_REAL_DATA } from '../data/speciesData';
import type { LatLng } from '../utils/geo';
import { distanceToSegment, lerpMercator, arcTableToT, samplePath, minDistanceToPoint } from '../utils/geo';
import { formatKm, formatSleepWindow } from '../utils/format';

const TOTAL_DISTANCE_KM = ROUTE_TOTAL_DISTANCE_KM;
const BASE_COMPLETION_SECONDS = 21 * 24 * 3600;
const BOOST_DURATION = 30 * 60;
const BOOST_COOLDOWN = 5 * 3600;
// Real seconds. The simulation is paused while an alert is open, so the evade
// window must not scale with simSpeed.
export const DANGER_COUNTDOWN = 300;
const SHIELD_MAX = 2;
const CURRENT_BAND_KM = 300;
const PATH_SAMPLE_KM = 10;
const PATH_SAMPLE_MAX_STEPS = 64;
const PATH_HISTORY_MAX = 800;

// Per-check chance that a natural predator is nearby, before the depth multiplier
// and the shared trigger roll in the tick. Severity must clear the tier threshold
// (SMALL 0.20, MEDIUM/LARGE 0.35, APEX 0.50) or the encounter can never fire.
const PREDATOR_ENCOUNTER: Record<SpeciesTier, number> = { SMALL: 0.03, MEDIUM: 0.012, LARGE: 0.005, APEX: 0.0005 };
const PREDATOR_SEVERITY: Record<SpeciesTier, number> = { SMALL: 0.65, MEDIUM: 0.5, LARGE: 0.45, APEX: 0.55 };

const NO_DANGER = { level: 0, source: null } as const;

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
  private lastCurrentLog = '';
  private lastZoneLog = '';
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
    this.startTick();
    this.notify();
  }

  setDepth(depth: DepthLayer) {
    if (this.state.phase !== 'PLAYING') return;
    const prev = this.state.depth;
    this.state.depth = depth;
    const labels: Record<DepthLayer, string> = {
      SURFACE: '표층 0~50m (+30% 속도, 어선·포식 취약)',
      MID: '중층 50~200m (표준, 연승선 위험)',
      ABYSS: '심해 200m+ (-50% 속도, 어선·선박 면역)',
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
    this.addLog('2x 터보 부스트 가동! (30분 지속, 쿨다운 5시간)', 'success');
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
      this.addLog(`야간 잠항 예약 ON (매일 ${window} 어선·선박·포식 면역, 속도 -70%)`, 'info');
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
    this.lastCurrentLog = '';
    this.lastZoneLog = '';
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

  private getCurrentBoost(): number {
    const pos = this.state.currentCoord;
    let maxBoost = 1.0;
    for (const current of OCEAN_CURRENTS) {
      for (let i = 0; i < current.path.length - 1; i++) {
        const { distKm } = distanceToSegment(pos, current.path[i], current.path[i + 1]);
        if (distKm >= CURRENT_BAND_KM) continue;
        const proximity = 1 - distKm / CURRENT_BAND_KM;
        const boost = 1 + (current.boostMultiplier - 1) * proximity;
        if (boost > maxBoost) {
          maxBoost = boost;
          if (this.lastCurrentLog !== current.id && proximity > 0.5) {
            this.lastCurrentLog = current.id;
            this.addLog(`🌊 ${current.nameKo} 진입 (해류 가속 ${current.boostMultiplier}x, ${current.avgSpeedKmH}km/h)`, 'info');
          }
        }
      }
    }
    return maxBoost;
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

  private getEffectiveSpeed(): number {
    if (!this.state.species) return 0;
    const baseKmPerSec = TOTAL_DISTANCE_KM / BASE_COMPLETION_SECONDS;
    let speed = baseKmPerSec * this.state.species.baseSpeedMultiplier;

    if (this.state.isBoostActive) speed *= 2;
    if (this.state.depth === 'SURFACE') speed *= 1.3;
    if (this.state.depth === 'ABYSS') speed *= 0.5;
    if (this.isSleeping()) speed *= 0.3;

    return speed * this.getCurrentBoost();
  }

  private checkEvasion(danger: DangerEvent): boolean {
    if (!this.state.species) return false;
    const { fishingEvasion, predatorEvasion } = this.state.species;
    let evasionRate = 0;

    if (danger.type === 'FISHING' || danger.type === 'HIGH_RISK') {
      // Vessel hazards: fishing fleets, shipping lanes, pirates. Unreachable at depth.
      evasionRate = fishingEvasion;
      if (this.state.depth === 'ABYSS') evasionRate = 100;
      if (this.state.isSkillActive) evasionRate = Math.min(100, evasionRate + 40);
    } else if (danger.type === 'PREDATOR') {
      evasionRate = predatorEvasion;
      if (this.state.isSkillActive) evasionRate = Math.min(100, evasionRate + 30);
    } else {
      evasionRate = 30 + predatorEvasion * 0.3;
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

      // Movement
      const prevCoord: [number, number] = [...this.state.currentCoord];
      const speed = this.getEffectiveSpeed();
      const distDelta = speed * dt;
      this.state.currentSpeedKmH = speed * 3600;
      this.state.distanceKm += distDelta;
      this.state.progressPct = Math.min(100, (this.state.distanceKm / TOTAL_DISTANCE_KM) * 100);

      this.advanceAlongRoute(distDelta);
      this.state.currentCoord = pointOnLeg(this.waypointIndex, this.waypointT);
      const tickPath = samplePath(prevCoord, this.state.currentCoord, PATH_SAMPLE_KM, PATH_SAMPLE_MAX_STEPS);

      if (this.state.elapsedSeconds % Math.max(5, 30 / this.state.simSpeed) < dt || this.state.pathHistory.length === 0) {
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
