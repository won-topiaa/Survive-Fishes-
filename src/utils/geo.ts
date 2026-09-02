export type LatLng = [number, number];

export const EARTH_RADIUS_KM = 6371;
const MAX_MERCATOR_LAT = 85.05112878;

export const toRad = (deg: number) => (deg * Math.PI) / 180;
export const toDeg = (rad: number) => (rad * 180) / Math.PI;
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * sinLng * sinLng;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function bearingRad(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const dLng = toRad(b[1] - a[1]);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return Math.atan2(y, x);
}

/**
 * Great-circle distance from p to the segment a→b, plus the along-track fraction
 * (clamped to [0, 1]) of the closest point. Works purely in angles, so it is safe
 * across the antimeridian.
 */
export function distanceToSegment(p: LatLng, a: LatLng, b: LatLng): { distKm: number; t: number } {
  const abKm = haversineKm(a, b);
  const apKm = haversineKm(a, p);
  if (abKm < 1e-6) return { distKm: apKm, t: 0 };
  if (apKm < 1e-6) return { distKm: 0, t: 0 };

  const bearingDiff = bearingRad(a, p) - bearingRad(a, b);
  if (Math.cos(bearingDiff) < 0) return { distKm: apKm, t: 0 }; // closest point is behind a

  const angAP = apKm / EARTH_RADIUS_KM;
  const angXT = Math.asin(clamp(Math.sin(angAP) * Math.sin(bearingDiff), -1, 1));
  const alongKm = Math.acos(clamp(Math.cos(angAP) / Math.cos(angXT), -1, 1)) * EARTH_RADIUS_KM;
  if (alongKm >= abKm) return { distKm: haversineKm(b, p), t: 1 }; // closest point is beyond b

  return { distKm: Math.abs(angXT) * EARTH_RADIUS_KM, t: alongKm / abKm };
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Interpolates longitude the short way around the ±180° antimeridian. */
export function lerpLng(a: number, b: number, t: number): number {
  const diff = (((b - a + 540) % 360) + 360) % 360 - 180;
  return (((a + diff * t + 540) % 360) + 360) % 360 - 180;
}

export function lerpLatLng(from: LatLng, to: LatLng, t: number): LatLng {
  return [lerp(from[0], to[0], t), lerpLng(from[1], to[1], t)];
}

export function latToMercatorY(lat: number): number {
  const phi = toRad(clamp(lat, -MAX_MERCATOR_LAT, MAX_MERCATOR_LAT));
  return Math.log(Math.tan(Math.PI / 4 + phi / 2));
}

export function mercatorYToLat(y: number): number {
  return toDeg(2 * Math.atan(Math.exp(y)) - Math.PI / 2);
}

/**
 * Point at fraction t along the straight line from→to as it is drawn on a
 * Web-Mercator map, so a marker interpolated this way stays on the polyline.
 */
export function lerpMercator(from: LatLng, to: LatLng, t: number): LatLng {
  return [
    mercatorYToLat(lerp(latToMercatorY(from[0]), latToMercatorY(to[0]), t)),
    lerpLng(from[1], to[1], t),
  ];
}

/**
 * Cumulative ground distance along the Mercator-straight line from→to, sampled at
 * evenly spaced Mercator fractions. Mercator stretches poleward, so equal steps in
 * t are not equal steps in km; this table converts between the two.
 */
export interface ArcTable {
  t: number[];
  km: number[];
  points: LatLng[];
  totalKm: number;
}

export function buildMercatorArcTable(from: LatLng, to: LatLng, steps = 64): ArcTable {
  const t = [0];
  const km = [0];
  const points: LatLng[] = [from];
  let total = 0;
  let prev = from;
  for (let i = 1; i <= steps; i++) {
    const next = lerpMercator(from, to, i / steps);
    total += haversineKm(prev, next);
    prev = next;
    t.push(i / steps);
    km.push(total);
    points.push(next);
  }
  return { t, km, points, totalKm: total };
}

/**
 * Splits a polyline wherever consecutive points jump more than 180° of longitude,
 * so a Mercator map does not draw the jump as a line across the whole world. The
 * crossing leg is kept: the outgoing piece ends at the ±180° edge and the next one
 * starts at the opposite edge, at the interpolated latitude.
 */
export function splitAtAntimeridian(points: LatLng[]): LatLng[][] {
  const segments: LatLng[][] = [];
  let current: LatLng[] = [];

  for (let i = 0; i < points.length; i++) {
    const [lat, lng] = points[i];
    if (i > 0) {
      const [prevLat, prevLng] = points[i - 1];
      const rawDiff = lng - prevLng;
      if (Math.abs(rawDiff) > 180) {
        const unwrappedLng = rawDiff > 0 ? lng - 360 : lng + 360;
        const exitEdge = rawDiff > 0 ? -180 : 180;
        const t = (exitEdge - prevLng) / (unwrappedLng - prevLng);
        const crossingLat = prevLat + (lat - prevLat) * t;
        current.push([crossingLat, exitEdge]);
        segments.push(current);
        current = [[crossingLat, -exitEdge]];
      }
    }
    current.push([lat, lng]);
  }
  if (current.length > 0) segments.push(current);
  return segments;
}

/** Mercator fraction t at which the line has covered `distKm` of ground distance. */
export function arcTableToT(table: ArcTable, distKm: number): number {
  if (distKm <= 0) return 0;
  if (distKm >= table.totalKm) return 1;
  let lo = 0;
  let hi = table.km.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (table.km[mid] <= distKm) lo = mid;
    else hi = mid;
  }
  const span = table.km[hi] - table.km[lo];
  const f = span > 0 ? (distKm - table.km[lo]) / span : 0;
  return table.t[lo] + (table.t[hi] - table.t[lo]) * f;
}

/** Length in km of the Mercator-straight line from→to. */
export function mercatorPathKm(from: LatLng, to: LatLng): number {
  return buildMercatorArcTable(from, to).totalKm;
}

/** Points along the chord from→to, roughly `sampleKm` apart, endpoints included. */
export function samplePath(from: LatLng, to: LatLng, sampleKm: number, maxSteps: number): LatLng[] {
  const chordKm = haversineKm(from, to);
  const steps = clamp(Math.ceil(chordKm / sampleKm), 1, maxSteps);
  const points: LatLng[] = [];
  for (let i = 0; i <= steps; i++) {
    points.push(lerpLatLng(from, to, i / steps));
  }
  return points;
}

export function minDistanceToPoint(path: LatLng[], target: LatLng): number {
  let min = Infinity;
  for (const p of path) {
    const d = haversineKm(p, target);
    if (d < min) min = d;
  }
  return min;
}
