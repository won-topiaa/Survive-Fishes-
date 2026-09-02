import React, { useEffect, useState } from 'react';
import type { DangerEvent } from '../types/game';
import { dangerRgba } from '../data/dangerTheme';

const FLASH_MS = 300;

interface DangerScreenEffectProps {
  danger: DangerEvent;
}

// A full-screen colour flash when a danger fires, plus an edge glow for as long
// as the alert lasts. App mounts it only while an alert is active, so the flash
// simply starts on mount. Sits above the DangerAlertModal (z-3000) so it stays
// visible over the modal's backdrop, and below the DangerBanner (z-4000); it
// never takes pointer events, so the modal's button stays clickable.
export const DangerScreenEffect: React.FC<DangerScreenEffectProps> = ({ danger }) => {
  const [flash, setFlash] = useState(true);

  useEffect(() => {
    const t = window.setTimeout(() => setFlash(false), FLASH_MS);
    return () => clearTimeout(t);
  }, []);

  const type = danger.type;

  return (
    <div className="fixed inset-0 z-[3500] pointer-events-none">
      {flash && (
        <div
          className="danger-fx"
          style={{
            position: 'absolute',
            inset: 0,
            background: dangerRgba(type, 0.25),
            animation: `screen-flash ${FLASH_MS}ms ease-out forwards`,
          }}
        />
      )}

      {/* Edge vignette */}
      <div
        className="danger-fx"
        style={{
          position: 'absolute',
          inset: 0,
          boxShadow: `inset 0 0 80px ${dangerRgba(type, 0.2)}, inset 0 0 160px ${dangerRgba(type, 0.1)}`,
          animation: 'edge-pulse 2s ease-in-out infinite alternate',
        }}
      />

      {/* Scan lines */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.03) 3px, rgba(0,0,0,0.03) 6px)',
          opacity: 0.5,
        }}
      />
    </div>
  );
};
