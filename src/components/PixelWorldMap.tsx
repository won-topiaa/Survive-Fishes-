import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { isLand } from '../data/worldGrid';

const LAND_FILL = 'rgba(80, 120, 160, 0.5)';
const OCEAN_FILL = 'rgba(34, 211, 238, 0.03)';

// Dot size and pitch for a zoom level, in whole pixels so the squares stay crisp.
function latticeFor(zoom: number) {
  const dot = zoom <= 3 ? 2 : zoom === 4 ? 4 : 6;
  const step = dot + Math.max(1, Math.round(dot * 0.6));
  return { dot, step };
}

class PixelGridLayer extends L.GridLayer {
  createTile(coords: L.Coords) {
    const tile = document.createElement('canvas');
    const size = this.getTileSize();
    tile.width = size.x;
    tile.height = size.y;
    const ctx = tile.getContext('2d');
    if (!ctx) return tile;

    const map = this._map;
    const origin = coords.scaleBy(size); // tile's top-left corner in world pixels
    const { dot, step } = latticeFor(coords.z);
    const oceanDot = Math.max(1, Math.floor(dot / 2));

    // Anchor the lattice to world pixel coordinates rather than the tile's own
    // origin, so the dot pitch stays continuous across tile seams.
    const firstX = (step - (origin.x % step)) % step;
    const firstY = (step - (origin.y % step)) % step;

    // Web Mercator is separable: longitude depends only on x and latitude only
    // on y, so one unproject per column and per row covers the whole tile.
    const lngs: number[] = [];
    for (let px = firstX; px < size.x; px += step) {
      lngs.push(map.unproject(L.point(origin.x + px, origin.y), coords.z).lng);
    }

    for (let py = firstY; py < size.y; py += step) {
      const lat = map.unproject(L.point(origin.x, origin.y + py), coords.z).lat;
      for (let i = 0, px = firstX; px < size.x; px += step, i++) {
        if (isLand(lat, lngs[i])) {
          ctx.fillStyle = LAND_FILL;
          ctx.fillRect(px, py, dot, dot);
        } else {
          ctx.fillStyle = OCEAN_FILL;
          ctx.fillRect(px, py, oceanDot, oceanDot);
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
