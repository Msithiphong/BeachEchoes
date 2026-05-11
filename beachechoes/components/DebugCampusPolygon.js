import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { VALID_CAMPUS_POLYGON } from '../config/campusMap';

/**
 * DEBUG COMPONENT - Renders the valid campus polygon as a semi-transparent overlay.
 * This component is for debugging purposes only and should be removed when no longer needed.
 * 
 * Controlled by EXPO_PUBLIC_DEBUG_SHOW_CAMPUS_POLYGON environment variable.
 * Uses the same shared polygon constants as runtime placement validation.
 * 
 * @param {number} mapWidth - Current width of the map in pixels
 * @param {number} mapHeight - Current height of the map in pixels
 */
export default function DebugCampusPolygon({ mapWidth, mapHeight }) {
  if (!mapWidth || !mapHeight) return null;

  // Convert normalized coordinates to pixel positions
  const points = VALID_CAMPUS_POLYGON.map(({ x, y }) => 
    `${x * mapWidth},${y * mapHeight}`
  ).join(' ');

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={mapWidth} height={mapHeight} style={StyleSheet.absoluteFill}>
        <Polygon
          points={points}
          fill="rgba(255, 0, 0, 0.15)"
          stroke="red"
          strokeWidth="2"
        />
      </Svg>
    </View>
  );
}
