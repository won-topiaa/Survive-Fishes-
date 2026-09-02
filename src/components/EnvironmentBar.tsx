import React from 'react';
import type { GameState } from '../types/game';
import { formatClock, clockIcon } from '../utils/format';

interface EnvironmentBarProps {
  state: GameState;
}

interface Chip {
  key: string;
  text: string;
  className: string;
}

/** "쿠로시오 해류 (黒潮)" → "쿠로시오 해류" */
const shortName = (name: string) => name.replace(/\s*\(.*?\)/g, '').trim();

const HAZARD_CHIP = {
  STORM_CORRIDOR: { icon: '🌀', className: 'border-purple-500 text-purple-300' },
  DEAD_ZONE: { icon: '☠️', className: 'border-green-600 text-green-300' },
  HIGH_RISK: { icon: '⚓', className: 'border-amber-500 text-amber-300' },
} as const;

// Surroundings at a glance, centred between the HUD column and the control
// panel: sim clock, the current acting on the fish, the nearest hazard, food.
export const EnvironmentBar: React.FC<EnvironmentBarProps> = ({ state }) => {
  if (state.phase !== 'PLAYING' && state.phase !== 'DANGER_ALERT') return null;

  const chips: Chip[] = [
    {
      key: 'clock',
      text: `${clockIcon(state.simHour)} D+${state.simDay} ${formatClock(state.simHour)}`,
      className: 'border-gray-700 text-gray-300',
    },
  ];

  const current = state.currentEffect;
  if (current) {
    const pct = Math.round(Math.abs(current.factor - 1) * 100);
    const name = shortName(current.nameKo);
    if (current.alignment === 'WITH') {
      chips.push({ key: 'current', text: `🌊 ${name} 순류 +${pct}%`, className: 'border-emerald-600 text-emerald-300' });
    } else if (current.alignment === 'AGAINST') {
      chips.push({ key: 'current', text: `🌊 ${name} 역류 -${pct}%`, className: 'border-red-600 text-red-300' });
    } else {
      chips.push({ key: 'current', text: `🌊 ${name} 횡류`, className: 'border-gray-600 text-gray-400' });
    }
  }

  const hazard = state.nearbyHazard;
  if (hazard) {
    const { icon, className } = HAZARD_CHIP[hazard.type];
    chips.push({
      key: 'hazard',
      text: `${icon} ${shortName(hazard.nameKo)} ${Math.round(hazard.intensity * 100)}%`,
      className,
    });
  }

  const { food } = state;
  if (food.groundNameKo && food.density >= 0.05) {
    const level = food.density >= 0.6 ? '풍부' : food.density >= 0.3 ? '보통' : '희박';
    chips.push({ key: 'food', text: `🦐 ${shortName(food.groundNameKo)} ${level}`, className: 'border-pink-500 text-pink-300' });
  } else {
    chips.push({ key: 'food', text: '🏜️ 먹이 없음', className: 'border-gray-700 text-gray-500' });
  }

  return (
    <div className="absolute top-3 left-[19rem] right-[14rem] z-[1000] flex flex-wrap justify-center gap-1.5 pointer-events-none">
      {chips.map(chip => (
        <span
          key={chip.key}
          className={`px-2.5 py-1 rounded-full bg-gray-900/90 border text-[11px] font-mono whitespace-nowrap backdrop-blur-sm ${chip.className}`}
        >
          {chip.text}
        </span>
      ))}
    </div>
  );
};
