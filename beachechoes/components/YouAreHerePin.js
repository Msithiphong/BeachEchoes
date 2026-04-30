import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function YouAreHerePin({ centroid, mapWidth, mapHeight, onPress }) {
  if (!centroid || centroid.x == null || centroid.y == null) {
    return null;
  }

  // Validate coordinates
  if (
    typeof centroid.x !== 'number' ||
    typeof centroid.y !== 'number' ||
    !Number.isFinite(centroid.x) ||
    !Number.isFinite(centroid.y) ||
    centroid.x < 0 ||
    centroid.x > 1 ||
    centroid.y < 0 ||
    centroid.y > 1
  ) {
    console.warn('YouAreHerePin: invalid coordinates', centroid);
    return null;
  }

  const left = centroid.x * (mapWidth || 1);
  const top = centroid.y * (mapHeight || 1);

  return (
    <TouchableOpacity
      style={[styles.container, { left, top }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.labelContainer}>
        <Text style={styles.label}>You Are Here</Text>
      </View>
      <MaterialIcons name="location-on" size={40} color="#2563eb" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateX: -20 }, { translateY: -50 }],
  },
  labelContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
});
