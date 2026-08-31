import React from 'react';
import type { GameState } from '../types/game';

function formatTime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}일 ${h}시간 ${m}분`;
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

function formatCooldown(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface HUDProps {
  state: GameState;
}

export const HUD: React.FC<HUDProps> = ({ state }) => {
  if (state.phase === 'MENU' || state.phase === 'SPECIES_SELECT') return null;

  const speedKmH = state.species
    ? ((50000 / (state.species.expectedStandardDays * 24)) * (state.isBoostActive ? 2 : 1) * (state.depth === 'SURFACE' ? 1.3 : state.depth === 'ABYSS' ? 0.5 : 1)).toFixed(1)
    : '0';

  const depthLabels = { SURFACE: '표층', MID: '중층', ABYSS: '심해' };
  const depthSpeed = { SURFACE: '+30%', MID: '1.0x', ABYSS: '-50%' };

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
          <span className="text-gray-400">{speedKmH} km/h</span>
        </div>
        <div className="flex justify-between">
          <span>방어 버블</span>
          <span>{'🛡️'.repeat(state.shieldTokens)}{'🔘'.repeat(2 - state.shieldTokens)}</span>
        </div>
        <div className="flex justify-between">
          <span>항해 시간</span>
          <span className="text-gray-300">{formatTime(state.elapsedSeconds)}</span>
        </div>
        <div className="flex justify-between">
          <span>이동 거리</span>
          <span className="text-gray-300">{state.distanceKm.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} km</span>
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
          🌙 야간 잠항 모드 활성
        </div>
      )}

      <div className="mt-2 pt-2 border-t border-gray-800 flex justify-between text-xs text-gray-500">
        <span>DNA: {state.totalDnaEarned}pt</span>
        <span>속도: {state.simSpeed}x</span>
      </div>
    </div>
  );
};
