import React from 'react';
import type { GameState } from '../types/game';
import { engine } from '../engine/GameEngine';

interface DangerAlertModalProps {
  state: GameState;
}

export const DangerAlertModal: React.FC<DangerAlertModalProps> = ({ state }) => {
  if (state.phase !== 'DANGER_ALERT' || !state.currentDanger) return null;

  const pct = (state.dangerCountdown / 300) * 100;
  const isUrgent = state.dangerCountdown < 60;
  const minutes = Math.floor(state.dangerCountdown / 60);
  const seconds = Math.floor(state.dangerCountdown % 60);

  const typeInfo: Record<string, { icon: string; color: string }> = {
    FISHING: { icon: '🚢', color: 'text-orange-400' },
    PREDATOR: { icon: '🦈', color: 'text-red-400' },
    STORM: { icon: '🌀', color: 'text-purple-400' },
    DEAD_ZONE: { icon: '☠️', color: 'text-green-400' },
  };

  const info = typeInfo[state.currentDanger.type] || { icon: '⚠️', color: 'text-red-400' };

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4" style={{ background: 'rgba(127,29,29,0.4)' }}>
      <div
        className={`bg-slate-900 border-2 rounded-xl max-w-md w-full p-6 text-center ${
          isUrgent ? 'border-red-500 animate-pulse-danger' : 'border-orange-500'
        }`}
      >
        <div className="text-5xl mb-3">{info.icon}</div>
        <h2 className={`text-xl font-bold mb-1 ${info.color}`}>
          {state.currentDanger.name}
        </h2>
        <p className="text-sm text-gray-400 mb-4">
          위험도: {(state.currentDanger.severity * 100).toFixed(0)}%
        </p>

        <div className="mb-4">
          <div className={`text-4xl font-bold font-mono ${isUrgent ? 'text-red-400' : 'text-yellow-400'}`}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
          <div className="w-full bg-gray-800 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isUrgent ? 'bg-red-500' : 'bg-orange-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            5분 내 회피하면 100% 생존 | 방어 버블: {state.shieldTokens}개
          </p>
        </div>

        <button
          onClick={() => engine.evadeDanger()}
          className="w-full py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)]"
        >
          긴급 회피! (100% 생존)
        </button>
      </div>
    </div>
  );
};
