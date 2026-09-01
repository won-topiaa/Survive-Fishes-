import type { GameState, LogEntry, DangerEvent, Gravesite } from '../types/game';
import type { SpeciesConfig, DepthLayer, SpeciesTier } from '../types/fish';
import type { FishingZone, MarineProtectedArea } from '../data/types';
import { WORLD_TOUR_ROUTE, ROUTE_TOTAL_DISTANCE_KM } from '../data/oceanRoutes';
import { OCEAN_CURRENTS } from '../data/currents';
import { FISHING_ZONES } from '../data/fishingZones';
import { MARINE_PROTECTED_AREAS } from '../data/marineProtectedAreas';
import { DANGER_ZONES } from '../data/dangerZones';
import { SPECIES_REAL_DATA } from '../data/speciesData';

const TOTAL_DISTANCE_KM = ROUTE_TOTAL_DISTANCE_KM;
const BASE_COMPLETION_SECONDS = 21 * 24 * 3600;
const BOOST_DURATION = 30 * 60;
const BOOST_COOLDOWN = 5 * 3600;
const DANGER_COUNTDOWN = 300;
const SHIELD_MAX = 2;

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// Interpolates longitude the short way around the ±180° antimeridian.
function lerpLng(a: number, b: number, t: number): number {
  const diff = (((b - a + 540) % 360) + 360) % 360 - 180;
  return (((a + diff * t + 540) % 360) + 360) % 360 - 180;
}

function samplePath(from: [number, number], to: [number, number], steps = 8): [number, number][] {
  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    points.push([lerp(from[0], to[0], t), lerpLng(from[1], to[1], t)]);
  }
  return points;
}

function minDistanceToPoint(path: [number, number][], target: [number, number]): number {
  let min = Infinity;
  for (const p of path) {
    const d = haversineKm(p, target);
    if (d < min) min = d;
  }
  return min;
}

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

