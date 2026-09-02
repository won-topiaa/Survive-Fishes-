import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { engine } from './engine/GameEngine';
import { HUD } from './components/HUD';
import { ControlPanel } from './components/ControlPanel';
import { EventLog } from './components/EventLog';
import { SpeciesSelectModal } from './components/SpeciesSelectModal';
import { ClearRewardModal } from './components/ClearRewardModal';
import { DangerAlertModal } from './components/DangerAlertModal';
import { GameOverModal } from './components/GameOverModal';
import { MapOverlays } from './components/MapOverlays';
import { OverlayToggle } from './components/OverlayToggle';
import type { OverlayState } from './components/OverlayToggle';
import type { GameState } from './types/game';
import type { SpeciesConfig } from './types/fish';
import { OCEAN_CURRENTS, FISHING_ZONES, MARINE_PROTECTED_AREAS, DANGER_ZONES, ROUTE_TOTAL_DISTANCE_KM, getRouteSegments } from './data';
import { splitAtAntimeridian } from './utils/geo';
import { formatKm } from './utils/format';

const ROUTE_SEGMENTS = getRouteSegments();
const FOLLOW_PAUSE_MS = 20_000;

const fishIcon = (emoji: string) =>
  L.divIcon({
    html: `<div style="font-size:28px;text-shadow:0 0 8px rgba(34,211,238,0.6)">${emoji}</div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

const skullIcon = L.divIcon({
  html: '<div style="font-size:20px;filter:drop-shadow(0 0 4px rgba(239,68,68,0.6))">💀</div>',
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const pinIcon = L.divIcon({
  html: '<div style="font-size:24px">📍</div>',
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

function SpawnClickHandler({ onSpawn }: { onSpawn: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSpawn(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Keeps the fish in view without fighting the user: a drag or zoom pauses the
// auto-follow for a while, and otherwise the map only re-centres once the fish
// drifts out of the central part of the viewport.
function MapUpdater({ coord }: { coord: [number, number] }) {
  const pausedUntil = useRef(0);
  const map = useMapEvents({
    dragstart() { pausedUntil.current = Date.now() + FOLLOW_PAUSE_MS; },
    zoomstart() { pausedUntil.current = Date.now() + FOLLOW_PAUSE_MS; },
  });
  useEffect(() => {
    if (coord[0] === 0 && coord[1] === 0) return;
    if (Date.now() < pausedUntil.current) return;
    if (map.getBounds().pad(-0.3).contains(coord)) return;
    map.panTo(coord, { animate: true, duration: 0.5 });
  }, [coord, map]);
  return null;
}

const App: React.FC = () => {
  const [state, setState] = useState<GameState>(engine.state);
  const [pendingCoord, setPendingCoord] = useState<[number, number] | null>(null);
  const [waitingForPin, setWaitingForPin] = useState(false);
  const [overlays, setOverlays] = useState<OverlayState>({
    fishing: false,
    mpa: false,
    currents: false,
    danger: true,
    route: true,
  });

  const handleOverlayToggle = useCallback((key: keyof OverlayState) => {
    setOverlays(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // The engine hands out a new pathHistory array only when it appends, so this
  // recomputes on appends rather than on every tick.
  const trailSegments = useMemo(() => splitAtAntimeridian(state.pathHistory), [state.pathHistory]);

  useEffect(() => {
    const unsub = engine.subscribe(() => {
      setState({ ...engine.state });
    });
    return unsub;
  }, []);

  const handleStartClick = useCallback(() => {
    engine.openSpeciesSelect();
  }, []);

  const handleSpeciesSelected = useCallback((species: SpeciesConfig) => {
    setWaitingForPin(true);
    engine.state.species = species;
    engine.state.phase = 'MENU';
    engine.notify();
  }, []);

  const handleMapSpawn = useCallback((lat: number, lng: number) => {
    if (!waitingForPin) return;
    setPendingCoord([lat, lng]);
  }, [waitingForPin]);

  const confirmSpawn = useCallback(() => {
    if (!pendingCoord || !engine.state.species) return;
    engine.selectSpeciesAndSpawn(engine.state.species, pendingCoord[0], pendingCoord[1]);
    setWaitingForPin(false);
    setPendingCoord(null);
  }, [pendingCoord]);

  const cancelPin = useCallback(() => {
    setPendingCoord(null);
  }, []);

  const handleBack = useCallback(() => {
    engine.state.phase = 'MENU';
    setWaitingForPin(false);
    setPendingCoord(null);
    setState({ ...engine.state });
  }, []);

  return (
    <div className="w-full h-screen relative bg-black font-mono">
      <HUD state={state} />
      <ControlPanel state={state} />

      {state.phase === 'SPECIES_SELECT' && (
        <SpeciesSelectModal
          onSelect={handleSpeciesSelected}
          onBack={handleBack}
        />
      )}
      {state.phase === 'DANGER_ALERT' && <DangerAlertModal state={state} />}
      {state.phase === 'GAME_OVER' && <GameOverModal state={state} />}
      {state.phase === 'CLEARED' && <ClearRewardModal state={state} />}

      {state.phase === 'MENU' && !waitingForPin && (
        <div className="absolute inset-0 z-[1500] flex items-center justify-center pointer-events-none">
          <div className="bg-black/85 p-8 rounded-xl text-center border border-cyan-700/50 pointer-events-auto max-w-md backdrop-blur-sm">
            <div className="text-5xl mb-4 animate-float">🦈</div>
            <h1 className="text-3xl text-cyan-400 font-bold mb-2 tracking-wider">OCEAN WANDERER</h1>
            <p className="text-gray-500 text-xs mb-1">v3.0 — 실데이터 기반 글로벌 해양 일주 시뮬레이터</p>
            <p className="text-gray-400 text-sm mb-6 mt-3">
              전 세계 바다 {ROUTE_TOTAL_DISTANCE_KM.toLocaleString()}km를 일주하세요.<br/>
              어종을 선택하고, 출발지를 찍어 항해를 시작합니다.
            </p>
            <button
              onClick={handleStartClick}
              className="px-8 py-3 bg-cyan-700 hover:bg-cyan-600 text-white font-bold rounded-lg transition-all shadow-[0_0_20px_rgba(34,211,238,0.2)] text-sm"
            >
              항해 시작
            </button>
          </div>
        </div>
      )}

      {waitingForPin && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[200%] z-[1500] pointer-events-none">
          <div className="bg-black/90 px-6 py-3 rounded-lg border border-cyan-600 text-center pointer-events-auto backdrop-blur-sm">
            <p className="text-cyan-400 text-sm font-bold mb-1">
              {engine.state.species?.emoji} {engine.state.species?.nameKo} 선택됨
            </p>
            <p className="text-gray-300 text-xs">바다 위를 클릭하여 출발 좌표를 지정하세요</p>
          </div>
        </div>
      )}

      {pendingCoord && (
        <div className="absolute bottom-40 left-1/2 -translate-x-1/2 z-[1500]">
          <div className="bg-black/90 px-5 py-3 rounded-lg border border-cyan-600 flex items-center gap-4 backdrop-blur-sm">
            <span className="text-cyan-300 text-xs">
              📍 [{pendingCoord[0].toFixed(2)}°, {pendingCoord[1].toFixed(2)}°]
            </span>
            <button
              onClick={confirmSpawn}
              className="px-4 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white text-xs font-bold rounded transition-all"
            >
              여기서 출발!
            </button>
            <button
              onClick={cancelPin}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 text-xs rounded transition-all"
            >
              취소
            </button>
          </div>
        </div>
      )}

      <div className="absolute inset-0 z-0">
        <MapContainer
          center={[20, 0]}
          zoom={3}
          style={{ height: '100%', width: '100%', background: '#0a0e1a' }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
          />

          {(waitingForPin || state.phase === 'MENU') && (
            <SpawnClickHandler onSpawn={handleMapSpawn} />
          )}

          {state.phase !== 'MENU' && state.phase !== 'SPECIES_SELECT' && (
            <MapUpdater coord={state.currentCoord} />
          )}

          {pendingCoord && (
            <Marker position={pendingCoord} icon={pinIcon}>
              <Popup>출발 좌표</Popup>
            </Marker>
          )}

          {state.startCoord[0] !== 0 && state.phase !== 'MENU' && (
            <CircleMarker center={state.startCoord} radius={6} pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.6 }}>
              <Popup>출발지</Popup>
            </CircleMarker>
          )}

          {state.phase !== 'MENU' && state.phase !== 'SPECIES_SELECT' && (
            <Marker position={state.currentCoord} icon={fishIcon(state.species?.emoji || '🐟')}>
              <Popup>
                {state.species?.emoji} {state.species?.nameKo}<br />
                진행률: {state.progressPct.toFixed(1)}%
              </Popup>
            </Marker>
          )}

          {trailSegments.map((segment, i) => segment.length > 1 && (
            <Polyline
              key={`trail-${i}`}
              positions={segment}
              pathOptions={{ color: '#22d3ee', weight: 2, opacity: 0.5, dashArray: '4 6' }}
            />
          ))}

          {state.gravesites.map(g => (
            <Marker key={g.id} position={g.coord} icon={skullIcon}>
              <Popup>
                <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#333' }}>
                  <strong>💀 {g.nickname}</strong><br />
                  어종: {g.species}<br />
                  사인: {g.causeOfDeath}<br />
                  항해: {formatKm(g.distanceTraveled)}km<br />
                  <span style={{ color: '#999' }}>{g.diedAt}</span>
                </div>
              </Popup>
            </Marker>
          ))}

          {state.currentDanger && (
            <CircleMarker
              center={state.currentDanger.coord}
              radius={30}
              pathOptions={{
                color: '#ef4444',
                fillColor: '#ef4444',
                fillOpacity: 0.15,
                weight: 2,
                dashArray: '5 5',
              }}
            />
          )}

          {overlays.route && ROUTE_SEGMENTS.map((segment, i) => (
            <Polyline
              key={`route-segment-${i}`}
              positions={segment}
              pathOptions={{ color: '#06b6d4', weight: 1.5, opacity: 0.3, dashArray: '6 8' }}
            />
          ))}

          <MapOverlays
            fishingZones={FISHING_ZONES}
            mpas={MARINE_PROTECTED_AREAS}
            currents={OCEAN_CURRENTS}
            dangerZones={DANGER_ZONES}
            showFishing={overlays.fishing}
            showMPA={overlays.mpa}
            showCurrents={overlays.currents}
            showDanger={overlays.danger}
          />
        </MapContainer>
      </div>

      <OverlayToggle overlays={overlays} onToggle={handleOverlayToggle} />
      <EventLog logs={state.logs} />
    </div>
  );
};

export default App;
