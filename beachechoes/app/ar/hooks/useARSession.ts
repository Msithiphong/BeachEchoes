import { useEffect, useState, useCallback, useRef } from 'react';
import {
  startARSession,
  stopARSession,
  isSessionRunning,
  addTrackingStateListener,
  addPlaneStateListener,
  addAnchorResolvedListener,
} from '../../../modules/beachechoes-ar';
import type {
  ARSessionResult,
  TrackingState,
  TrackingStateEvent,
  PlaneState,
  PlaneStateEvent,
  AnchorResolvedEvent,
} from '../../../modules/beachechoes-ar';

type ARSessionHookState = {
  isRunning: boolean;
  trackingState: TrackingState | null;
  trackingReason: string | null;
  planeState: PlaneState | null;
  planeCount: number;
  anchorTagId: number | null;
  anchorZoneId: string | null;
  /** True when anchor was resolved but tracking later degraded */
  isAnchorStale: boolean;
  /** True when anchor was previously resolved and then lost/stale */
  needsRecalibration: boolean;
  error: string | null;
};

const DEGRADED_STATES: TrackingState[] = ['limited', 'interrupted', 'notAvailable'];

export function useARSession() {
  const [state, setState] = useState<ARSessionHookState>({
    isRunning: false,
    trackingState: null,
    trackingReason: null,
    planeState: null,
    planeCount: 0,
    anchorTagId: null,
    anchorZoneId: null,
    isAnchorStale: false,
    needsRecalibration: false,
    error: null,
  });

  const mountedRef = useRef(true);
  const zoneIdRef = useRef<string | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Subscribe to tracking state events
  useEffect(() => {
    const subscription = addTrackingStateListener((event: TrackingStateEvent) => {
      if (!mountedRef.current) return;
      setState((prev) => {
        const wasDegraded = DEGRADED_STATES.includes(event.state);
        const hadAnchor = prev.anchorTagId !== null;

        // If tracking degrades after anchor was resolved → mark stale
        const isAnchorStale = hadAnchor && wasDegraded
          ? true
          : prev.isAnchorStale;

        // If tracking recovers but anchor was stale → needs recalibration
        const needsRecalibration = hadAnchor && prev.isAnchorStale && event.state === 'normal'
          ? true
          : prev.needsRecalibration;

        return {
          ...prev,
          trackingState: event.state,
          trackingReason: event.reason,
          isAnchorStale,
          needsRecalibration,
        };
      });
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Subscribe to plane state events
  useEffect(() => {
    const subscription = addPlaneStateListener((event: PlaneStateEvent) => {
      if (!mountedRef.current) return;
      setState((prev) => ({
        ...prev,
        planeState: event.state,
        planeCount: event.planeCount,
      }));
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Subscribe to anchor resolved events
  useEffect(() => {
    const subscription = addAnchorResolvedListener((event: AnchorResolvedEvent) => {
      if (!mountedRef.current) return;
      setState((prev) => ({
        ...prev,
        anchorTagId: event.tagId,
        anchorZoneId: event.zoneId,
        isAnchorStale: false,
        needsRecalibration: false,
      }));
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const start = useCallback(async (zoneId: string): Promise<ARSessionResult> => {
    zoneIdRef.current = zoneId;
    setState((prev) => ({ ...prev, error: null }));
    const result = await startARSession(zoneId);
    if (mountedRef.current) {
      setState((prev) => ({
        ...prev,
        isRunning: result.success,
        error: result.success ? null : result.message,
      }));
    }
    return result;
  }, []);

  const stop = useCallback(async (): Promise<ARSessionResult> => {
    zoneIdRef.current = null;
    const result = await stopARSession();
    if (mountedRef.current) {
      setState({
        isRunning: false,
        trackingState: null,
        trackingReason: null,
        planeState: null,
        planeCount: 0,
        anchorTagId: null,
        anchorZoneId: null,
        isAnchorStale: false,
        needsRecalibration: false,
        error: null,
      });
    }
    return result;
  }, []);

  /**
   * Reset the current anchor and restart the AR session
   * so the user can re-scan the AprilTag.
   */
  const recalibrate = useCallback(async (): Promise<ARSessionResult> => {
    const zoneId = zoneIdRef.current;
    if (!zoneId) {
      return { success: false, message: 'No active zone to recalibrate' };
    }
    // Stop and restart the session — this resets the native anchor manager
    await stopARSession();
    if (mountedRef.current) {
      setState((prev) => ({
        ...prev,
        anchorTagId: null,
        anchorZoneId: null,
        isAnchorStale: false,
        needsRecalibration: false,
      }));
    }
    return startARSession(zoneId);
  }, []);

  // Clean up session on unmount
  useEffect(() => {
    return () => {
      if (isSessionRunning()) {
        stopARSession();
      }
    };
  }, []);

  return {
    ...state,
    start,
    stop,
    recalibrate,
  };
}
