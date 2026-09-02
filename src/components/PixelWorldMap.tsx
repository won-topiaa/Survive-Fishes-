import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { WORLD_GRID, GRID_RESOLUTION } from '../data/worldGrid';

const ROWS = WORLD_GRID.length;
const COLS = WORLD_GRID[0].length;

class PixelGridLayer extends L.GridLayer {
  createTile(coords: L.Coords) {
    const tile = document.createElement('canvas');
    const size = this.getTileSize();
    tile.width = size.x;
    tile.height = size.y;
    const ctx = tile.getContext('2d');
    if (!ctx) return tile;

    const map = this._map;
    const tileNW = coords.scaleBy(size);

    const cellDeg = GRID_RESOLUTION;
    const zoomScale = Math.pow(2, coords.z - 2);
    const dotSize = Math.max(2, Math.min(6, 1.2 * zoomScale));
    const gap = Math.max(1, dotSize * 0.6);
    const step = dotSize + gap;

    for (let py = 0; py < size.y; py += Math.max(2, Math.floor(step))) {
      for (let px = 0; px < size.x; px += Math.max(2, Math.floor(step))) {
        const point = L.point(tileNW.x + px, tileNW.y + py);
        const latlng = map.unproject(point, coords.z);
        const lat = latlng.lat;
        const lng = latlng.lng;

        const row = Math.floor((90 - lat) / cellDeg);
        const normLng = ((lng % 360) + 540) % 360 - 180;
        const col = Math.floor((normLng + 180) / cellDeg);

        if (row < 0 || row >= ROWS || col < 0 || col >= COLS) continue;

        if (WORLD_GRID[row][col] === 'L') {
          ctx.fillStyle = 'rgba(80, 120, 160, 0.5)';
          ctx.fillRect(
            Math.floor(px - dotSize * 0.5),
            Math.floor(py - dotSize * 0.5),
            dotSize,
            dotSize,
          );
        } else {
          ctx.fillStyle = 'rgba(34, 211, 238, 0.03)';
          ctx.fillRect(
            Math.floor(px - dotSize * 0.3),
            Math.floor(py - dotSize * 0.3),
            dotSize * 0.6,
            dotSize * 0.6,
          );
        }
      }
    }

    return tile;
  }
}

interface PixelWorldMapProps {
  visible: boolean;
}

export const PixelWorldMap: React.FC<PixelWorldMapProps> = ({ visible }) => {
  const map = useMap();

  useEffect(() => {
    if (!visible) return;

    const layer = new PixelGridLayer({
      tileSize: 256,
      opacity: 1,
      updateWhenZooming: false,
      updateWhenIdle: true,
      keepBuffer: 4,
    });

    layer.addTo(map);
    return () => { map.removeLayer(layer); };
  }, [map, visible]);

  return null;
};
