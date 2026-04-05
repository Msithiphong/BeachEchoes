// app/ar/components/TrackingBanner.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function TrackingBanner() {
  return (
    <View style={styles.banner}>
      <Text style={styles.title}>Tracking Lost</Text>
      <Text style={styles.subtitle}>Please move your phone slowly to find the anchor.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 40,
    width: '90%',
    backgroundColor: '#ff5252', // Red error color
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    zIndex: 10,
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  subtitle: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  }
});