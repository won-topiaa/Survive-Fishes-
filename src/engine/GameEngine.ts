import type { GameState, LogEntry, DangerEvent, Gravesite } from '../types/game';
import type { SpeciesConfig, DepthLayer } from '../types/fish';

const TOTAL_DISTANCE_KM = 50_000;
const BASE_COMPLETION_SECONDS = 21 * 24 * 3600;
const BOOST_DURATION = 30 * 60;
const BOOST_COOLDOWN = 5 * 3600;
const DANGER_COUNTDOWN = 300;
const SHIELD_MAX = 2;

const SAMPLE_GRAVESITES: Gravesite[] = [
  { id: 'g1', coord: [35.2, 129.8], species: '고등어', nickname: '참치장인', causeOfDeath: '대형 트롤선 조업 구역 진입', diedAt: '2024-03-15', distanceTraveled: 12400 },
  { id: 'g2', coord: [25.0, -80.5], species: '날치', nickname: 'SpeedRunner', causeOfDeath: '카리브해 포식자 습격', diedAt: '2024-03-18', distanceTraveled: 31200 },
  { id: 'g3', coord: [-33.8, 18.4], species: '연어', nickname: '남극탐험가', causeOfDeath: '희망봉 폭풍 해역', diedAt: '2024-03-20', distanceTraveled: 8900 },
  { id: 'g4', coord: [0.5, 100.2], species: '멸치', nickname: '작지만강한', causeOfDeath: '말라카 해협 정치망', diedAt: '2024-03-22', distanceTraveled: 5600 },
  { id: 'g5', coord: [45.3, -30.1], species: '황새치', nickname: 'SwordMaster', causeOfDeath: '대서양 연승선 주낙', diedAt: '2024-03-25', distanceTraveled: 22000 },
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
  private nextDangerAt = 0;

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
    this.nextDangerAt = 60 + Math.random() * 120;
    this.addLog(`${species.emoji} ${species.nameKo}(${species.name})로 출발!`, 'success');
    this.addLog(`좌표: [${lat.toFixed(2)}°, ${lng.toFixed(2)}°]`, 'info');
    this.addLog(`목표: 전 세계 해양 ${TOTAL_DISTANCE_KM.toLocaleString()}km 일주`, 'info');
    this.addLog(`예상 소요: ${species.expectedStandardDays}일 (${species.baseSpeedMultiplier}x)`, 'info');
    this.startTick();
    this.notify();
  }

  setDepth(depth: DepthLayer) {
    if (this.state.phase !== 'PLAYING') return;
    const prev = this.state.depth;
    this.state.depth = depth;
    const labels: Record<DepthLayer, string> = { SURFACE: '표층 (+30% 속도, 어선 취약)', MID: '중층 (표준)', ABYSS: '심해 (-50% 속도, 어선 면역)' };
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
    this.addLog('2x 터보 부스트 가동! (30분 지속)', 'success');
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
      this.addLog('야간 잠항 모드 ON (심해 자동 잠항, 위험 면역)', 'info');
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
    this.nextDangerAt = this.state.elapsedSeconds + 120 + Math.random() * 180;
    this.notify();
  }

  restart() {
    if (this.tickTimer) clearInterval(this.tickTimer);
    if (this.dangerTimer) clearInterval(this.dangerTimer);
    this.state = createInitialState();
    this.state.phase = 'MENU';
    this.addLog('시스템 재시작. 새 항해를 시작하세요.', 'system');
    this.notify();
  }

  private addLog(message: string, type: LogEntry['type']) {
    const now = new Date();
    const time = now.toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.state.logs.unshift({ time, message, type });
    if (this.state.logs.length > 80) this.state.logs.pop();
  }

  private getEffectiveSpeed(): number {
    if (!this.state.species) return 0;
    const baseKmPerSec = TOTAL_DISTANCE_KM / BASE_COMPLETION_SECONDS;
    let speed = baseKmPerSec * this.state.species.baseSpeedMultiplier;

    if (this.state.isBoostActive) speed *= 2;
    if (this.state.depth === 'SURFACE') speed *= 1.3;
    if (this.state.depth === 'ABYSS') speed *= 0.5;
    if (this.state.isSleepModeActive) speed *= 0.3;

    return speed;
  }

  private generateDanger(): DangerEvent {
    const types: DangerEvent['type'][] = ['FISHING', 'PREDATOR', 'STORM', 'DEAD_ZONE'];
    const type = types[Math.floor(Math.random() * types.length)];
    const names: Record<DangerEvent['type'], string[]> = {
      FISHING: ['대형 트롤선 출몰', '선망 어선단 접근', '연승선 주낙 발견'],
      PREDATOR: ['대형 포식자 접근', '상어 무리 발견', '해양 포유류 출몰'],
      STORM: ['태풍 접근 경보', '폭풍 해역 진입', '거대 파도 경보'],
      DEAD_ZONE: ['저산소 데드존 진입', '적조 해역 감지', '오염 해역 경고'],
    };
    const nameList = names[type];
    return {
      type,
      name: nameList[Math.floor(Math.random() * nameList.length)],
      severity: 0.65 + Math.random() * 0.35,
      coord: [this.state.currentCoord[0] + (Math.random() - 0.5) * 5, this.state.currentCoord[1] + (Math.random() - 0.5) * 5],
      radius: 200 + Math.random() * 200,
    };
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
      evasionRate = 40 + Math.random() * 30;
      if (this.state.depth === 'ABYSS') evasionRate += 20;
    }

    return Math.random() * 100 < evasionRate;
  }

  private die(cause: string) {
    this.state.phase = 'GAME_OVER';
    this.state.deathCause = cause;
    const dna = Math.floor((this.state.distanceKm / 100) * (1 + this.state.progressPct / 100) + (this.state.elapsedSeconds / 3600) * 2);
    this.state.dnaPoints = dna;
    this.state.totalDnaEarned += dna;
    this.addLog(`사망: ${cause}`, 'danger');
    this.addLog(`획득 DNA: ${dna}pt | 항해 거리: ${this.state.distanceKm.toFixed(0)}km`, 'system');

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

      const speed = this.getEffectiveSpeed();
      const distDelta = speed * dt;
      this.state.distanceKm += distDelta;
      this.state.progressPct = Math.min(100, (this.state.distanceKm / TOTAL_DISTANCE_KM) * 100);

      const lngDelta = (distDelta / 111.32) * Math.cos((this.state.currentCoord[0] * Math.PI) / 180);
      let latWobble = Math.sin(this.state.elapsedSeconds * 0.001) * 0.002 * dt;
      let newLng = this.state.currentCoord[1] + lngDelta;
      let newLat = this.state.currentCoord[0] + latWobble;
      if (newLng > 180) newLng -= 360;
      if (newLng < -180) newLng += 360;
      newLat = Math.max(-70, Math.min(70, newLat));
      this.state.currentCoord = [newLat, newLng];

      if (this.state.pathHistory.length === 0 || this.state.elapsedSeconds % 10 < dt) {
        this.state.pathHistory.push([...this.state.currentCoord]);
        if (this.state.pathHistory.length > 500) this.state.pathHistory.shift();
      }

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

      if (this.state.elapsedSeconds >= this.nextDangerAt && !this.state.isSleepModeActive) {
        const danger = this.generateDanger();
        this.state.currentDanger = danger;
        this.state.phase = 'DANGER_ALERT';
        this.state.dangerCountdown = DANGER_COUNTDOWN;
        this.addLog(`${danger.name}! 5분 내 회피하세요!`, 'danger');

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
              this.addLog(`비상 회피 버블 자동 소모! (남은: ${this.state.shieldTokens}/${SHIELD_MAX})`, 'warning');
              this.nextDangerAt = this.state.elapsedSeconds + 120 + Math.random() * 180;
            } else {
              const survived = this.checkEvasion(this.state.currentDanger!);
              if (survived) {
                this.state.phase = 'PLAYING';
                this.state.currentDanger = null;
                this.addLog('위기 탈출! 간신히 생존했습니다.', 'success');
                this.nextDangerAt = this.state.elapsedSeconds + 120 + Math.random() * 180;
              } else {
                this.die(this.state.currentDanger?.name ?? '알 수 없는 위험');
              }
            }
          }
          this.notify();
        }, 1000);
      }

      if (Math.floor(this.state.elapsedSeconds) % 600 < dt && this.state.elapsedSeconds > 60) {
        const pct = this.state.progressPct;
        if (pct < 100) {
          const markers = [10, 25, 50, 75, 90];
          for (const m of markers) {
            if (pct >= m && pct < m + 0.5) {
              this.addLog(`항해 진행률 ${m}% 돌파!`, 'success');
            }
          }
        }
      }

      if (this.state.progressPct >= 100) {
        this.state.progressPct = 100;
        this.state.phase = 'CLEARED';
        this.addLog('세계 일주 완주! 보상을 선택하세요!', 'success');
        if (this.tickTimer) clearInterval(this.tickTimer);
      }

      this.notify();
    }, 1000);
  }
}

export const engine = new OceanEngine();
