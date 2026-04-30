import { VALID_CAMPUS_POLYGON } from '../config/campusMap';

// CSULB Campus approximate bounding box (lat/lng)
// These coordinates define the real-world geographic bounds of the campus
const CAMPUS_BOUNDS = {
  north: 33.7850, // Northernmost point
  south: 33.7730, // Southernmost point
  west: -118.1190, // Westernmost point
  east: -118.1050, // Easternmost point
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
 * The coordinates are mapped to the campus bounding box.
 *
 * @param {number} latitude - GPS latitude
 * @param {number} longitude - GPS longitude
 * @returns {{ x: number, y: number }} normalized coordinates
 */
export function latLngToNormalized(latitude, longitude) {
  // Normalize longitude to [0, 1] (west to east)
  const x = (longitude - CAMPUS_BOUNDS.west) / (CAMPUS_BOUNDS.east - CAMPUS_BOUNDS.west);
  
  // Normalize latitude to [0, 1] (north to south)
  // Note: latitude decreases as we go south, so we invert it
  const y = (CAMPUS_BOUNDS.north - latitude) / (CAMPUS_BOUNDS.north - CAMPUS_BOUNDS.south);
  
  return {
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y)),
  };
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
  
  // Check distance to each edge of the polygon
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
