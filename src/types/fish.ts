export type SpeciesTier = 'SMALL' | 'MEDIUM' | 'LARGE' | 'APEX';
export type DepthLayer = 'SURFACE' | 'MID' | 'ABYSS';

export interface ActiveSkill {
  name: string;
  nameKo: string;
  durationSec: number;
  cooldownSec: number;
  description: string;
}

export interface SpeciesConfig {
  id: string;
  name: string;
  nameKo: string;
  emoji: string;
  tier: SpeciesTier;
  baseSpeedMultiplier: number;
  expectedStandardDays: number;
  predatorEvasion: number;
  fishingEvasion: number;
  activeSkill?: ActiveSkill;
  description: string;
}

export const ALL_SPECIES: SpeciesConfig[] = [
  {
    id: 'great_white',
    name: 'Great White Shark',
    nameKo: '백상아리',
    emoji: '🦈',
    tier: 'APEX',
    baseSpeedMultiplier: 1.0,
    expectedStandardDays: 21,
    predatorEvasion: 98,
    fishingEvasion: 60,
    activeSkill: { name: 'Apex Presence', nameKo: '최상위 위압', durationSec: 60, cooldownSec: 300, description: '반경 50km 포식 차단' },
    description: '3주 완주 기준선. 압도적 생존성.'
  },
  {
    id: 'orca',
    name: 'Orca',
    nameKo: '범고래',
    emoji: '🐋',
    tier: 'APEX',
    baseSpeedMultiplier: 1.0,
    expectedStandardDays: 21,
    predatorEvasion: 98,
    fishingEvasion: 55,
    activeSkill: { name: 'Deep Intelligence', nameKo: '심해 지능', durationSec: 90, cooldownSec: 360, description: '심해 잠항 에너지 소모 50% 감소' },
    description: '지능형 최상위 포식자. 심해 특화.'
  },
  {
    id: 'bluefin_tuna',
    name: 'Bluefin Tuna',
    nameKo: '참다랑어',
    emoji: '🐟',
    tier: 'LARGE',
    baseSpeedMultiplier: 2.2,
    expectedStandardDays: 9.5,
    predatorEvasion: 85,
    fishingEvasion: 10,
    activeSkill: { name: 'Torpedo Dash', nameKo: '어뢰 대시', durationSec: 15, cooldownSec: 180, description: '15초간 400% 폭풍 가속' },
    description: '원양 고속 항해. 어선에 극도로 취약.'
  },
  {
    id: 'swordfish',
    name: 'Swordfish',
    nameKo: '황새치',
    emoji: '⚔️',
    tier: 'LARGE',
    baseSpeedMultiplier: 2.2,
    expectedStandardDays: 9.5,
    predatorEvasion: 80,
    fishingEvasion: 10,
    activeSkill: { name: 'Piercing Charge', nameKo: '관통 돌진', durationSec: 10, cooldownSec: 200, description: '표층 직진 관성 극대화' },
    description: '표층 순항 시 강력한 직진 관성.'
  },
  {
    id: 'pufferfish',
    name: 'Pufferfish',
    nameKo: '가시복',
    emoji: '🐡',
    tier: 'MEDIUM',
    baseSpeedMultiplier: 1.8,
    expectedStandardDays: 11.7,
    predatorEvasion: 55,
    fishingEvasion: 30,
    activeSkill: { name: 'Toxic Inflation', nameKo: '독침 팽창', durationSec: 45, cooldownSec: 240, description: '45초간 포식 공격 90% 반사' },
    description: '방어 특화형. 독침으로 포식자를 물리침.'
  },
  {
    id: 'mackerel',
    name: 'Mackerel',
    nameKo: '고등어',
    emoji: '🐠',
    tier: 'MEDIUM',
    baseSpeedMultiplier: 1.8,
    expectedStandardDays: 11.7,
    predatorEvasion: 55,
    fishingEvasion: 30,
    description: '표준 밸런스형 연안 회유 어종.'
  },
  {
    id: 'salmon',
    name: 'Pacific Salmon',
    nameKo: '태평양 연어',
    emoji: '🍣',
    tier: 'MEDIUM',
    baseSpeedMultiplier: 1.8,
    expectedStandardDays: 11.7,
    predatorEvasion: 50,
    fishingEvasion: 25,
    activeSkill: { name: 'Current Rider', nameKo: '해류 탑승', durationSec: 60, cooldownSec: 300, description: '역방향 조류 감속 페널티 50% 경감' },
    description: '해류 저항력 우수. 역류에 강함.'
  },
  {
    id: 'flying_fish',
    name: 'Flying Fish',
    nameKo: '날치',
    emoji: '🕊️',
    tier: 'SMALL',
    baseSpeedMultiplier: 3.0,
    expectedStandardDays: 7,
    predatorEvasion: 15,
    fishingEvasion: 80,
    activeSkill: { name: 'Sky Leap', nameKo: '수면 도약', durationSec: 30, cooldownSec: 120, description: '30초간 모든 그물 무시' },
    description: '초고속 스피드런. 극도로 취약.'
  },
  {
    id: 'anchovy',
    name: 'Anchovy',
    nameKo: '멸치',
    emoji: '🐜',
    tier: 'SMALL',
    baseSpeedMultiplier: 3.0,
    expectedStandardDays: 7,
    predatorEvasion: 15,
    fishingEvasion: 80,
    description: '극도로 좁은 암초 지대 통과 가능. 최고 포식 위험.'
  }
];
