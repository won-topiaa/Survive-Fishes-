import type { RouteWaypoint } from './types';

export const WORLD_TOUR_ROUTE: RouteWaypoint[] = [
  // === 서태평양 출발 (대만 해협 부근) ===
  { coord: [22.0, 118.0], name: 'Taiwan Strait', region: '대만 해협' },
  { coord: [18.0, 114.0], name: 'South China Sea North', region: '남중국해 북부' },
  { coord: [12.0, 112.0], name: 'South China Sea Central', region: '남중국해 중부' },
  { coord: [7.0, 108.0], name: 'South China Sea South', region: '남중국해 남부' },

  // === 말라카 해협 → 인도양 ===
  { coord: [2.5, 104.0], name: 'Strait of Malacca East', region: '말라카 해협 동' },
  { coord: [1.5, 101.5], name: 'Strait of Malacca Center', region: '말라카 해협 중앙' },
  { coord: [3.0, 97.0], name: 'Strait of Malacca West', region: '말라카 해협 서' },
  { coord: [5.0, 90.0], name: 'Bay of Bengal South', region: '벵골만 남부' },
  { coord: [5.0, 80.0], name: 'Sri Lanka South', region: '스리랑카 남방' },
  { coord: [4.0, 73.0], name: 'Maldives', region: '몰디브 해역' },

  // === 인도양 횡단 ===
  { coord: [0.0, 65.0], name: 'Central Indian Ocean', region: '중부 인도양' },
  { coord: [-5.0, 55.0], name: 'Seychelles', region: '세이셸 해역' },
  { coord: [-10.0, 48.0], name: 'Mozambique Channel North', region: '모잠비크 해협 북부' },
  { coord: [-18.0, 42.0], name: 'Mozambique Channel Center', region: '모잠비크 해협 중앙' },
  { coord: [-26.0, 38.0], name: 'Mozambique Channel South', region: '모잠비크 해협 남부' },

  // === 아굴라스 해류 → 희망봉 ===
  { coord: [-32.0, 32.0], name: 'Agulhas Current', region: '아굴라스 해류' },
  { coord: [-34.8, 20.0], name: 'Cape Agulhas', region: '아굴라스 곶' },
  { coord: [-34.0, 18.5], name: 'Cape of Good Hope', region: '희망봉' },
  { coord: [-33.0, 14.0], name: 'Cape Town Offshore', region: '케이프타운 근해' },

  // === 남대서양 북상 ===
  { coord: [-28.0, 8.0], name: 'South Atlantic East', region: '남대서양 동부' },
  { coord: [-22.0, 2.0], name: 'Gulf of Guinea Approach', region: '기니만 접근' },
  { coord: [-15.0, -5.0], name: 'Benguela Current Zone', region: '벵겔라 해류대' },
  { coord: [-8.0, -12.0], name: 'Mid-South Atlantic', region: '중남 대서양' },
  { coord: [0.0, -20.0], name: 'Equatorial Atlantic', region: '적도 대서양' },
  { coord: [-5.0, -28.0], name: 'Brazil Current Approach', region: '브라질 해류 접근' },

  // === 남미 연안 → 호른 곶 ===
  { coord: [-15.0, -35.0], name: 'Brazil Northeast', region: '브라질 북동 연안' },
  { coord: [-25.0, -42.0], name: 'Brazil Southeast', region: '브라질 남동 연안' },
  { coord: [-35.0, -52.0], name: 'Argentina Coast', region: '아르헨티나 연안' },
  { coord: [-42.0, -58.0], name: 'Patagonia Coast', region: '파타고니아 연안' },
  { coord: [-50.0, -62.0], name: 'Falklands Approach', region: '포클랜드 접근' },
  { coord: [-55.5, -66.0], name: 'Drake Passage East', region: '드레이크 해협 동' },
  { coord: [-56.0, -68.0], name: 'Cape Horn', region: '호른 곶' },
  { coord: [-55.0, -72.0], name: 'Drake Passage West', region: '드레이크 해협 서' },

  // === 남태평양 북상 ===
  { coord: [-48.0, -76.0], name: 'Chile South', region: '칠레 남부 연안' },
  { coord: [-40.0, -76.0], name: 'Chile Central', region: '칠레 중부 연안' },
  { coord: [-30.0, -74.0], name: 'Humboldt Current Zone', region: '훔볼트 해류대' },
  { coord: [-20.0, -72.0], name: 'Peru South Coast', region: '페루 남부 연안' },
  { coord: [-12.0, -78.0], name: 'Peru Central Coast', region: '페루 중부 연안' },
  { coord: [-5.0, -82.0], name: 'Peru North Coast', region: '페루 북부 연안' },
  { coord: [0.0, -90.0], name: 'Galapagos', region: '갈라파고스 해역' },

  // === 북태평양 횡단 ===
  { coord: [5.0, -95.0], name: 'Eastern Pacific Warm Pool', region: '동태평양 난수역' },
  { coord: [10.0, -110.0], name: 'Central American Offshore', region: '중미 근해' },
  { coord: [15.0, -125.0], name: 'North Equatorial Current', region: '북적도 해류' },
  { coord: [18.0, -140.0], name: 'Central Pacific', region: '중부 태평양' },
  { coord: [20.0, -155.0], name: 'Hawaii South', region: '하와이 남방' },
  { coord: [22.0, -158.0], name: 'Hawaii', region: '하와이 해역' },
  { coord: [25.0, -170.0], name: 'North Pacific', region: '북태평양' },
  { coord: [28.0, 180.0], name: 'International Date Line', region: '날짜변경선' },

  // === 서태평양 귀환 ===
  { coord: [28.0, 170.0], name: 'West Pacific Open', region: '서태평양 외해' },
  { coord: [27.0, 158.0], name: 'Midway Approach', region: '미드웨이 접근' },
  { coord: [26.0, 148.0], name: 'Northwest Pacific', region: '북서태평양' },
  { coord: [28.0, 140.0], name: 'Ogasawara Islands', region: '오가사와라 해역' },
  { coord: [30.0, 135.0], name: 'Kuroshio Current', region: '쿠로시오 해류' },
  { coord: [28.0, 130.0], name: 'East China Sea', region: '동중국해' },
  { coord: [25.0, 125.0], name: 'Ryukyu Islands', region: '류큐 열도' },
  { coord: [22.0, 118.0], name: 'Return to Start', region: '출발지 귀환' },
];

export const ROUTE_TOTAL_DISTANCE_KM = 50_000;

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
