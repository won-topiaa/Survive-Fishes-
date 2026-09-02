import React, { useEffect, useRef, useState } from 'react';
import type { DangerEvent } from '../types/game';

interface DangerBannerProps {
  danger: DangerEvent | null;
  phase: string;
}

const DANGER_INFO: Record<string, { icon: string; label: string; color: string; glow: string; bg: string }> = {
  FISHING:   { icon: '🚢', label: '어선 출몰!',   color: '#fb923c', glow: 'rgba(251,146,60,0.6)',  bg: 'rgba(251,146,60,0.12)' },
  STORM:     { icon: '🌀', label: '태풍 출몰!',   color: '#c084fc', glow: 'rgba(192,132,252,0.6)', bg: 'rgba(192,132,252,0.12)' },
  PREDATOR:  { icon: '🦈', label: '포식자 접근!', color: '#f87171', glow: 'rgba(248,113,113,0.6)', bg: 'rgba(248,113,113,0.12)' },
  DEAD_ZONE: { icon: '☠️', label: '데드존 진입!', color: '#4ade80', glow: 'rgba(74,222,128,0.6)',  bg: 'rgba(74,222,128,0.12)' },
  HIGH_RISK: { icon: '⚓', label: '선박 밀집!',   color: '#fbbf24', glow: 'rgba(251,191,36,0.6)',  bg: 'rgba(251,191,36,0.12)' },
};

export const DangerBanner: React.FC<DangerBannerProps> = ({ danger, phase }) => {
  const [visible, setVisible] = useState(false);
  const [show, setShow] = useState(false);
  const prevDangerRef = useRef<DangerEvent | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (danger && phase === 'DANGER_ALERT' && danger !== prevDangerRef.current) {
      prevDangerRef.current = danger;
      setVisible(true);
      requestAnimationFrame(() => setShow(true));

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => {
        setShow(false);
        window.setTimeout(() => setVisible(false), 600);
      }, 3000);
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [danger, phase]);

  if (!visible || !danger) return null;

  const info = DANGER_INFO[danger.type] ?? DANGER_INFO.STORM;

  return (
    <div
      className="fixed inset-x-0 z-[4000] pointer-events-none flex justify-center"
      style={{ top: '18%' }}
    >
      <div
        style={{
          opacity: show ? 1 : 0,
          transform: show ? 'scale(1) translateY(0)' : 'scale(0.7) translateY(-30px)',
          transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <div
          style={{
            background: info.bg,
            border: `2px solid ${info.color}`,
            borderRadius: '12px',
            padding: '12px 32px',
            backdropFilter: 'blur(12px)',
            boxShadow: `0 0 40px ${info.glow}, 0 0 80px ${info.glow}, inset 0 0 20px ${info.bg}`,
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Scan line effect */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)`,
              pointerEvents: 'none',
            }}
          />

          {/* Pixel-style border flash */}
          <div
            style={{
              position: 'absolute',
              inset: '-2px',
              border: `3px solid ${info.color}`,
              borderRadius: '14px',
              animation: 'dangerPulse 0.5s ease-in-out infinite alternate',
              pointerEvents: 'none',
            }}
          />

          <span style={{ fontSize: '36px', filter: `drop-shadow(0 0 8px ${info.glow})`, position: 'relative' }}>
            {info.icon}
          </span>

          <div style={{ position: 'relative' }}>
            <div
              style={{
                fontFamily: "'SF Mono', 'Consolas', monospace",
                fontSize: '22px',
                fontWeight: 900,
                color: info.color,
                textShadow: `0 0 10px ${info.glow}, 0 0 20px ${info.glow}`,
                letterSpacing: '3px',
                textTransform: 'uppercase',
              }}
            >
              {info.label}
            </div>
            <div
              style={{
                fontFamily: "'SF Mono', 'Consolas', monospace",
                fontSize: '10px',
                color: 'rgba(255,255,255,0.5)',
                marginTop: '2px',
                letterSpacing: '1px',
              }}
            >
              {danger.name} — 위험도 {(danger.severity * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes dangerPulse {
          from { opacity: 1; }
          to   { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};
