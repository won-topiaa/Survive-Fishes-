import React from 'react';
import { engine, HUNT_GAIN, HUNT_MIN_DENSITY } from '../engine/GameEngine';
import type { GameState } from '../types/game';
import type { DepthLayer } from '../types/fish';
import { formatCooldown } from '../utils/format';

interface ControlPanelProps {
  state: GameState;
}

const DISABLED_CLASS = 'bg-gray-900 border-gray-700 text-gray-500 cursor-not-allowed';

function huntButton(state: GameState): { label: string; className: string; disabled: boolean } {
  if (state.isFeeding) {
    return {
      label: `🍽️ 사냥 중 ${formatCooldown(state.feedingRemainingSeconds)}`,
      className: 'bg-emerald-900/60 border-emerald-400 text-emerald-300 animate-pulse motion-reduce:animate-none',
      disabled: true,
    };
  }
  if (state.huntCooldownRemaining > 0) {
    return { label: `🍽️ 사냥 쿨다운 ${formatCooldown(state.huntCooldownRemaining)}`, className: DISABLED_CLASS, disabled: true };
  }
  const density = state.food.density;
  if (density < 0.05) return { label: '🍽️ 먹이 없음', className: DISABLED_CLASS, disabled: true };
  if (density < HUNT_MIN_DENSITY) return { label: '🍽️ 먹이 희박', className: DISABLED_CLASS, disabled: true };
  return {
    label: `🍽️ 먹이 사냥 (+${Math.round(HUNT_GAIN * density)}%)`,
    className: 'bg-emerald-900/80 border-emerald-500 text-emerald-300 hover:bg-emerald-800 shadow-[0_0_12px_rgba(52,211,153,0.25)]',
    disabled: false,
  };
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ state }) => {
  if (state.phase !== 'PLAYING' && state.phase !== 'DANGER_ALERT') return null;

  const depths: { layer: DepthLayer; label: string; sub: string; color: string }[] = [
    { layer: 'SURFACE', label: '표층', sub: '0~50m', color: 'bg-sky-900 hover:bg-sky-800 border-sky-700' },
    { layer: 'MID', label: '중층', sub: '50~200m', color: 'bg-blue-900 hover:bg-blue-800 border-blue-700' },
    { layer: 'ABYSS', label: '심해', sub: '200m+', color: 'bg-slate-900 hover:bg-slate-800 border-slate-700' },
  ];

  const skill = state.species?.activeSkill;
  const hunt = huntButton(state);

  return (
    <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2 w-52">
      <div className="bg-gray-900/95 p-3 rounded-lg border border-gray-700/60 backdrop-blur-sm">
        <span className="text-[10px] text-gray-400 uppercase tracking-widest">수심 제어</span>
        <div className="flex flex-col gap-1 mt-2">
          {depths.map(d => (
            <button
              key={d.layer}
              onClick={() => engine.setDepth(d.layer)}
              className={`px-3 py-1.5 text-xs rounded border transition-all ${
                state.depth === d.layer
                  ? 'ring-1 ring-cyan-400 text-cyan-300 bg-cyan-900/30 border-cyan-600'
                  : `text-gray-300 ${d.color}`
              }`}
            >
              {d.label} <span className="text-gray-500 text-[10px]">{d.sub}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => engine.activateBoost()}
        disabled={state.boostCooldownRemaining > 0}
        className={`py-2.5 px-3 rounded-lg border text-sm font-bold transition-all ${
          state.boostCooldownRemaining > 0
            ? DISABLED_CLASS
            : 'bg-yellow-900/80 border-yellow-500 text-yellow-300 hover:bg-yellow-800 shadow-[0_0_15px_rgba(234,179,8,0.3)]'
        }`}
      >
        {state.boostCooldownRemaining > 0
          ? `🚀 쿨다운 ${formatCooldown(state.boostCooldownRemaining)}`
          : '🚀 2x 터보 부스트'}
      </button>

      <button
        onClick={() => engine.hunt()}
        disabled={hunt.disabled}
        className={`py-1.5 px-3 rounded-lg border text-xs font-bold transition-all ${hunt.className}`}
      >
        {hunt.label}
      </button>

      {skill && (
        <button
          onClick={() => engine.activateSkill()}
          disabled={state.skillCooldownRemaining > 0 || state.isSkillActive}
          className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
            state.isSkillActive
              ? 'bg-purple-900/60 border-purple-400 text-purple-300 animate-pulse motion-reduce:animate-none'
              : state.skillCooldownRemaining > 0
                ? DISABLED_CLASS
                : 'bg-purple-900/80 border-purple-500 text-purple-300 hover:bg-purple-800'
          }`}
        >
          {state.isSkillActive
            ? `✨ ${skill.nameKo} 활성!`
            : state.skillCooldownRemaining > 0
              ? `✨ ${skill.nameKo} ${formatCooldown(state.skillCooldownRemaining)}`
              : `✨ ${skill.nameKo}`}
        </button>
      )}

      <button
        onClick={() => engine.toggleSleepMode()}
        className={`py-2 px-3 rounded-lg border text-xs transition-all ${
          state.isSleepModeActive
            ? 'bg-indigo-900/60 border-indigo-400 text-indigo-300'
            : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600'
        }`}
      >
        🌙 야간 잠항 {state.isSleepModeActive ? 'ON' : 'OFF'}
      </button>

      <div className="bg-gray-900/95 p-2 rounded-lg border border-gray-700/60 backdrop-blur-sm">
        <span className="text-[10px] text-gray-400 uppercase tracking-widest">시뮬레이션 속도</span>
        <div className="flex gap-1 mt-1.5">
          {[1, 10, 100, 500].map(s => (
            <button
              key={s}
              onClick={() => engine.setSimSpeed(s)}
              className={`flex-1 py-1 text-[10px] rounded transition-all ${
                state.simSpeed === s
                  ? 'bg-cyan-900/40 text-cyan-300 border border-cyan-600'
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
