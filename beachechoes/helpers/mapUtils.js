import { VALID_CAMPUS_POLYGON } from '../config/campusMap';

/**
 * Affine Transformation Coefficients for GPS → Map Conversion
 * 
 * Calibrated using 6 reference points across CSULB campus:
 * 1. GPS: (33.78743, -118.11441) → Map: (0.56486, 0.10687)
 * 2. GPS: (33.78474, -118.11429) → Map: (0.57068, 0.30520)
 * 3. GPS: (33.78618, -118.10931) → Map: (0.89238, 0.20016)
 * 4. GPS: (33.77647, -118.11257) → Map: (0.67946, 0.89156)
 * 5. GPS: (33.78114, -118.11336) → Map: (0.62740, 0.54899)
 * 6. GPS: (33.78319, -118.11102) → Map: (0.78796, 0.41259)
 * 
 * Transform equations:
 *   mapX = AFFINE_TRANSFORM.a * lat + AFFINE_TRANSFORM.b * lng + AFFINE_TRANSFORM.c
 *   mapY = AFFINE_TRANSFORM.d * lat + AFFINE_TRANSFORM.e * lng + AFFINE_TRANSFORM.f
 * 
 * Calculated using least squares regression for optimal fit.
 * Average error: < 0.004 (excellent accuracy across all reference points)
 */
const AFFINE_TRANSFORM = {
  // X coefficients (lat, lng, constant)
  a: 0.3858963830245369,
  b: 64.99632439144675,
  c: 7664.528243238068,
  
  // Y coefficients (lat, lng, constant)  
  d: -71.13118641921123,
  e: 0.5836480604189827,
  f: 2472.38552692286,
};

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
 * Convert latitude/longitude to normalized [0,1] map coordinates.
 * Uses affine transformation calibrated with real campus reference points.
 *
 * @param {number} latitude - GPS latitude
 * @param {number} longitude - GPS longitude
 * @returns {{ x: number, y: number }} normalized coordinates
 */
export function latLngToNormalized(latitude, longitude) {
  // Apply affine transformation
  const x = AFFINE_TRANSFORM.a * latitude + AFFINE_TRANSFORM.b * longitude + AFFINE_TRANSFORM.c;
  const y = AFFINE_TRANSFORM.d * latitude + AFFINE_TRANSFORM.e * longitude + AFFINE_TRANSFORM.f;
  
  const result = {
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y)),
  };
  
  // Debug logging for GPS calibration
  if (process.env.EXPO_PUBLIC_DEBUG_GPS === 'true') {
    console.log('🗺️ GPS → Map Conversion (Affine Transform):');
    console.log(`  📍 GPS Input: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
    console.log(`  🔢 Raw X: ${x.toFixed(5)}, Raw Y: ${y.toFixed(5)}`);
    console.log(`  ✅ Normalized: (${result.x.toFixed(5)}, ${result.y.toFixed(5)})`);
    console.log(`  🎯 In Polygon: ${pointInPolygon(result) ? 'YES' : 'NO'}`);
  }
  
  return result;
}

/**
 * Find the nearest point on the polygon boundary to a given point.
 * Used when the user's location is outside the campus polygon.
 *
 * @param {{ x: number, y: number }} point - The point to snap
 * @param {{ x: number, y: number }[]} polygon - Array of vertices
 * @returns {{ x: number, y: number }} nearest point on the boundary
 */
export function snapToPolygonBoundary(point, polygon = VALID_CAMPUS_POLYGON) {
  let minDist = Infinity;
  let nearest = point;
  
  // Project against every edge so off-campus GPS points land on the nearest valid boundary.
  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];
    
    // Find closest point on this edge
    const closestOnEdge = closestPointOnSegment(point, p1, p2);
    const dist = distance(point, closestOnEdge);
    
    if (dist < minDist) {
      minDist = dist;
      nearest = closestOnEdge;
    }
  }
  
  return nearest;
}

/**
 * Find the closest point on a line segment to a given point.
 *
 * @param {{ x: number, y: number }} point
 * @param {{ x: number, y: number }} segmentStart
 * @param {{ x: number, y: number }} segmentEnd
 * @returns {{ x: number, y: number }}
 */
function closestPointOnSegment(point, segmentStart, segmentEnd) {
  const dx = segmentEnd.x - segmentStart.x;
  const dy = segmentEnd.y - segmentStart.y;
  
  // If segment is a point, return that point
  if (dx === 0 && dy === 0) {
    return segmentStart;
  }
  
  // Calculate parameter t for the projection of point onto the line
  const t = Math.max(0, Math.min(1,
    ((point.x - segmentStart.x) * dx + (point.y - segmentStart.y) * dy) / (dx * dx + dy * dy)
  ));
  
  return {
    x: segmentStart.x + t * dx,
    y: segmentStart.y + t * dy,
  };
}

/**
 * Calculate Euclidean distance between two points.
 *
 * @param {{ x: number, y: number }} p1
 * @param {{ x: number, y: number }} p2
 * @returns {number}
 */
function distance(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
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
