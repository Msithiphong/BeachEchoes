// campusMap.js
// Normalized constants for the CSULB campus map.
// All coordinates are in the range [0, 1] relative to the image dimensions.
// Image source: assets/images/CSULB Map.png (1308 x 1456 px)

/** Width-to-height ratio of the campus map image. */
export const MAP_ASPECT_RATIO = 1308 / 1456; // ≈ 0.8984

/**
 * Cluster threshold in normalized coordinate units.
 * Posts whose placement points are within this distance of each other
 * are grouped into a single pin cluster on the Map tab.
 */
export const CLUSTER_THRESHOLD = 0.02;

/**
 * Convex polygon defining the valid CSULB campus placement area in
 * normalized [0, 1] coordinates.  Taps outside this polygon are rejected.
 *
 * Vertices trace the campus perimeter clockwise starting from the
 * north-west corner.  Adjust these points to match the actual campus
 * boundary visible in the map image.
 */
export const VALID_CAMPUS_POLYGON = [
  { x: 0.08, y: 0.04 }, // NW corner
  { x: 0.92, y: 0.04 }, // NE corner
  { x: 0.92, y: 0.96 }, // SE corner
  { x: 0.08, y: 0.96 }, // SW corner
];
