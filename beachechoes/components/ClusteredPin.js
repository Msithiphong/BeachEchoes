import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { formatPinCount } from '../helpers/clusterUtils';
import { theme } from '../core/theme';

/**
 * A circular pin rendered on the campus map for a cluster of posts.
 * Shows the post count (capped at "9+") and calls onPress when tapped.
 *
 * @param {{ x: number, y: number }} centroid - normalized [0,1] position
 * @param {number[]} ids - array of post IDs in this cluster
 * @param {number} mapWidth - rendered pixel width of the map container
 * @param {number} mapHeight - rendered pixel height of the map container
 * @param {function} onPress - called with the ids array when tapped
 */
export default function ClusteredPin({ centroid, ids, mapWidth, mapHeight, onPress }) {
  const left = centroid.x * mapWidth - PIN_RADIUS;
  const top = centroid.y * mapHeight - PIN_RADIUS;

  return (
    <TouchableOpacity
      style={[styles.pin, { left, top }]}
      onPress={() => onPress(ids)}
      activeOpacity={0.8}
    >
      <View style={styles.inner}>
        <Text style={styles.label}>{formatPinCount(ids.length)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const PIN_RADIUS = 18;

const styles = StyleSheet.create({
  pin: {
    position: 'absolute',
    width: PIN_RADIUS * 2,
    height: PIN_RADIUS * 2,
    borderRadius: PIN_RADIUS,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    // Drop shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  inner: { alignItems: 'center', justifyContent: 'center' },
  label: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
