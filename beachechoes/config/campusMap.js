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
  { x: 0.12286, y: 0.02909 },
  { x: 0.99552, y: 0.03155 },
  { x: 0.99316, y: 0.53525 },
  { x: 0.91306, y: 0.53844 },
  { x: 0.91187, y: 0.61359 },
  { x: 0.76101, y: 0.61146 },
  { x: 0.76272, y: 0.99217 },
  { x: 0.49204, y: 0.98968 },
  { x: 0.49218, y: 0.54758 },
  { x: 0.02407, y: 0.54199 },
  { x: 0.03038, y: 0.16058 },
  { x: 0.11640, y: 0.18539 },
];
