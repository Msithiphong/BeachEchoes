// app/ar/components/ScanPrompt.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ScanPromptProps {
  status: 'searching' | 'detected' | 'degraded';
}

export default function ScanPrompt({ status }: ScanPromptProps) {
  if (status === 'degraded') return null;

  const isSearching = status === 'searching';

  return (
    <View style={styles.container}>
      <View style={[styles.badge, isSearching ? styles.searching : styles.detected]}>
        <Text style={styles.text}>
          {isSearching ? 'Point camera at the floor...' : 'Floor Detected! Ready to place.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 40,
    width: '100%',
    alignItems: 'center',
    zIndex: 10,
  },
  badge: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  searching: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  detected: {
    backgroundColor: 'rgba(76, 175, 80, 0.9)', // Green
  },
  text: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  }
});