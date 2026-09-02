import React from 'react';
import type { GameState } from '../types/game';
import { formatDuration, formatCooldown, formatKm, formatSleepWindow } from '../utils/format';

interface HUDProps {
  state: GameState;
}

export const HUD: React.FC<HUDProps> = ({ state }) => {
  if (state.phase === 'MENU' || state.phase === 'SPECIES_SELECT') return null;

  const depthLabels = { SURFACE: '표층', MID: '중층', ABYSS: '심해' };
  const depthSpeed = { SURFACE: '+30%', MID: '1.0x', ABYSS: '-50%' };
  const sleepWindow = formatSleepWindow(state.sleepStart, state.sleepEnd);

  return (
    <div className="absolute top-3 left-3 z-[1000] bg-gray-900/95 text-cyan-400 p-4 rounded-lg border border-cyan-800/60 shadow-lg font-mono w-72 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-base font-bold text-white tracking-wider">OCEAN WANDERER</h1>
        <span className="text-xs text-gray-500">v3.0</span>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span>{state.species?.emoji} {state.species?.nameKo}</span>
          <span className="text-gray-400">{state.species?.tier} {state.species?.baseSpeedMultiplier}x</span>
        </div>
        <div className="flex justify-between">
          <span>수심: {depthLabels[state.depth]} ({depthSpeed[state.depth]})</span>
          <span className="text-gray-400">{state.currentSpeedKmH.toFixed(1)} km/h</span>
        </div>
        <div className="flex justify-between">
          <span>방어 버블</span>
          <span>{'🛡️'.repeat(state.shieldTokens)}{'🔘'.repeat(2 - state.shieldTokens)}</span>
        </div>
        <div className="flex justify-between">
          <span>항해 시간</span>
          <span className="text-gray-300">{formatDuration(state.elapsedSeconds)}</span>
        </div>
        <div className="flex justify-between">
          <span>이동 거리</span>
          <span className="text-gray-300">{formatKm(state.distanceKm)} km</span>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">세계 일주 진행률</span>
          <span className="text-cyan-300 font-bold">{state.progressPct.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${state.progressPct}%`,
              background: state.progressPct > 80
                ? 'linear-gradient(90deg, #22d3ee, #eab308)'
                : 'linear-gradient(90deg, #0891b2, #22d3ee)',
            }}
          />
        </div>
      </div>

      {state.isBoostActive && (
        <div className="mt-2 text-yellow-400 text-xs animate-pulse">
          🚀 터보 부스트 {formatCooldown(state.boostRemainingSeconds)}
        </div>
      )}
      {state.isSleepModeActive && (
        <div className="mt-2 text-indigo-300 text-xs">
          {state.isSleeping ? `🌙 야간 잠항 중 (${sleepWindow})` : `🌙 야간 잠항 예약됨 (${sleepWindow})`}
        </div>
      )}

      <div className="mt-2 pt-2 border-t border-gray-800 flex justify-between text-xs text-gray-500">
        <span>DNA: {state.totalDnaEarned}pt</span>
        <span>속도: {state.simSpeed}x</span>
      </div>
    </div>
  );
};
