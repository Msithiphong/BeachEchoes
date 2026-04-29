import React from 'react'
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native'

import { formatPinCount } from '../helpers/clusterUtils'
import { theme } from '../core/theme'

const PIN_RADIUS = 18

export default function ClusteredPin({
  centroid,
  ids,
  mapWidth,
  mapHeight,
  onPress,
}) {
  // Validate centroid coordinates
  if (!centroid || !mapWidth || !mapHeight) {
    return null
  }

  // Parse coordinates - handle both numbers and numeric strings from database
  const x = typeof centroid.x === 'string' ? parseFloat(centroid.x) : centroid.x
  const y = typeof centroid.y === 'string' ? parseFloat(centroid.y) : centroid.y
  
  // Defensive check: ensure coordinates are valid numbers in [0, 1] range
  if (
    typeof x !== 'number' ||
    typeof y !== 'number' ||
    isNaN(x) ||
    isNaN(y) ||
    x < 0 ||
    x > 1 ||
    y < 0 ||
    y > 1
  ) {
    if (__DEV__) {
      console.warn('ClusteredPin: Invalid centroid coordinates:', { x, y, ids })
    }
    return null
  }

  const left = x * mapWidth - PIN_RADIUS
  const top = y * mapHeight - PIN_RADIUS

  return (
    <TouchableOpacity
      style={[
        styles.pin,
        {
          left,
          top,
        },
      ]}
      onPress={() => onPress(ids)}
      activeOpacity={0.8}
    >
      <View style={styles.inner}>
        <Text style={styles.label}>{formatPinCount(ids.length)}</Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  pin: {
    position: 'absolute',
    width: PIN_RADIUS * 2,
    height: PIN_RADIUS * 2,
    borderRadius: PIN_RADIUS,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 10,
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
})