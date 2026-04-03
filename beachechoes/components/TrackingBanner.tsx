import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { TrackingState, PlaneState } from '../../../modules/beachechoes-ar';

type TrackingBannerProps = {
  trackingState: TrackingState | null;
  trackingReason: string | null;
  planeState: PlaneState | null;
  /** Whether a tag anchor has been resolved */
  isAnchorResolved?: boolean;
  /** Whether the anchor is considered stale due to degraded tracking */
  isAnchorStale?: boolean;
};

export function TrackingBanner({
  trackingState,
  trackingReason,
  planeState,
  isAnchorResolved = false,
  isAnchorStale = false,
}: TrackingBannerProps) {
  const message = getBannerMessage(trackingState, planeState, isAnchorResolved, isAnchorStale);
  const backgroundColor = getBannerColor(trackingState, planeState, isAnchorResolved, isAnchorStale);

  if (!message) return null;

  return (
    <View style={[styles.banner, { backgroundColor }]}>
      <Text style={styles.text}>{message}</Text>
      {trackingReason && trackingState === 'limited' && (
        <Text style={styles.subtext}>{trackingReason}</Text>
      )}
    </View>
  );
}

function getBannerMessage(
  trackingState: TrackingState | null,
  planeState: PlaneState | null,
  isAnchorResolved: boolean,
  isAnchorStale: boolean,
): string | null {
  if (!trackingState) return null;

  if (trackingState === 'notAvailable') return 'AR not available';
  if (trackingState === 'interrupted') return 'AR interrupted — move back to resume';

  if (trackingState === 'resuming') return 'Resuming AR...';

  if (trackingState === 'limited') {
    if (isAnchorStale) return 'Tracking degraded — echo positions may drift';
    return 'Adjusting...';
  }

  // Tracking is normal
  if (isAnchorStale) return 'Tracking recovered — rescan tag to recalibrate';

  if (planeState === 'searching') return 'Searching for floor...';

  if (isAnchorResolved && planeState === 'detected') return null; // All good — hide banner

  if (planeState === 'detected') return 'Floor detected — scan AprilTag';

  return 'Initializing...';
}

function getBannerColor(
  trackingState: TrackingState | null,
  planeState: PlaneState | null,
  isAnchorResolved: boolean,
  isAnchorStale: boolean,
): string {
  if (!trackingState || trackingState === 'notAvailable') return '#d32f2f';
  if (trackingState === 'interrupted') return '#d32f2f';
  if (trackingState === 'resuming') return '#f57c00';
  if (isAnchorStale) return '#f57c00';
  if (trackingState === 'limited') return '#ffa000';
  if (isAnchorResolved && planeState === 'detected') return '#388e3c';
  if (planeState === 'detected') return '#388e3c';
  return '#1976d2';
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 10,
  },
  text: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  subtext: {
    color: '#ffffffcc',
    fontSize: 12,
    marginTop: 2,
  },
});
