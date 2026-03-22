import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

type ScanPromptProps = {
  /** Whether the user previously had a resolved anchor that was lost */
  isRescan: boolean;
  /** Called when the user taps the recalibrate button (rescan mode only) */
  onRecalibrate?: () => void;
  /** Called when the user wants to dismiss AR and fall back to list/map */
  onFallback?: () => void;
};

/**
 * Full-screen overlay prompting the user to scan an AprilTag.
 * Shows different copy depending on whether this is a first scan or a rescan.
 */
export function ScanPrompt({
  isRescan,
  onRecalibrate,
  onFallback,
}: ScanPromptProps) {
  return (
    <View style={styles.overlay}>
      <View style={styles.reticle}>
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />
      </View>

      <Text style={styles.title}>
        {isRescan ? 'Tag Lost' : 'Scan AprilTag'}
      </Text>
      <Text style={styles.subtitle}>
        {isRescan
          ? 'Point your camera at the tag to recalibrate'
          : 'Point your camera at the AprilTag to anchor this zone'}
      </Text>

      {isRescan && onRecalibrate && (
        <TouchableOpacity style={styles.recalibrateButton} onPress={onRecalibrate}>
          <Text style={styles.recalibrateText}>Reset & Rescan</Text>
        </TouchableOpacity>
      )}

      {onFallback && (
        <TouchableOpacity style={styles.fallbackButton} onPress={onFallback}>
          <Text style={styles.fallbackText}>Use List View Instead</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const RETICLE_SIZE = 180;
const CORNER_LEN = 30;
const CORNER_THICK = 4;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    zIndex: 20,
  },
  reticle: {
    width: RETICLE_SIZE,
    height: RETICLE_SIZE,
    marginBottom: 24,
  },
  corner: {
    position: 'absolute',
    width: CORNER_LEN,
    height: CORNER_LEN,
    borderColor: '#ffffff',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_THICK,
    borderLeftWidth: CORNER_THICK,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_THICK,
    borderRightWidth: CORNER_THICK,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_THICK,
    borderLeftWidth: CORNER_THICK,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_THICK,
    borderRightWidth: CORNER_THICK,
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#ffffffcc',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  recalibrateButton: {
    marginTop: 24,
    backgroundColor: '#1976d2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  recalibrateText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  fallbackButton: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  fallbackText: {
    color: '#ffffffaa',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
