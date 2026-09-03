import React from 'react';
import type { GameState } from '../types/game';
import { STARVATION_SECONDS } from '../engine/GameEngine';
import { formatDuration, formatCooldown, formatKm, formatSleepWindow } from '../utils/format';

interface HUDProps {
  state: GameState;
}

const shortName = (name: string) => name.replace(/\s*\(.*?\)/g, '').trim();

function staminaColor(stamina: number): string {
  if (stamina >= 50) return '#4ade80';
  if (stamina >= 30) return '#facc15';
  if (stamina >= 10) return '#fb923c';
  return '#ef4444';
}

function foodStatus(state: GameState): { text: string; className: string } {
  if (state.isFeeding) {
    return { text: `🍽️ 사냥 중 ${formatCooldown(state.feedingRemainingSeconds)}`, className: 'text-emerald-300' };
  }
  if (state.stamina <= 0) {
    const hoursLeft = Math.max(1, Math.ceil((STARVATION_SECONDS - state.starvingSeconds) / 3600));
    return { text: `☠️ 기아 — ${hoursLeft}시간 내 먹이 필요`, className: 'text-red-400' };
  }
  const { food } = state;
  if (food.groundNameKo && food.density >= 0.05) {
    const level = food.density >= 0.6 ? '풍부' : food.density >= 0.3 ? '보통' : '희박';
    return { text: `🦐 ${shortName(food.groundNameKo)} · 먹이 ${level}`, className: 'text-pink-300' };
  }
  return { text: '먹이 없음 — 먹이 지대(🦐)를 찾으세요', className: 'text-gray-500' };
}

// Lives in the left column App lays out (with the Minimap under it), so it
// carries no absolute positioning of its own.
export const HUD: React.FC<HUDProps> = ({ state }) => {
  if (state.phase === 'MENU' || state.phase === 'SPECIES_SELECT') return null;

  const depthLabels = { SURFACE: '표층', MID: '중층', ABYSS: '심해' };
  const depthSpeed = { SURFACE: '+30%', MID: '1.0x', ABYSS: '-50%' };
  const sleepWindow = formatSleepWindow(state.sleepStart, state.sleepEnd);
  const stamina = Math.round(state.stamina);
  const food = foodStatus(state);

  return (
    <div className="w-full bg-gray-900/95 text-cyan-400 p-4 rounded-lg border border-cyan-800/60 shadow-lg font-mono backdrop-blur-sm">
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

      <div className="mt-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">체력 (먹이)</span>
          <span className="font-bold" style={{ color: staminaColor(state.stamina) }}>{stamina}%</span>
        </div>
        <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              state.stamina < 10 ? 'animate-pulse motion-reduce:animate-none' : ''
            }`}
            style={{ width: `${state.stamina}%`, background: staminaColor(state.stamina) }}
          />
        </div>
        <div className={`text-[10px] mt-1 truncate ${food.className}`}>{food.text}</div>
      </div>

      {state.isBoostActive && (
        <div className="mt-2 text-yellow-400 text-xs animate-pulse motion-reduce:animate-none">
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
