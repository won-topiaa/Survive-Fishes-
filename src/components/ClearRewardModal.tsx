import React, { useState } from 'react';
import type { PrizeFishType, FishPreparationType } from '../types/reward';
import { PRIZE_FISH_OPTIONS } from '../types/reward';
import type { GameState } from '../types/game';
import { engine } from '../engine/GameEngine';
import { formatDuration, formatKm } from '../utils/format';

interface ClearRewardModalProps {
  state: GameState;
}

const CONFETTI_COLORS = ['#eab308', '#22d3ee', '#ef4444', '#a855f7', '#22c55e', '#f97316'];
const CONFETTI_GLYPHS = ['🎉', '🎊', '✨', '🏆', '🐟', '👑'];

// Deterministic per-piece jitter (a cheap hash of the index) so the layout is
// varied but stable: nothing re-randomises when the modal re-renders.
const jitter = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const CONFETTI = Array.from({ length: 30 }, (_, i) => ({
  left: `${jitter(i, 1) * 100}%`,
  animation: `confetti-fall ${3 + jitter(i, 2) * 4}s linear ${jitter(i, 3) * 2}s infinite`,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  glyph: CONFETTI_GLYPHS[i % CONFETTI_GLYPHS.length],
}));

export const ClearRewardModal: React.FC<ClearRewardModalProps> = ({ state }) => {
  const [selected, setSelected] = useState<PrizeFishType | null>(null);
  const [prep, setPrep] = useState<FishPreparationType>('WHOLE_RAW');
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="fixed inset-0 z-[2000] bg-black/90 flex items-center justify-center p-4 overflow-y-auto">
      {CONFETTI.map((piece, i) => (
        <div
          key={i}
          className="fixed text-2xl pointer-events-none"
          style={{ left: piece.left, top: '-5%', animation: piece.animation, color: piece.color }}
        >
          {piece.glyph}
        </div>
      ))}

      <div className="bg-slate-900 border-2 border-yellow-500/60 rounded-xl max-w-4xl w-full p-6 md:p-8 shadow-[0_0_50px_rgba(234,179,8,0.2)] relative">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🏆</div>
          <h2 className="text-3xl md:text-4xl font-bold text-yellow-400 mb-2">
            WORLD TOUR CLEARED!
          </h2>
          <p className="text-gray-300 text-sm">
            {state.species?.emoji} {state.species?.nameKo}(으)로 세계 일주 완주!
          </p>
          <div className="flex justify-center gap-6 mt-3 text-xs text-gray-400">
            <span>항해 시간: {formatDuration(state.elapsedSeconds)}</span>
            <span>이동 거리: {formatKm(state.distanceKm)}km</span>
          </div>
        </div>

        <p className="text-center text-sm text-gray-400 mb-6">
          실물 생선 보상 4종 중 1종을 선택하세요
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {PRIZE_FISH_OPTIONS.map(fish => (
            <button
              key={fish.id}
              onClick={() => setSelected(fish.id)}
              className={`p-3 rounded-lg transition-all border-2 text-left ${
                selected === fish.id
                  ? 'border-yellow-400 bg-yellow-900/20 scale-[1.02]'
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-500'
              }`}
            >
              <div className="h-20 bg-slate-800 rounded-lg mb-3 flex items-center justify-center text-4xl">
                {fish.emoji}
              </div>
              <h3 className="font-bold text-white text-xs leading-tight">{fish.name}</h3>
              <p className="text-[10px] text-yellow-500 mt-0.5">{fish.subtitle}</p>
              <p className="text-[10px] text-gray-500 mt-1">{fish.spec}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{fish.cooking}</p>
            </button>
          ))}
        </div>

        {selected && (
          <div className="bg-slate-800 p-4 rounded-lg mb-4 border border-slate-600">
            <h4 className="text-white font-bold text-sm mb-3">손질 옵션</h4>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="radio"
                  name="prep"
                  checked={prep === 'WHOLE_RAW'}
                  onChange={() => setPrep('WHOLE_RAW')}
                  className="accent-yellow-500"
                />
                인증샷용 통원물
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="radio"
                  name="prep"
                  checked={prep === 'FILLETED_PORTION'}
                  onChange={() => setPrep('FILLETED_PORTION')}
                  className="accent-yellow-500"
                />
                실속 손질형 필렛
              </label>
            </div>
          </div>
        )}

        {!showConfirm ? (
          <button
            disabled={!selected}
            onClick={() => setShowConfirm(true)}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-bold py-3 rounded-lg text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            명예의 전당 등록 & 보상 선택 확정
          </button>
        ) : (
          <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-4 text-center">
            <p className="text-yellow-300 text-sm mb-3">
              👑 제1대 항해왕으로 등록됩니다!
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 rounded-lg border border-gray-600 text-gray-400 text-sm hover:bg-gray-800"
              >
                돌아가기
              </button>
              <button
                onClick={() => engine.restart()}
                className="flex-1 py-2 rounded-lg bg-yellow-500 text-slate-900 font-bold text-sm hover:bg-yellow-400"
              >
                🏆 확정 & 새 항해
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
