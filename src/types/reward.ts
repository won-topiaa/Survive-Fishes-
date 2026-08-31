export type PrizeFishType = 'SALMON' | 'HAIRTAIL' | 'TUNA_BLOCK' | 'RED_SEABREAM';
export type FishPreparationType = 'WHOLE_RAW' | 'FILLETED_PORTION';

export interface PrizeFishOption {
  id: PrizeFishType;
  name: string;
  subtitle: string;
  emoji: string;
  spec: string;
  appeal: string;
  cooking: string;
}

export const PRIZE_FISH_OPTIONS: PrizeFishOption[] = [
  {
    id: 'SALMON',
    name: '통 노르웨이 생연어',
    subtitle: '압도적 트로피샷',
    emoji: '🐟',
    spec: '5~6kg 대형 원물',
    appeal: '양손 트로피샷 연출 가능 80cm급',
    cooking: '회 / 스테이크'
  },
  {
    id: 'HAIRTAIL',
    name: '1미터 특대 제주 은갈치',
    subtitle: '은빛 장검(Sword)',
    emoji: '🗡️',
    spec: '1~2미 (1m급)',
    appeal: '키만 한 은빛 장검 비주얼 SNS 밈',
    cooking: '구이 / 조림'
  },
  {
    id: 'TUNA_BLOCK',
    name: '최고급 참다랑어 블록',
    subtitle: '럭셔리 혼마구로',
    emoji: '🍣',
    spec: '1~1.5kg 횟감 블록',
    appeal: '최고급 오도로/주도로 사시미',
    cooking: '최고급 사시미'
  },
  {
    id: 'RED_SEABREAM',
    name: '대물 자연산 참돔',
    subtitle: '바다의 제왕',
    emoji: '🐠',
    spec: '60cm 이상 대물',
    appeal: '어변성룡의 상징 전통 대어',
    cooking: '도미회 / 맑은탕'
  }
];

export interface HallOfFameEntry {
  id: string;
  nickname: string;
  speciesUsed: string;
  totalTimeElapsed: string;
  selectedPrizeFish: PrizeFishType;
  completedAt: string;
}
