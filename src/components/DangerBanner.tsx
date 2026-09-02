import React, { useEffect, useState } from 'react';
import type { DangerEvent } from '../types/game';
import { DANGER_THEME, dangerRgba } from '../data/dangerTheme';

const SHOW_MS = 3000;
const EXIT_MS = 500;

interface DangerBannerProps {
  danger: DangerEvent;
}

// Flashes a headline ("어선 출몰!") when a danger fires, then gets out of the
// way. App mounts it only while an alert is active, so one mount is one
// danger: state starts in the "just fired" stage and the effect only owns the
// timers, which also keeps it correct under StrictMode's double invocation.
export const DangerBanner: React.FC<DangerBannerProps> = ({ danger }) => {
  const [stage, setStage] = useState<'in' | 'out' | 'done'>('in');

  useEffect(() => {
    const hide = window.setTimeout(() => setStage('out'), SHOW_MS);
    const done = window.setTimeout(() => setStage('done'), SHOW_MS + EXIT_MS);
    return () => { clearTimeout(hide); clearTimeout(done); };
  }, []);

  if (stage === 'done') return null;

  const theme = DANGER_THEME[danger.type];
  const glow = dangerRgba(danger.type, 0.6);
  const tint = dangerRgba(danger.type, 0.12);

  return (
    <div className="fixed inset-x-0 z-[4000] pointer-events-none flex justify-center" style={{ top: '18%' }}>
      <div
        className="danger-fx"
        style={{
          animation: stage === 'in'
            ? 'danger-banner-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both'
            : `danger-banner-out ${EXIT_MS}ms ease-in forwards`,
        }}
      >
        <div
          style={{
            background: tint,
            border: `2px solid ${theme.hex}`,
            borderRadius: '12px',
            padding: '12px 32px',
            backdropFilter: 'blur(12px)',
            boxShadow: `0 0 40px ${glow}, 0 0 80px ${glow}, inset 0 0 20px ${tint}`,
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Scan lines */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)',
              pointerEvents: 'none',
            }}
          />

          {/* Pulsing border */}
          <div
            className="danger-fx"
            style={{
              position: 'absolute',
              inset: '-2px',
              border: `3px solid ${theme.hex}`,
              borderRadius: '14px',
              animation: 'danger-border-pulse 0.5s ease-in-out infinite alternate',
              pointerEvents: 'none',
            }}
          />

          <span style={{ fontSize: '36px', filter: `drop-shadow(0 0 8px ${glow})`, position: 'relative' }}>
            {theme.icon}
          </span>

          <div style={{ position: 'relative' }}>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 900,
                color: theme.hex,
                textShadow: `0 0 10px ${glow}, 0 0 20px ${glow}`,
                letterSpacing: '3px',
              }}
            >
              {theme.label}
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '2px', letterSpacing: '1px' }}>
              {danger.name} — 위험도 {(danger.severity * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
