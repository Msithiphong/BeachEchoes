import { VALID_CAMPUS_POLYGON } from '../config/campusMap';

/**
 * Convert a tap position inside a rendered map view to normalized [0,1]
 * coordinates, clamped to the valid range.
 *
 * @param {number} tapX  - x position of the tap in layout pixels
 * @param {number} tapY  - y position of the tap in layout pixels
 * @param {number} viewWidth  - rendered width of the map view
 * @param {number} viewHeight - rendered height of the map view
 * @returns {{ x: number, y: number }} normalized coordinates
 */
export function tapToNormalized(tapX, tapY, viewWidth, viewHeight) {
  return {
    x: Math.min(1, Math.max(0, tapX / viewWidth)),
    y: Math.min(1, Math.max(0, tapY / viewHeight)),
  };
}

/**
 * Point-in-polygon test using the ray-casting algorithm.
 * Works for any simple (non-self-intersecting) polygon.
 *
 * @param {{ x: number, y: number }} point
 * @param {{ x: number, y: number }[]} polygon - array of vertices
 * @returns {boolean}
 */
export function pointInPolygon(point, polygon = VALID_CAMPUS_POLYGON) {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersects =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}
