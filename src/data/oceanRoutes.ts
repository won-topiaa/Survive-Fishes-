import type { RouteWaypoint } from './types';

export const WORLD_TOUR_ROUTE: RouteWaypoint[] = [
  // === 1. 서태평양 출발 (대만 해협) ===
  { coord: [22.0, 118.0], name: 'Taiwan Strait', region: '대만 해협' },
  { coord: [18.0, 114.0], name: 'South China Sea North', region: '남중국해 북부' },
  { coord: [12.0, 112.0], name: 'South China Sea Central', region: '남중국해 중부' },
  { coord: [7.0, 108.0], name: 'South China Sea South', region: '남중국해 남부' },

  // === 2. 말라카 해협 → 인도양 ===
  { coord: [2.5, 104.0], name: 'Strait of Malacca East', region: '말라카 해협 동' },
  { coord: [1.5, 101.5], name: 'Strait of Malacca Center', region: '말라카 해협 중앙' },
  { coord: [3.0, 97.0], name: 'Strait of Malacca West', region: '말라카 해협 서' },
  { coord: [5.0, 80.0], name: 'Sri Lanka South', region: '스리랑카 남방' },
  { coord: [4.0, 73.0], name: 'Maldives', region: '몰디브 해역' },

  // === 3. 인도양 횡단 ===
  { coord: [-5.0, 55.0], name: 'Seychelles', region: '세이셸 해역' },
  { coord: [-18.0, 42.0], name: 'Mozambique Channel', region: '모잠비크 해협' },
  { coord: [-32.0, 32.0], name: 'Agulhas Current', region: '아굴라스 해류' },
  { coord: [-34.8, 20.0], name: 'Cape Agulhas', region: '아굴라스 곶' },

  // === 4. 희망봉 → 대서양 북상 ===
  { coord: [-34.0, 18.5], name: 'Cape of Good Hope', region: '희망봉' },
  { coord: [-33.0, 14.0], name: 'Cape Town Offshore', region: '케이프타운 근해' },
  { coord: [-25.0, 5.0], name: 'Benguela Current', region: '벵겔라 해류' },
  { coord: [-16.0, -5.0], name: 'Mid-South Atlantic', region: '중남 대서양' },
  { coord: [-8.0, -14.0], name: 'Ascension Island', region: '어센션섬 해역' },
  { coord: [0.0, -22.0], name: 'Equatorial Atlantic', region: '적도 대서양' },

  // === 5. 북대서양 → 북극권 ===
  { coord: [15.0, -24.0], name: 'Cape Verde', region: '카보베르데 해역' },
  { coord: [28.0, -15.0], name: 'Canary Islands', region: '카나리아 제도' },
  { coord: [36.0, -8.0], name: 'Strait of Gibraltar', region: '지브롤터 해협' },
  { coord: [44.0, -8.0], name: 'Bay of Biscay', region: '비스케이만' },
  { coord: [50.5, -1.0], name: 'English Channel', region: '영국 해협' },
  { coord: [56.0, 3.0], name: 'North Sea', region: '북해' },
  { coord: [62.0, 2.0], name: 'Norwegian Sea', region: '노르웨이해' },
  { coord: [66.5, -2.0], name: 'Arctic Circle', region: '북극권 해역' },
  { coord: [70.0, -15.0], name: 'Iceland North', region: '아이슬란드 북방' },
  { coord: [65.0, -35.0], name: 'Denmark Strait', region: '덴마크 해협' },
  { coord: [58.0, -50.0], name: 'Labrador Sea', region: '래브라도해' },

  // === 6. 북미 동부 → 카리브해 ===
  { coord: [46.0, -48.0], name: 'Grand Banks', region: '그랜드 뱅크스' },
  { coord: [40.0, -60.0], name: 'Nova Scotia', region: '노바스코샤 근해' },
  { coord: [36.0, -72.0], name: 'Gulf Stream', region: '걸프 스트림' },
  { coord: [32.0, -65.0], name: 'Bermuda', region: '버뮤다' },
  { coord: [25.0, -77.0], name: 'Bahamas', region: '바하마' },
  { coord: [20.0, -86.0], name: 'Gulf of Mexico', region: '멕시코만' },
  { coord: [16.0, -62.0], name: 'Caribbean', region: '카리브해' },

  // === 7. 남미 연안 ===
  { coord: [10.0, -60.0], name: 'Trinidad', region: '트리니다드 해역' },
  { coord: [5.0, -48.0], name: 'Amazon Mouth', region: '아마존 하구' },
  { coord: [-5.0, -35.0], name: 'Brazil Northeast', region: '브라질 북동 연안' },
  { coord: [-23.0, -42.0], name: 'Brazil Southeast', region: '브라질 남동 (리우)' },
  { coord: [-35.0, -52.0], name: 'Argentina Coast', region: '아르헨티나 연안' },
  { coord: [-42.0, -58.0], name: 'Patagonia Coast', region: '파타고니아 연안' },
  { coord: [-50.0, -62.0], name: 'Falklands', region: '포클랜드 해역' },

  // === 8. 호른 곶 → 남극 ===
  { coord: [-55.5, -66.0], name: 'Drake Passage East', region: '드레이크 해협 동' },
  { coord: [-56.0, -68.0], name: 'Cape Horn', region: '호른 곶' },
  { coord: [-58.0, -63.0], name: 'Drake Passage', region: '드레이크 해협' },
  { coord: [-62.0, -58.0], name: 'South Shetland Islands', region: '사우스셰틀랜드 제도' },
  { coord: [-65.0, -64.0], name: 'Antarctic Peninsula', region: '남극 반도' },
  { coord: [-67.0, -75.0], name: 'Bellingshausen Sea', region: '벨링스하우젠해' },
  { coord: [-63.0, -85.0], name: 'Amundsen Sea Approach', region: '아문센해 접근' },

  // === 9. 남태평양 북상 ===
  { coord: [-55.0, -80.0], name: 'Chile Far South', region: '칠레 최남단' },
  { coord: [-45.0, -76.0], name: 'Chilean Fjords', region: '칠레 피오르드' },
  { coord: [-35.0, -74.0], name: 'Chile Central', region: '칠레 중부 연안' },
  { coord: [-25.0, -72.0], name: 'Atacama Coast', region: '아타카마 연안' },
  { coord: [-15.0, -76.0], name: 'Peru Central Coast', region: '페루 중부 연안' },
  { coord: [-5.0, -82.0], name: 'Peru North Coast', region: '페루 북부 연안' },
  { coord: [0.0, -90.0], name: 'Galapagos', region: '갈라파고스 해역' },

  // === 10. 북태평양 횡단 ===
  { coord: [8.0, -100.0], name: 'Eastern Pacific', region: '동태평양' },
  { coord: [15.0, -120.0], name: 'Central Pacific', region: '중부 태평양' },
  { coord: [20.0, -155.0], name: 'Hawaii South', region: '하와이 남방' },
  { coord: [22.0, -158.0], name: 'Hawaii', region: '하와이 해역' },
  { coord: [25.0, -168.0], name: 'North Pacific', region: '북태평양' },
  { coord: [28.0, -178.0], name: 'Date Line Approach', region: '날짜변경선 접근' },
  { coord: [30.0, 175.0], name: 'West Pacific Open', region: '서태평양 외해' },

  // === 11. 베링해 → 북태평양 북부 ===
  { coord: [35.0, 168.0], name: 'Northwest Pacific', region: '북서태평양' },
  { coord: [42.0, 165.0], name: 'North Pacific West', region: '북태평양 서부' },
  { coord: [48.0, 162.0], name: 'Kamchatka South', region: '캄차카 남부' },
  { coord: [54.0, 160.0], name: 'Kamchatka Peninsula', region: '캄차카 반도' },
  { coord: [58.0, 168.0], name: 'Bering Sea', region: '베링해' },
  { coord: [55.0, 172.0], name: 'Aleutian Arc', region: '알류샨 열도' },
  { coord: [50.0, 165.0], name: 'Sea of Okhotsk Approach', region: '오호츠크해 접근' },

  // === 12. 서태평양 귀환 ===
  { coord: [45.0, 155.0], name: 'Kuril Islands', region: '쿠릴 열도' },
  { coord: [42.0, 148.0], name: 'Hokkaido', region: '홋카이도 근해' },
  { coord: [36.0, 141.0], name: 'Japan Northeast', region: '일본 동북 (센다이)' },
  { coord: [34.0, 140.0], name: 'Japan Central', region: '일본 중부 (도쿄)' },
  { coord: [30.0, 135.0], name: 'Kuroshio Current', region: '쿠로시오 해류' },
  { coord: [28.0, 130.0], name: 'East China Sea', region: '동중국해' },
  { coord: [25.0, 125.0], name: 'Ryukyu Islands', region: '류큐 열도' },
  { coord: [22.0, 118.0], name: 'Return to Start', region: '출발지 귀환' },
];

export const ROUTE_TOTAL_DISTANCE_KM = 75_000;

export function getRouteSegments(): [number, number][][] {
  const segments: [number, number][][] = [];
  let current: [number, number][] = [];

  for (let i = 0; i < WORLD_TOUR_ROUTE.length; i++) {
    const wp = WORLD_TOUR_ROUTE[i];
    if (i > 0) {
      const prev = WORLD_TOUR_ROUTE[i - 1];
      const lngDiff = Math.abs(wp.coord[1] - prev.coord[1]);
      if (lngDiff > 180) {
        segments.push(current);
        current = [];
      }
    }
    current.push(wp.coord);
  }
  if (current.length > 0) segments.push(current);
  return segments;
}
