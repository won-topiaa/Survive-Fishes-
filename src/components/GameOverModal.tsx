import React from 'react';
import type { GameState } from '../types/game';
import { engine } from '../engine/GameEngine';
import { formatDuration, formatKm } from '../utils/format';

interface GameOverModalProps {
  state: GameState;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ state }) => {
  if (state.phase !== 'GAME_OVER') return null;

  return (
    <div className="fixed inset-0 z-[2000] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-slate-900 border-2 border-red-800 rounded-xl max-w-md w-full p-6 text-center">
        <div className="text-5xl mb-3">💀</div>
        <h2 className="text-2xl font-bold text-red-400 mb-1">GAME OVER</h2>
        <p className="text-sm text-gray-400 mb-4">{state.deathCause}</p>

        <div className="bg-slate-800 rounded-lg p-4 mb-4 text-left space-y-2 text-sm">
          <div className="flex justify-between text-gray-300">
            <span>어종</span>
            <span>{state.species?.emoji} {state.species?.nameKo}</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>항해 시간</span>
            <span>{formatDuration(state.elapsedSeconds)}</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>이동 거리</span>
            <span>{formatKm(state.distanceKm)} km</span>
          </div>
          <div className="flex justify-between text-gray-300">
            <span>진행률</span>
            <span>{state.progressPct.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between border-t border-slate-700 pt-2">
            <span className="text-cyan-400 font-bold">획득 DNA</span>
            <span className="text-cyan-300 font-bold">🧬 {state.dnaPoints} pt</span>
          </div>
        </div>

        <p className="text-xs text-gray-500 mb-4">
          이 좌표에 당신의 묘비가 세워집니다. 다른 항해자에게 경고가 될 것입니다.
        </p>

        <button
          onClick={() => engine.restart()}
          className="w-full py-3 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white font-bold text-sm transition-all"
        >
          다시 도전하기
        </button>
      </div>
    </div>
  );
};
