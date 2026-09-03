import type { FeedingGround } from './types';
import type { LatLng } from '../utils/geo';
import { haversineKm, clamp } from '../utils/geo';

// Productive regions (upwellings, shelves, fronts) placed so the world-tour route
// crosses them, while the open Pacific between Galápagos, Hawaii and Kamchatka
// stays barren: that crossing is the voyage's hunger test.
export const FEEDING_GROUNDS: FeedingGround[] = [
  { id: 'east_china_shelf', name: 'East China Sea Shelf', nameKo: '동중국해 대륙붕', center: [27, 125], radiusKm: 400, richness: 0.75, prey: '고등어·멸치·오징어' },
  { id: 'south_china_sea', name: 'South China Sea Reefs', nameKo: '남중국해 산호초 해역', center: [12, 113], radiusKm: 400, richness: 0.55, prey: '소형 어류·갑각류' },
  { id: 'maldives_reef', name: 'Maldives Reef', nameKo: '몰디브 산호초', center: [4, 73], radiusKm: 250, richness: 0.55, prey: '산호초 어류·플랑크톤' },
  { id: 'seychelles_bank', name: 'Seychelles Bank', nameKo: '세이셸 해대', center: [-5, 55], radiusKm: 300, richness: 0.6, prey: '참치 먹이 어군·오징어' },
  { id: 'mozambique_channel', name: 'Mozambique Channel', nameKo: '모잠비크 해협', center: [-18, 42], radiusKm: 300, richness: 0.5, prey: '정어리·소형 어류' },
  { id: 'agulhas_bank', name: 'Agulhas Bank', nameKo: '아굴라스 뱅크', center: [-35, 22], radiusKm: 300, richness: 0.8, prey: '정어리·멸치 (사딘런)' },
  { id: 'benguela_upwelling', name: 'Benguela Upwelling', nameKo: '벵겔라 용승 해역', center: [-30, 13], radiusKm: 450, richness: 0.85, prey: '멸치·정어리·플랑크톤' },
  { id: 'equatorial_atlantic', name: 'Equatorial Atlantic Upwelling', nameKo: '적도 대서양 용승', center: [0, -22], radiusKm: 400, richness: 0.5, prey: '플랑크톤·날치' },
  { id: 'canary_upwelling', name: 'Canary Upwelling', nameKo: '카나리아 용승 (모리타니 연안)', center: [17, -21], radiusKm: 400, richness: 0.7, prey: '정어리·고등어' },
  { id: 'north_sea_dogger', name: 'Dogger Bank', nameKo: '북해 도거 뱅크', center: [56, 3], radiusKm: 400, richness: 0.8, prey: '청어·대구·모래장어' },
  { id: 'norwegian_herring', name: 'Norwegian Sea Herring Grounds', nameKo: '노르웨이해 청어 어장', center: [65, 0], radiusKm: 400, richness: 0.8, prey: '청어·크릴' },
  { id: 'iceland_shelf', name: 'Iceland Shelf', nameKo: '아이슬란드 대륙붕', center: [66, -22], radiusKm: 450, richness: 0.8, prey: '열빙어·대구' },
  { id: 'grand_banks', name: 'Grand Banks', nameKo: '그랜드 뱅크스', center: [45, -50], radiusKm: 400, richness: 0.9, prey: '대구·열빙어·오징어' },
  { id: 'georges_bank', name: 'Georges Bank', nameKo: '조지스 뱅크', center: [39.5, -66], radiusKm: 350, richness: 0.85, prey: '청어·오징어·요각류' },
  { id: 'yucatan_channel', name: 'Yucatán Channel (Campeche Bank)', nameKo: '유카탄 해협 (캄페체 뱅크)', center: [21, -87], radiusKm: 300, richness: 0.6, prey: '새우·소형 어류' },
  { id: 'caribbean_reef', name: 'Caribbean Reefs', nameKo: '카리브해 산호초', center: [16, -62], radiusKm: 400, richness: 0.5, prey: '산호초 어류·갑각류' },
  { id: 'amazon_plume', name: 'Amazon Plume', nameKo: '아마존 하구 영양염 지대', center: [5, -48], radiusKm: 350, richness: 0.7, prey: '플랑크톤·새우' },
  { id: 'cabo_frio', name: 'Cabo Frio Upwelling', nameKo: '카보 프리우 용승', center: [-23, -42], radiusKm: 200, richness: 0.6, prey: '정어리·멸치' },
  { id: 'patagonian_shelf', name: 'Patagonian Shelf', nameKo: '파타고니아 대륙붕', center: [-46, -62], radiusKm: 500, richness: 0.85, prey: '오징어·메를루사' },
  { id: 'scotia_krill', name: 'Scotia Sea Krill Grounds', nameKo: '남극 크릴 어장 (스코샤해)', center: [-61, -58], radiusKm: 500, richness: 0.9, prey: '남극 크릴' },
  { id: 'chile_fjords', name: 'Chilean Fjords', nameKo: '칠레 남부 피오르드', center: [-45, -75], radiusKm: 400, richness: 0.7, prey: '크릴·정어리' },
  { id: 'humboldt_upwelling', name: 'Humboldt Upwelling', nameKo: '훔볼트 용승 (페루 멸치)', center: [-15, -77], radiusKm: 700, richness: 1.0, prey: '페루 멸치 (안초베타)' },
  { id: 'galapagos_upwelling', name: 'Galápagos Upwelling', nameKo: '갈라파고스 용승', center: [0, -90], radiusKm: 300, richness: 0.8, prey: '정어리·플랑크톤' },
  { id: 'hawaii_seamounts', name: 'Hawaiian Seamounts', nameKo: '하와이 해산', center: [22, -158], radiusKm: 250, richness: 0.4, prey: '소형 어류·오징어' },
  { id: 'kamchatka_okhotsk', name: 'Kamchatka / Okhotsk Grounds', nameKo: '캄차카·오호츠크 어장', center: [52, 158], radiusKm: 500, richness: 0.85, prey: '연어·명태' },
  { id: 'bering_pollock', name: 'Bering Sea Pollock Grounds', nameKo: '베링해 명태 어장', center: [57.5, 171], radiusKm: 500, richness: 0.9, prey: '명태·크릴' },
  { id: 'oyashio_front', name: 'Oyashio Front', nameKo: '오야시오 전선 (쿠릴·홋카이도)', center: [43, 150], radiusKm: 400, richness: 0.9, prey: '꽁치·정어리·크릴' },
  { id: 'sanriku', name: 'Sanriku Grounds', nameKo: '산리쿠 어장', center: [38, 143], radiusKm: 250, richness: 0.8, prey: '꽁치·오징어' },
];

/** Food density (0..1) of one ground at a point: full richness inside the inner half, fading to 0 at the edge. */
export function groundDensityAt(ground: FeedingGround, p: LatLng): number {
  const d = haversineKm(p, ground.center);
  if (d >= ground.radiusKm) return 0;
  return ground.richness * clamp((1 - d / ground.radiusKm) * 2, 0, 1);
}

/** Richest ground at a point, or null in barren water. */
export function findFeedingGround(p: LatLng): { ground: FeedingGround; density: number } | null {
  let best: { ground: FeedingGround; density: number } | null = null;
  for (const ground of FEEDING_GROUNDS) {
    const density = groundDensityAt(ground, p);
    if (density > 0 && (!best || density > best.density)) best = { ground, density };
  }
  return best;
}
