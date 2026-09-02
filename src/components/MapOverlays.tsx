import React from 'react';
import { Circle, Polyline, Tooltip } from 'react-leaflet';
import type { FishingZone, MarineProtectedArea, OceanCurrent, DangerZone, FeedingGround } from '../data/types';

interface MapOverlaysProps {
  fishingZones: FishingZone[];
  mpas: MarineProtectedArea[];
  currents: OceanCurrent[];
  dangerZones: DangerZone[];
  feedingGrounds: FeedingGround[];
  showFishing: boolean;
  showMPA: boolean;
  showCurrents: boolean;
  showDanger: boolean;
  showFood: boolean;
}

export const MapOverlays: React.FC<MapOverlaysProps> = React.memo(({
  fishingZones, mpas, currents, dangerZones, feedingGrounds,
  showFishing, showMPA, showCurrents, showDanger, showFood,
}) => {
  return (
    <>
      {showFood && feedingGrounds.map(ground => (
        <Circle
          key={ground.id}
          center={ground.center}
          radius={ground.radiusKm * 1000}
          pathOptions={{
            color: '#f472b6',
            fillColor: '#f472b6',
            fillOpacity: 0.04 + ground.richness * 0.08,
            weight: 1,
            dashArray: '2 4',
          }}
        >
          <Tooltip direction="top" opacity={0.9}>
            <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>
              🦐 {ground.nameKo}<br />
              먹이: {ground.prey}<br />
              풍부도: {(ground.richness * 100).toFixed(0)}%
            </span>
          </Tooltip>
        </Circle>
      ))}

      {showFishing && fishingZones.map(zone => (
        <Circle
          key={zone.id}
          center={zone.center}
          radius={zone.radiusKm * 1000}
          pathOptions={{
            color: '#f97316',
            fillColor: '#f97316',
            fillOpacity: 0.06 + zone.intensity * 0.1,
            weight: 1,
            dashArray: '4 4',
          }}
        >
          <Tooltip direction="top" opacity={0.9}>
            <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>
              🚢 {zone.nameKo}<br />
              어업 강도: {(zone.intensity * 100).toFixed(0)}%<br />
              주요 어구: {zone.gearTypes.join(', ')}
            </span>
          </Tooltip>
        </Circle>
      ))}

      {showMPA && mpas.map(mpa => (
        <Circle
          key={mpa.id}
          center={mpa.center}
          radius={mpa.radiusKm * 1000}
          pathOptions={{
            color: '#22c55e',
            fillColor: '#22c55e',
            fillOpacity: mpa.protection === 'FULL' ? 0.12 : 0.06,
            weight: 1.5,
          }}
        >
          <Tooltip direction="top" opacity={0.9}>
            <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>
              🏝️ {mpa.nameKo}<br />
              보호 등급: {mpa.protection === 'FULL' ? '완전 보호' : '부분 보호'}<br />
              어업 위험: {mpa.protection === 'FULL' ? '0%' : '50% 감소'}
            </span>
          </Tooltip>
        </Circle>
      ))}

      {showCurrents && currents.map(current => (
        <Polyline
          key={current.id}
          positions={current.path}
          pathOptions={{
            color: '#818cf8',
            weight: 2,
            opacity: 0.5,
            dashArray: '8 4',
          }}
        >
          <Tooltip direction="top" opacity={0.9} sticky>
            <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>
              🌊 {current.nameKo}<br />
              평균 속도: {current.avgSpeedKmH} km/h<br />
              가속 배율: {current.boostMultiplier}x
            </span>
          </Tooltip>
        </Polyline>
      ))}

      {showDanger && dangerZones.map(zone => (
        <Circle
          key={zone.id}
          center={zone.center}
          radius={zone.radiusKm * 1000}
          pathOptions={{
            color: '#ef4444',
            fillColor: '#ef4444',
            fillOpacity: 0.05 + zone.baseDanger * 0.08,
            weight: 1,
            dashArray: '6 3',
          }}
        >
          <Tooltip direction="top" opacity={0.9}>
            <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>
              ⚠️ {zone.nameKo}<br />
              유형: {zone.type === 'STORM_CORRIDOR' ? '폭풍 해역' : zone.type === 'DEAD_ZONE' ? '저산소 데드존' : '고위험 해역'}<br />
              기본 위험도: {(zone.baseDanger * 100).toFixed(0)}%
            </span>
          </Tooltip>
        </Circle>
      ))}
    </>
  );
});
