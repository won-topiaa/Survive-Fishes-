import type { FishingZone } from './types';

export const FISHING_ZONES: FishingZone[] = [
  // === 동아시아 ===
  {
    id: 'east_china_sea',
    name: 'East China Sea',
    nameKo: '동중국해',
    center: [28.0, 125.0],
    radiusKm: 300,
    intensity: 0.92,
    gearTypes: ['트롤', '선망', '연승'],
  },
  {
    id: 'south_china_sea',
    name: 'South China Sea',
    nameKo: '남중국해',
    center: [12.0, 113.0],
    radiusKm: 400,
    intensity: 0.85,
    gearTypes: ['트롤', '자망'],
  },
  {
    id: 'yellow_sea',
    name: 'Yellow Sea',
    nameKo: '황해',
    center: [35.0, 123.0],
    radiusKm: 250,
    intensity: 0.88,
    gearTypes: ['트롤', '자망', '정치망'],
  },
  {
    id: 'sea_of_japan',
    name: 'Sea of Japan',
    nameKo: '동해',
    center: [38.5, 134.0],
    radiusKm: 200,
    intensity: 0.72,
    gearTypes: ['연승', '자망', '선망'],
  },

  // === 동남아시아 ===
  {
    id: 'thai_gulf',
    name: 'Gulf of Thailand',
    nameKo: '태국만',
    center: [9.5, 101.0],
    radiusKm: 200,
    intensity: 0.78,
    gearTypes: ['트롤', '자망'],
  },
  {
    id: 'java_sea',
    name: 'Java Sea',
    nameKo: '자바해',
    center: [-5.0, 112.0],
    radiusKm: 300,
    intensity: 0.82,
    gearTypes: ['선망', '정치망'],
  },

  // === 인도양 ===
  {
    id: 'bay_of_bengal',
    name: 'Bay of Bengal',
    nameKo: '벵골만',
    center: [14.0, 88.0],
    radiusKm: 350,
    intensity: 0.68,
    gearTypes: ['트롤', '자망'],
  },
  {
    id: 'arabian_sea',
    name: 'Arabian Sea (Oman Coast)',
    nameKo: '아라비아해 (오만 연안)',
    center: [20.0, 62.0],
    radiusKm: 250,
    intensity: 0.65,
    gearTypes: ['연승', '트롤'],
  },

  // === 유럽 ===
  {
    id: 'north_sea',
    name: 'North Sea',
    nameKo: '북해',
    center: [56.0, 3.0],
    radiusKm: 300,
    intensity: 0.90,
    gearTypes: ['트롤', '선망', '자망'],
  },
  {
    id: 'norwegian_sea',
    name: 'Norwegian Sea',
    nameKo: '노르웨이해',
    center: [66.0, 2.0],
    radiusKm: 250,
    intensity: 0.75,
    gearTypes: ['트롤', '연승'],
  },
  {
    id: 'barents_sea',
    name: 'Barents Sea',
    nameKo: '바렌츠해',
    center: [73.0, 35.0],
    radiusKm: 300,
    intensity: 0.70,
    gearTypes: ['트롤'],
  },

  // === 서아프리카 ===
  {
    id: 'west_africa_mauritania',
    name: 'West Africa (Mauritania)',
    nameKo: '서아프리카 (모리타니아)',
    center: [19.0, -17.0],
    radiusKm: 200,
    intensity: 0.88,
    gearTypes: ['트롤', '선망'],
  },
  {
    id: 'west_africa_guinea',
    name: 'Gulf of Guinea',
    nameKo: '기니만',
    center: [3.0, -2.0],
    radiusKm: 250,
    intensity: 0.72,
    gearTypes: ['선망', '자망'],
  },

  // === 북미 ===
  {
    id: 'grand_banks',
    name: 'Grand Banks',
    nameKo: '그랜드 뱅크스',
    center: [45.0, -50.0],
    radiusKm: 250,
    intensity: 0.82,
    gearTypes: ['트롤', '연승'],
  },
  {
    id: 'bering_sea',
    name: 'Bering Sea',
    nameKo: '베링해',
    center: [57.0, -175.0],
    radiusKm: 400,
    intensity: 0.85,
    gearTypes: ['트롤', '연승', '자망'],
  },
  {
    id: 'gulf_of_alaska',
    name: 'Gulf of Alaska',
    nameKo: '알래스카만',
    center: [57.0, -145.0],
    radiusKm: 250,
    intensity: 0.70,
    gearTypes: ['트롤', '연승'],
  },

  // === 남미 ===
  {
    id: 'peru_coast',
    name: 'Peru Coast (Humboldt)',
    nameKo: '페루 연안 (훔볼트)',
    center: [-12.0, -78.0],
    radiusKm: 200,
    intensity: 0.90,
    gearTypes: ['선망', '자망'],
  },
  {
    id: 'argentina_shelf',
    name: 'Argentina Continental Shelf',
    nameKo: '아르헨티나 대륙붕',
    center: [-42.0, -60.0],
    radiusKm: 300,
    intensity: 0.78,
    gearTypes: ['트롤', '연승'],
  },
  {
    id: 'chile_coast',
    name: 'Chile Coast',
    nameKo: '칠레 연안',
    center: [-30.0, -72.0],
    radiusKm: 150,
    intensity: 0.72,
    gearTypes: ['선망', '트롤'],
  },

  // === 오세아니아 ===
  {
    id: 'new_zealand',
    name: 'New Zealand EEZ',
    nameKo: '뉴질랜드 배타적 경제수역',
    center: [-42.0, 174.0],
    radiusKm: 200,
    intensity: 0.55,
    gearTypes: ['트롤', '연승'],
  },
];