function createInitialState(): GameState {
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
    skillCooldownRemaining: 0,
    isSleepModeActive: false,
    sleepStart: 23,
    sleepEnd: 7,
    dangerCountdown: 0,
    currentDanger: null,
    dnaPoints: 0,
    totalDnaEarned: 0,
    logs: [],
    gravesites: [...SAMPLE_GRAVESITES],
    pathHistory: [],
    simSpeed: 1,
    deathCause: '',
  };
}

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
    this.state = createInitialState();
    this.state.species = species;
    this.state.startCoord = [lat, lng];
    this.state.currentCoord = [lat, lng];
    this.state.pathHistory = [[lat, lng]];
    this.state.phase = 'PLAYING';

    this.waypointIndex = this.findNearestWaypoint(lat, lng);
    this.waypointT = 0;
    this.nextDangerCheck = 30 + Math.random() * 60;
    this.voyageStartMonth = new Date().getMonth() + 1;

    const realData = SPECIES_REAL_DATA[species.id];
    const wp = WORLD_TOUR_ROUTE[this.waypointIndex];

    this.addLog(`${species.emoji} ${species.nameKo}(${species.name})로 출발!`, 'success');
    this.addLog(`출발 좌표: [${lat.toFixed(2)}°, ${lng.toFixed(2)}°]`, 'info');
    this.addLog(`가장 가까운 항로: ${wp.region} (${wp.name})`, 'info');
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
      ABYSS: '심해 200m+ (-50% 속도, 어선 면역)',
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
    if (this.state.skillCooldownRemaining > 0) return;
    const skill = this.state.species.activeSkill;
    this.state.isSkillActive = true;
    this.state.skillCooldownRemaining = skill.cooldownSec;
    this.addLog(`${skill.nameKo} 발동! ${skill.description} (${skill.durationSec}초)`, 'success');
    setTimeout(() => {
      this.state.isSkillActive = false;
      this.addLog(`${skill.nameKo} 종료`, 'info');
      this.notify();
    }, skill.durationSec * 1000 / Math.max(this.state.simSpeed, 1));
    this.notify();
  }

  toggleSleepMode() {
    this.state.isSleepModeActive = !this.state.isSleepModeActive;
    if (this.state.isSleepModeActive) {
      this.addLog('야간 잠항 모드 ON (심해 자동 잠항, 어선·포식 면역, 속도 -70%)', 'info');
    } else {
      this.addLog('야간 잠항 모드 OFF', 'info');
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
    this.state.phase = 'PLAYING';
    this.state.dangerCountdown = 0;
    this.state.currentDanger = null;
    this.addLog('긴급 회피 성공! 안전 지대로 이탈.', 'success');
    this.nextDangerCheck = this.state.elapsedSeconds + 90 + Math.random() * 120;
    this.notify();
  }

  restart() {
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.dangerTimer) clearInterval(this.dangerTimer);
    this.state = createInitialState();
    this.state.phase = 'MENU';
    this.lastRegionLog = '';
    this.lastCurrentLog = '';
    this.lastZoneLog = '';
    this.addLog('시스템 재시작. 새 항해를 시작하세요.', 'system');
    this.notify();
  }

  private addLog(message: string, type: LogEntry['type']) {
    const now = new Date();
    const time = now.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.state.logs.unshift({ time, message, type });
    if (this.state.logs.length > 100) this.state.logs.pop();
  }

  private findNearestWaypoint(lat: number, lng: number): number {
    let minDist = Infinity;
    let nearest = 0;
    for (let i = 0; i < WORLD_TOUR_ROUTE.length; i++) {
      const d = haversineKm([lat, lng], WORLD_TOUR_ROUTE[i].coord);
      if (d < minDist) { minDist = d; nearest = i; }
    }
    return nearest;
  }

  private getCurrentBoost(): number {
    const pos = this.state.currentCoord;
    let maxBoost = 1.0;
    for (const current of OCEAN_CURRENTS) {
      for (let i = 0; i < current.path.length - 1; i++) {
        const segDist = Math.min(
          haversineKm(pos, current.path[i]),
          haversineKm(pos, current.path[i + 1])
        );
        if (segDist < 300) {
          const proximity = 1 - segDist / 300;
          const boost = 1 + (current.boostMultiplier - 1) * proximity;
          if (boost > maxBoost) {
            maxBoost = boost;
            const logKey = current.id;
            if (this.lastCurrentLog !== logKey && proximity > 0.5) {
              this.lastCurrentLog = logKey;
              this.addLog(`🌊 ${current.nameKo} 진입 (해류 가속 ${current.boostMultiplier}x, ${current.avgSpeedKmH}km/h)`, 'info');
            }
          }
        }
      }
    }
    return maxBoost;
  }

  // Pure lookup: closest MPA whose radius the path enters, or null. No side effects.
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

  private getFishingIntensity(path: [number, number][]): { intensity: number; zone: FishingZone | null } {
    const mpa = this.findMPA(path);
    if (mpa) {
      this.logMPAEntry(mpa);
      if (mpa.protection === 'FULL') return { intensity: 0, zone: null };
    }
    if (this.state.depth === 'ABYSS') return { intensity: 0, zone: null };

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

  private getSimulatedMonth(): number {
    const daysElapsed = this.state.elapsedSeconds / 86400;
    const monthsElapsed = Math.floor(daysElapsed / 30);
    return ((this.voyageStartMonth - 1 + monthsElapsed) % 12) + 1;
  }

  private getPredatorDanger(): { level: number; source: DangerEvent | null } {
    if (!this.state.species) return { level: 0, source: null };
    const predators = SPECIES_REAL_DATA[this.state.species.id]?.naturalPredators ?? [];
    const hasPredators = predators.length > 0 && !predators.some(p => p.includes('없음'));
    if (!hasPredators) return { level: 0, source: null };

    const tierRisk: Record<SpeciesTier, number> = { SMALL: 0.40, MEDIUM: 0.22, LARGE: 0.10, APEX: 0.03 };
    const depthMultiplier = this.state.depth === 'SURFACE' ? 1.5 : this.state.depth === 'ABYSS' ? 0.5 : 1.0;
    const level = tierRisk[this.state.species.tier] * depthMultiplier;
    const predatorName = predators[Math.floor(Math.random() * predators.length)];

    return {
      level,
      source: {
        type: 'PREDATOR',
        name: `${predatorName} 접근`,
        severity: level,
        coord: [...this.state.currentCoord],
        radius: 50,
      },
    };
  }

  private getDangerLevel(path: [number, number][]): { level: number; source: DangerEvent | null } {
    const month = this.getSimulatedMonth();
    let maxDanger = 0;
    let source: DangerEvent | null = null;

    for (const zone of DANGER_ZONES) {
      const d = minDistanceToPoint(path, zone.center);
      if (d < zone.radiusKm) {
        const proximity = 1 - d / zone.radiusKm;
        let danger = zone.baseDanger * proximity;
        if (zone.seasonalPeak.includes(month)) danger *= 1.3;
        if (danger > maxDanger) {
          maxDanger = danger;
          source = {
            type: zone.type === 'STORM_CORRIDOR' ? 'STORM' : zone.type === 'DEAD_ZONE' ? 'DEAD_ZONE' : 'HIGH_RISK',
            name: zone.nameKo,
            severity: danger,
            coord: zone.center,
            radius: zone.radiusKm,
          };
        }
      }
    }

    const fishing = this.getFishingIntensity(path);
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

    const predator = this.getPredatorDanger();
    if (predator.level > maxDanger && predator.source) {
      maxDanger = predator.level;
      source = predator.source;
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
    if (this.state.isSleepModeActive) speed *= 0.3;

    const currentBoost = this.getCurrentBoost();
    speed *= currentBoost;

    return speed;
  }

  private checkEvasion(danger: DangerEvent): boolean {
    if (!this.state.species) return false;
    let evasionRate = 0;

    if (danger.type === 'FISHING') {
      evasionRate = this.state.species.fishingEvasion;
      if (this.state.depth === 'ABYSS') evasionRate = 100;
      if (this.state.isSkillActive) evasionRate = Math.min(100, evasionRate + 40);
    } else if (danger.type === 'PREDATOR') {
      evasionRate = this.state.species.predatorEvasion;
      if (this.state.isSkillActive) evasionRate = Math.min(100, evasionRate + 30);
    } else {
      evasionRate = 30 + this.state.species.predatorEvasion * 0.3;
      if (this.state.depth === 'ABYSS') evasionRate += 25;
    }

    return Math.random() * 100 < evasionRate;
  }

  private die(cause: string) {
    this.state.phase = 'GAME_OVER';
    this.state.deathCause = cause;
    const dna = Math.floor(
      (this.state.distanceKm / 100) * (1 + this.state.progressPct / 100)
      + (this.state.elapsedSeconds / 3600) * 2
    );
    this.state.dnaPoints = dna;
    this.state.totalDnaEarned += dna;
    this.addLog(`사망: ${cause}`, 'danger');
    this.addLog(`획득 DNA: ${dna}pt | 항해 거리: ${Math.floor(this.state.distanceKm).toLocaleString()}km`, 'system');

    this.state.gravesites.push({
      id: `g_${Date.now()}`,
      coord: [...this.state.currentCoord],
      species: this.state.species?.nameKo ?? '',
      nickname: '플레이어',
      causeOfDeath: cause,
      diedAt: new Date().toISOString().slice(0, 10),
      distanceTraveled: this.state.distanceKm,
    });

    if (this.tickTimer) clearInterval(this.tickTimer);
    this.notify();
  }

  private startTick() {
    if (this.tickTimer) clearInterval(this.tickTimer);

    this.tickTimer = window.setInterval(() => {
      if (this.state.phase !== 'PLAYING') return;

      const dt = this.state.simSpeed;
      this.state.elapsedSeconds += dt;
      const prevCoord: [number, number] = [...this.state.currentCoord];

      // Waypoint-based navigation
      const speed = this.getEffectiveSpeed();
      const distDelta = speed * dt;
      this.state.distanceKm += distDelta;
      this.state.progressPct = Math.min(100, (this.state.distanceKm / TOTAL_DISTANCE_KM) * 100);

      const routeLen = WORLD_TOUR_ROUTE.length;
      const nextIdx = (this.waypointIndex + 1) % routeLen;
      const fromWP = WORLD_TOUR_ROUTE[this.waypointIndex].coord;
      const toWP = WORLD_TOUR_ROUTE[nextIdx].coord;
      const segmentDist = haversineKm(fromWP, toWP);
      const tDelta = segmentDist > 0 ? distDelta / segmentDist : 0;
      this.waypointT += tDelta;

      while (this.waypointT >= 1 && this.waypointIndex < routeLen - 1) {
        this.waypointT -= 1;
        this.waypointIndex++;
        const wp = WORLD_TOUR_ROUTE[this.waypointIndex];
        if (wp.region !== this.lastRegionLog) {
          this.lastRegionLog = wp.region;
          this.addLog(`📍 ${wp.region} (${wp.name}) 도달`, 'info');
        }
      }

      const curFrom = WORLD_TOUR_ROUTE[Math.min(this.waypointIndex, routeLen - 1)].coord;
      const curTo = WORLD_TOUR_ROUTE[Math.min(this.waypointIndex + 1, routeLen - 1)].coord;
      const t = Math.max(0, Math.min(1, this.waypointT));
      this.state.currentCoord = [lerp(curFrom[0], curTo[0], t), lerpLng(curFrom[1], curTo[1], t)];
      const tickPath = samplePath(prevCoord, this.state.currentCoord);

      if (this.state.elapsedSeconds % Math.max(5, 30 / this.state.simSpeed) < dt || this.state.pathHistory.length === 0) {
        this.state.pathHistory.push([...this.state.currentCoord]);
        if (this.state.pathHistory.length > 800) this.state.pathHistory.shift();
      }

      // Cooldowns
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
      if (this.state.skillCooldownRemaining > 0) {
        this.state.skillCooldownRemaining = Math.max(0, this.state.skillCooldownRemaining - dt);
      }

      // Geographic danger evaluation
      if (this.state.elapsedSeconds >= this.nextDangerCheck && !this.state.isSleepModeActive) {
        const { level, source } = this.getDangerLevel(tickPath);
        const triggerThreshold = 0.35 - (this.state.species?.tier === 'SMALL' ? 0.15 : this.state.species?.tier === 'APEX' ? -0.15 : 0);

        if (level > triggerThreshold && source && Math.random() < level * 0.6) {
          this.state.currentDanger = source;
          this.state.phase = 'DANGER_ALERT';
          this.state.dangerCountdown = DANGER_COUNTDOWN;
          this.addLog(`🚨 ${source.name}! 위험도 ${(source.severity * 100).toFixed(0)}% — 5분 내 회피하세요!`, 'danger');

          if (this.dangerTimer) clearInterval(this.dangerTimer);
          this.dangerTimer = window.setInterval(() => {
            if (this.state.phase !== 'DANGER_ALERT') {
              if (this.dangerTimer) clearInterval(this.dangerTimer);
              return;
            }
            this.state.dangerCountdown -= this.state.simSpeed;
            if (this.state.dangerCountdown <= 0) {
              if (this.dangerTimer) clearInterval(this.dangerTimer);
              if (this.state.shieldTokens > 0) {
                this.state.shieldTokens--;
                this.state.phase = 'PLAYING';
                this.state.currentDanger = null;
                this.addLog(`🛡️ 비상 회피 버블 자동 소모! (남은: ${this.state.shieldTokens}/${SHIELD_MAX})`, 'warning');
                this.nextDangerCheck = this.state.elapsedSeconds + 90 + Math.random() * 120;
              } else {
                const survived = this.checkEvasion(this.state.currentDanger!);
                if (survived) {
                  this.state.phase = 'PLAYING';
                  this.state.currentDanger = null;
                  this.addLog('위기 탈출! 간신히 생존했습니다.', 'success');
                  this.nextDangerCheck = this.state.elapsedSeconds + 90 + Math.random() * 120;
                } else {
                  this.die(this.state.currentDanger?.name ?? '알 수 없는 위험');
                }
              }
            }
            this.notify();
          }, 1000);
        } else {
          this.nextDangerCheck = this.state.elapsedSeconds + 30 + Math.random() * 60;
        }
      }

      // Milestone logs
      const pct = this.state.progressPct;
      if (pct < 100) {
        const markers = [5, 10, 25, 50, 75, 90, 95];
        for (const m of markers) {
          if (pct >= m && pct - (distDelta / TOTAL_DISTANCE_KM * 100) < m) {
            this.addLog(`🏁 항해 진행률 ${m}% 돌파! (${Math.floor(this.state.distanceKm).toLocaleString()}km)`, 'success');
          }
        }
      }

      if (this.state.progressPct >= 100) {
        this.state.progressPct = 100;
        this.state.phase = 'CLEARED';
        const days = (this.state.elapsedSeconds / 86400).toFixed(1);
        this.addLog(`🏆 세계 일주 완주! ${days}일 소요. 보상을 선택하세요!`, 'success');
        if (this.tickTimer) clearInterval(this.tickTimer);
      }

      this.notify();
    }, 1000);
  }
}

export const engine = new OceanEngine();
