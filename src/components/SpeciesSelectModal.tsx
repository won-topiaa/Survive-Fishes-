import React, { useState } from 'react';
import { ALL_SPECIES } from '../types/fish';
import type { SpeciesConfig, SpeciesTier } from '../types/fish';

interface SpeciesSelectModalProps {
  onSelect: (species: SpeciesConfig) => void;
  onBack: () => void;
}

const TIER_INFO: Record<SpeciesTier, { label: string; color: string; border: string }> = {
  APEX: { label: '초대형 (Apex)', color: 'text-red-400', border: 'border-red-800' },
  LARGE: { label: '대형 (Large)', color: 'text-orange-400', border: 'border-orange-800' },
  MEDIUM: { label: '중형 (Medium)', color: 'text-blue-400', border: 'border-blue-800' },
  SMALL: { label: '소형 (Small)', color: 'text-green-400', border: 'border-green-800' },
};

const TIERS: SpeciesTier[] = ['APEX', 'LARGE', 'MEDIUM', 'SMALL'];

export const SpeciesSelectModal: React.FC<SpeciesSelectModalProps> = ({ onSelect, onBack }) => {
  const [selected, setSelected] = useState<SpeciesConfig | null>(null);

  return (
    <div className="fixed inset-0 z-[2000] bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-slate-900 border border-cyan-800/40 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-cyan-400 mb-1">어종 선택</h2>
          <p className="text-sm text-gray-400">체급이 클수록 안전하지만 느립니다. 작을수록 빠르지만 위험합니다.</p>
        </div>

        <div className="space-y-4">
          {TIERS.map(tier => {
            const info = TIER_INFO[tier];
            const species = ALL_SPECIES.filter(s => s.tier === tier);
            return (
              <div key={tier}>
                <h3 className={`text-xs font-bold uppercase tracking-widest mb-2 ${info.color}`}>
                  {info.label}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {species.map(sp => (
                    <button
                      key={sp.id}
                      onClick={() => setSelected(sp)}
                      className={`text-left p-3 rounded-lg border transition-all ${
                        selected?.id === sp.id
                          ? 'border-cyan-400 bg-cyan-900/20 ring-1 ring-cyan-400/50'
                          : `${info.border} bg-slate-800/50 hover:bg-slate-800`
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{sp.emoji}</span>
                        <div>
                          <span className="text-sm font-bold text-white">{sp.nameKo}</span>
                          <span className="text-xs text-gray-500 ml-2">{sp.name}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-400 mb-2">{sp.description}</p>
                      <div className="flex gap-3 text-[10px] text-gray-500">
                        <span>속도 {sp.baseSpeedMultiplier}x</span>
                        <span>완주 ~{sp.expectedStandardDays}일</span>
                        <span>포식회피 {sp.predatorEvasion}%</span>
                        <span>어업회피 {sp.fishingEvasion}%</span>
                      </div>
                      {sp.activeSkill && (
                        <div className="mt-1.5 text-[10px] text-purple-400">
                          ✨ {sp.activeSkill.nameKo}: {sp.activeSkill.description}
                        </div>
                      )}
                      {sp.passiveTrait && (
                        <div className="mt-1 text-[10px] text-cyan-400">
                          🧬 {sp.passiveTrait.nameKo}: {sp.passiveTrait.description}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onBack}
            className="px-6 py-2.5 rounded-lg border border-gray-700 text-gray-400 text-sm hover:bg-gray-800 transition-all"
          >
            뒤로
          </button>
          <button
            onClick={() => selected && onSelect(selected)}
            disabled={!selected}
            className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-cyan-800 text-cyan-100 border border-cyan-600 hover:bg-cyan-700"
          >
            {selected ? `${selected.emoji} ${selected.nameKo}(으)로 시작` : '어종을 선택하세요'}
          </button>
        </div>
      </div>
    </div>
  );
};
