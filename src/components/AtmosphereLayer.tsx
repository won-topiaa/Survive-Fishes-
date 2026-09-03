import React, { useEffect, useRef, useState } from 'react';
import type { EnvironmentHazard } from '../types/game';

interface AtmosphereLayerProps {
  simHour: number;
  hazard: EnvironmentHazard | null;
  isSleeping: boolean;
  /** False outside a voyage: nothing is rendered. */
  active: boolean;
}

// 0 by day, 1 at night, with two-hour dusk (18–20) and dawn (5–7) ramps.
function nightAlpha(hour: number): number {
  const h = ((hour % 24) + 24) % 24;
  if (h >= 7 && h < 18) return 0;
  if (h >= 18 && h < 20) return (h - 18) / 2;
  if (h >= 5 && h < 7) return (7 - h) / 2;
  return 1;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

interface Drop { x: number; y: number; len: number; speed: number; }

const RAIN_FPS_INTERVAL = 33;
const RAIN_MAX_DROPS = 120;
const RAIN_SLANT = 0.27;

// Rain slanting across the map. Mounted for as long as a storm zone is nearby;
// the live intensity comes in through a ref so the loop never restarts on the
// 1 Hz state ticks, and the drop count eases toward the target instead of
// re-seeding.
const RainCanvas: React.FC<{ intensity: number }> = ({ intensity }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const intensityRef = useRef(intensity);
  useEffect(() => { intensityRef.current = intensity; }, [intensity]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const drops: Drop[] = [];
    const spawn = (fromTop: boolean): Drop => ({
      x: Math.random() * (canvas.width + 200) - 100,
      y: fromTop ? -20 : Math.random() * canvas.height,
      len: 8 + Math.random() * 10,
      speed: 600 + Math.random() * 500,
    });

    let raf = 0;
    let last = 0;
    const frame = (ts: number) => {
      raf = requestAnimationFrame(frame);
      if (ts - last < RAIN_FPS_INTERVAL) return;
      const dt = last === 0 ? RAIN_FPS_INTERVAL / 1000 : Math.min(0.1, (ts - last) / 1000);
      last = ts;

      const target = Math.round(RAIN_MAX_DROPS * intensityRef.current);
      if (drops.length < target) drops.push(spawn(false), ...(drops.length + 1 < target ? [spawn(false)] : []));
      else if (drops.length > target) drops.splice(0, Math.min(2, drops.length - target));

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (drops.length === 0) return;

      ctx.strokeStyle = 'rgba(190,210,255,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const d of drops) {
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + d.len * RAIN_SLANT, d.y + d.len);
        d.y += d.speed * dt;
        d.x += d.speed * RAIN_SLANT * dt;
        if (d.y > canvas.height) {
          const fresh = spawn(true);
          d.x = fresh.x;
          d.y = fresh.y;
        }
      }
      ctx.stroke();
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="absolute inset-0"
      style={{ opacity: Math.min(1, 2 * intensity), transition: 'opacity 1.5s' }}
    />
  );
};

const TINT_TRANSITION = 'opacity 1.5s ease';

// Sits above the map (z-0) and below every panel (z-1000): night tint, the
// sleeping vignette, storm rain and lightning, dead-zone haze.
export const AtmosphereLayer: React.FC<AtmosphereLayerProps> = ({ simHour, hazard, isSleeping, active }) => {
  const reducedMotion = useReducedMotion();
  const storm = active && hazard?.type === 'STORM_CORRIDOR' ? hazard.intensity : 0;
  const dead = active && hazard?.type === 'DEAD_ZONE' ? hazard.intensity : 0;
  const traffic = active && hazard?.type === 'HIGH_RISK' ? hazard.intensity : 0;
  const stormActive = storm > 0;
  const stormRef = useRef(storm);
  useEffect(() => { stormRef.current = storm; }, [storm]);

  // Lightning: a timeout chain keyed only on whether a storm is present, so it
  // survives the per-tick intensity changes. Photosensitivity: no flashes at
  // all under reduced motion, a single dim flash per strike otherwise.
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (!stormActive || reducedMotion) return;
    let id = 0;
    let cancelled = false;
    const schedule = () => {
      const delay = (6000 + Math.random() * 6000) / Math.max(stormRef.current, 0.5);
      id = window.setTimeout(() => {
        if (cancelled) return;
        if (document.hidden || stormRef.current <= 0) { schedule(); return; }
        setFlash(true);
        id = window.setTimeout(() => {
          if (cancelled) return;
          setFlash(false);
          schedule();
        }, 120);
      }, delay);
    };
    schedule();
    return () => {
      cancelled = true;
      clearTimeout(id);
      setFlash(false);
    };
  }, [stormActive, reducedMotion]);

  if (!active) return null;

  return (
    <div className="absolute inset-0 z-[500] pointer-events-none overflow-hidden" aria-hidden="true">
      {/* Night: darkest at the edges, light in the centre where the fish is kept. */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 60% 55% at 50% 45%, rgba(8,12,48,0.12) 0%, rgba(8,12,48,0.40) 100%)',
          opacity: nightAlpha(simHour),
          transition: TINT_TRANSITION,
        }}
      />

      {/* Sleeping: deeper indigo with a vignette. */}
      <div
        className="absolute inset-0"
        style={{
          background: 'rgba(49,46,129,0.25)',
          boxShadow: 'inset 0 0 120px rgba(67,56,202,0.35)',
          opacity: isSleeping ? 1 : 0,
          transition: TINT_TRANSITION,
        }}
      />

      {/* Storm clouds */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(30,41,59,0.35)', opacity: storm, transition: TINT_TRANSITION }}
      />
      {stormActive && !reducedMotion && <RainCanvas intensity={storm} />}
      <div
        className="absolute inset-0"
        style={{ background: '#fff', opacity: flash ? Math.min(0.2, 0.35 * storm) : 0, transition: 'none' }}
      />

      {/* Dead zone: murky water with a slow drifting haze. */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(74,222,128,0.10)', opacity: dead, transition: TINT_TRANSITION }}
      />
      <div
        className="absolute inset-0 weather-fx"
        style={{
          background: 'radial-gradient(circle at 30% 40%, rgba(120,160,80,0.18), transparent 60%)',
          opacity: dead,
          transition: TINT_TRANSITION,
          animation: 'haze-drift 14s ease-in-out infinite alternate',
        }}
      />

      {/* Shipping lanes: the faintest amber wash. */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(251,191,36,0.05)', opacity: traffic, transition: TINT_TRANSITION }}
      />
    </div>
  );
};
