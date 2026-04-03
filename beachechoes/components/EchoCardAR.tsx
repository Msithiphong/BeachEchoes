import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type EchoCardARProps = {
  text: string;
  authorName?: string;
  /** Screen-space X position (pixels from left) */
  screenX?: number;
  /** Screen-space Y position (pixels from top) */
  screenY?: number;
  /** Whether this card is floor-locked */
  floorLocked?: boolean;
};

/**
 * 2D floating echo card rendered as an overlay.
 * Positioned absolutely based on projected screen coordinates.
 * This is an MVP prototype — full AR-anchored rendering comes later.
 */
export function EchoCardAR({
  text,
  authorName,
  screenX = 0,
  screenY = 0,
  floorLocked,
}: EchoCardARProps) {
  return (
    <View
      style={[
        styles.card,
        {
          left: screenX - 100,
          top: screenY - 30,
        },
      ]}
      pointerEvents="none"
    >
      <Text style={styles.text} numberOfLines={3}>
        {text}
      </Text>
      {authorName ? (
        <Text style={styles.author}>— {authorName}</Text>
      ) : null}
      {floorLocked === false ? (
        <Text style={styles.warning}>⚠ Not floor-locked</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: 200,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  text: {
    fontSize: 14,
    color: '#1a1a1a',
    lineHeight: 20,
  },
  author: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  warning: {
    fontSize: 10,
    color: '#cc6600',
    marginTop: 4,
  },
});
