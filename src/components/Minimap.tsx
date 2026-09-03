import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import type { DangerEvent, Gravesite } from '../types/game';
import { isLand } from '../data/worldGrid';

// Equirectangular, lat 78 → −72 so Antarctica does not eat a third of the panel.
const W = 264;
const H = 96;
const LAT_TOP = 78;
const LAT_SPAN = 150;

const xOf = (lng: number) => ((lng + 180) / 360) * W;
const yOf = (lat: number) => ((LAT_TOP - lat) / LAT_SPAN) * H;
const wrapLng = (lng: number) => (((lng + 180) % 360) + 360) % 360 - 180;
const clampN = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export interface MinimapViewport {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface MinimapProps {
  /** Fish position; [0, 0] means "not spawned" and draws no marker. */
  coord: [number, number];
  /** Travelled path, already split at the antimeridian. */
  trailSegments: [number, number][][];
  /** The world-tour loop, already split at the antimeridian. */
  routeSegments: [number, number][][];
  gravesites: Gravesite[];
  currentDanger: DangerEvent | null;
  /** Main map bounds as Leaflet reports them (longitudes may be unwrapped). */
  viewport: MinimapViewport | null;
  onNavigate: (lat: number, lng: number) => void;
  onRecenter: () => void;
}

interface Rect { left: number; top: number; width: number; height: number; }

function tracePolyline(ctx: CanvasRenderingContext2D, seg: [number, number][]) {
  ctx.beginPath();
  seg.forEach(([lat, lng], i) => {
    const x = xOf(lng);
    const y = yOf(lat);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

export const Minimap: React.FC<MinimapProps> = React.memo(({
  coord, trailSegments, routeSegments, gravesites, currentDanger, viewport, onNavigate, onRecenter,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const staticRef = useRef<HTMLCanvasElement | null>(null);
  const trailRef = useRef(trailSegments);
  // Synced before the drawing effects below (effects run in declaration order).
  useEffect(() => { trailRef.current = trailSegments; }, [trailSegments]);
  const dpr = Math.min(2, window.devicePixelRatio || 1);

  // Static layer (land, route, graves) into an offscreen canvas, then the
  // trail on top. Neither is redrawn on the 1 Hz state ticks.
  const drawDynamic = useCallback(() => {
    const canvas = canvasRef.current;
    const base = staticRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !base || !ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(base, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.strokeStyle = 'rgba(34,211,238,0.8)';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    for (const seg of trailRef.current) {
      if (seg.length > 1) tracePolyline(ctx, seg);
    }
  }, [dpr]);

  useEffect(() => {
    const off = document.createElement('canvas');
    off.width = W * dpr;
    off.height = H * dpr;
    const ctx = off.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#334155';
    for (let py = 0; py < H; py++) {
      const lat = LAT_TOP - ((py + 0.5) / H) * LAT_SPAN;
      for (let px = 0; px < W; px++) {
        const lng = ((px + 0.5) / W) * 360 - 180;
        if (isLand(lat, lng)) ctx.fillRect(px, py, 1, 1);
      }
    }

    ctx.strokeStyle = 'rgba(6,182,212,0.35)';
    ctx.lineWidth = 1;
    for (const seg of routeSegments) {
      if (seg.length > 1) tracePolyline(ctx, seg);
    }

    ctx.fillStyle = 'rgba(239,68,68,0.6)';
    for (const g of gravesites) {
      ctx.fillRect(xOf(g.coord[1]) - 1, yOf(g.coord[0]) - 1, 2, 2);
    }

    staticRef.current = off;
    drawDynamic();
  }, [routeSegments, gravesites, dpr, drawDynamic]);

  useEffect(() => { drawDynamic(); }, [trailSegments, drawDynamic]);

  // Leaflet hands back unwrapped longitudes (e.g. west 67 / east 292 across the
  // date line), so normalise the west edge and split the rect if it wraps.
  const viewportRects = useMemo<Rect[]>(() => {
    if (!viewport) return [];
    const span = viewport.east - viewport.west;
    if (span <= 0 || span >= 360) return [];
    const top = clampN(yOf(viewport.north), 0, H);
    const bottom = clampN(yOf(viewport.south), 0, H);
    const height = bottom - top;
    if (height <= 0) return [];
    const w = wrapLng(viewport.west);
    const e = w + span;
    if (e <= 180) return [{ left: xOf(w), top, width: xOf(e) - xOf(w), height }];
    return [
      { left: xOf(w), top, width: W - xOf(w), height },
      { left: 0, top, width: xOf(e - 360), height },
    ];
  }, [viewport]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const x = clampN(e.clientX - box.left, 0, W);
    const y = clampN(e.clientY - box.top, 0, H);
    onNavigate(LAT_TOP - (y / H) * LAT_SPAN, wrapLng((x / W) * 360 - 180));
  }, [onNavigate]);

  const hasFish = coord[0] !== 0 || coord[1] !== 0;
  const fishX = xOf(coord[1]);
  const fishY = yOf(coord[0]);

  return (
    <div className="w-full bg-gray-900/95 border border-cyan-800/60 rounded-lg backdrop-blur-sm p-2 font-mono">
      <div className="flex items-center justify-between mb-1 px-0.5">
        <span className="text-[9px] text-gray-500 uppercase tracking-widest">미니맵</span>
        <button
          type="button"
          onClick={onRecenter}
          className="text-[10px] text-cyan-400 hover:text-cyan-200 transition-colors"
        >
          ⌖ 현재 위치
        </button>
      </div>

      <div
        className="relative mx-auto cursor-crosshair overflow-hidden rounded"
        style={{ width: W, height: H }}
        onClick={handleClick}
        title="클릭하면 지도가 그 위치로 이동합니다"
      >
        <canvas
          ref={canvasRef}
          width={W * dpr}
          height={H * dpr}
          style={{ width: W, height: H, display: 'block' }}
        />

        {viewportRects.map((r, i) => (
          <div
            key={i}
            className="absolute pointer-events-none"
            style={{
              left: r.left, top: r.top, width: r.width, height: r.height,
              border: '1px solid rgba(255,255,255,0.35)',
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.4)',
            }}
          />
        ))}

        {currentDanger && (
          <div
            className="absolute pointer-events-none weather-fx"
            style={{
              left: xOf(currentDanger.coord[1]), top: yOf(currentDanger.coord[0]),
              width: 10, height: 10, borderRadius: '50%',
              border: '2px solid #ef4444',
              animation: 'minimap-ping 1.2s ease-out infinite',
            }}
          />
        )}

        {hasFish && (
          <>
            <div
              className="absolute pointer-events-none weather-fx"
              style={{
                left: fishX, top: fishY, width: 12, height: 12, borderRadius: '50%',
                border: '1.5px solid rgba(34,211,238,0.9)',
                animation: 'minimap-ping 1.6s ease-out infinite',
              }}
            />
            <div
              className="absolute pointer-events-none"
              style={{
                left: fishX, top: fishY, width: 6, height: 6, borderRadius: '50%',
                background: '#22d3ee', boxShadow: '0 0 6px #22d3ee',
                transform: 'translate(-50%, -50%)',
              }}
            />
          </>
        )}
      </div>
    </div>
  );
});
