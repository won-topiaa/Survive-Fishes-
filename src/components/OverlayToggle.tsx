import React from 'react';

export interface OverlayState {
  fishing: boolean;
  mpa: boolean;
  currents: boolean;
  danger: boolean;
  route: boolean;
  pixelMap: boolean;
  food: boolean;
}

interface OverlayToggleProps {
  overlays: OverlayState;
  onToggle: (key: keyof OverlayState) => void;
}

const ITEMS: { key: keyof OverlayState; icon: string; label: string; color: string }[] = [
  { key: 'pixelMap', icon: '🌐', label: '지형', color: 'text-slate-300' },
  { key: 'route', icon: '🗺️', label: '항로', color: 'text-cyan-400' },
  { key: 'fishing', icon: '🚢', label: '어업', color: 'text-orange-400' },
  { key: 'mpa', icon: '🏝️', label: 'MPA', color: 'text-green-400' },
  { key: 'food', icon: '🦐', label: '먹이', color: 'text-pink-400' },
  { key: 'currents', icon: '🌊', label: '해류', color: 'text-indigo-400' },
  { key: 'danger', icon: '⚠️', label: '위험', color: 'text-red-400' },
];

// Sits left of the control column (right-3 w-52 → 14rem clears it) so the two
// never overlap however short the viewport is.
export const OverlayToggle: React.FC<OverlayToggleProps> = ({ overlays, onToggle }) => {
  return (
    <div className="absolute bottom-40 right-[14rem] z-[1000] bg-gray-900/95 rounded-lg border border-gray-700/60 backdrop-blur-sm p-2">
      <span className="text-[9px] text-gray-500 uppercase tracking-widest px-1">레이어</span>
      <div className="grid grid-cols-2 gap-x-1 gap-y-0.5 mt-1">
        {ITEMS.map(item => (
          <button
            key={item.key}
            onClick={() => onToggle(item.key)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] transition-all ${
              overlays[item.key]
                ? `${item.color} bg-gray-800`
                : 'text-gray-600 hover:text-gray-400'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
