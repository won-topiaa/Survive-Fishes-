import React, { useEffect, useState, useRef } from 'react';
import type { DangerEvent } from '../types/game';

interface DangerScreenEffectProps {
  danger: DangerEvent | null;
  phase: string;
}

const EDGE_COLORS: Record<string, string> = {
  FISHING:   'rgba(251,146,60,',
  STORM:     'rgba(192,132,252,',
  PREDATOR:  'rgba(248,113,113,',
  DEAD_ZONE: 'rgba(74,222,128,',
  HIGH_RISK: 'rgba(251,191,36,',
};

export const DangerScreenEffect: React.FC<DangerScreenEffectProps> = ({ danger, phase }) => {
  const [active, setActive] = useState(false);
  const [flash, setFlash] = useState(false);
  const prevRef = useRef<DangerEvent | null>(null);

  useEffect(() => {
    if (danger && phase === 'DANGER_ALERT' && danger !== prevRef.current) {
      prevRef.current = danger;
      setFlash(true);
      setActive(true);

      const t1 = window.setTimeout(() => setFlash(false), 200);
      const t2 = window.setTimeout(() => setActive(false), 3500);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [danger, phase]);

  if (!active && phase !== 'DANGER_ALERT') return null;

  const colorBase = danger ? (EDGE_COLORS[danger.type] ?? 'rgba(239,68,68,') : 'rgba(239,68,68,';
  const isAlertPhase = phase === 'DANGER_ALERT';

  return (
    <div className="fixed inset-0 z-[2500] pointer-events-none">
      {/* Full-screen flash on trigger */}
      {flash && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `${colorBase}0.25)`,
            animation: 'screenFlash 0.3s ease-out forwards',
          }}
        />
      )}

      {/* Edge vignette glow while alert is active */}
      {isAlertPhase && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            boxShadow: `inset 0 0 80px ${colorBase}0.2), inset 0 0 160px ${colorBase}0.1)`,
            animation: 'edgePulse 2s ease-in-out infinite alternate',
          }}
        />
      )}

      {/* Scan lines during alert */}
      {isAlertPhase && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.03) 3px, rgba(0,0,0,0.03) 6px)',
            opacity: 0.5,
          }}
        />
      )}

      <style>{`
        @keyframes screenFlash {
          0%   { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes edgePulse {
          from { opacity: 0.6; }
          to   { opacity: 1; }
        }
      `}</style>
    </div>
  );
};
