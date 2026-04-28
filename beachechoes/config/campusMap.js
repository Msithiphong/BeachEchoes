// campusMap.js
// Normalized constants for the CSULB campus map.
// All coordinates are in the range [0, 1] relative to the image dimensions.
// Image source: assets/images/CSULB Map.png (1308 x 1456 px)

export const MAP_ASPECT_RATIO = 1308 / 1456

export const CLUSTER_THRESHOLD = 0.02

export const VALID_CAMPUS_POLYGON = [
  { x: 0.08, y: 0.04 },
  { x: 0.92, y: 0.04 },
  { x: 0.92, y: 0.96 },
  { x: 0.08, y: 0.96 },
]

export const CSULB_GEO_BOUNDS = {
  north: 33.7905,
  south: 33.775,
  west: -118.125,
  east: -118.105,
}

export function latLngToMapPoint(latitude, longitude) {
  const lat = Number(latitude)
  const lng = Number(longitude)

  const x =
    (lng - CSULB_GEO_BOUNDS.west) /
    (CSULB_GEO_BOUNDS.east - CSULB_GEO_BOUNDS.west)

  const y =
    (CSULB_GEO_BOUNDS.north - lat) /
    (CSULB_GEO_BOUNDS.north - CSULB_GEO_BOUNDS.south)

  return {
    x: Math.min(1, Math.max(0, x)),
    y: Math.min(1, Math.max(0, y)),
  }
}

export function isLatLngInsideCampus(latitude, longitude) {
  const lat = Number(latitude)
  const lng = Number(longitude)

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat <= CSULB_GEO_BOUNDS.north &&
    lat >= CSULB_GEO_BOUNDS.south &&
    lng >= CSULB_GEO_BOUNDS.west &&
    lng <= CSULB_GEO_BOUNDS.east
  )
}