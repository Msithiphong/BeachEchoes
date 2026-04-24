import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';

/**
 * Renders a photo with a wrapped overlay text caption centred at the bottom.
 * Both the image and the text are rendered inside a fixed-ratio container so
 * the overlay stays correctly positioned regardless of screen width.
 */
export default function PostImageWithOverlay({ imageUri, overlayText, style }) {
  return (
    <View style={[styles.container, style]}>
      <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
      {!!overlayText && (
        <View style={styles.overlayBadge} pointerEvents="none">
          <Text style={styles.overlayText}>{overlayText}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  overlayText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    flexWrap: 'wrap',
  },
});
