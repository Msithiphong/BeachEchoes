import { useState, useCallback } from 'react';
import type { AnchorResolvedEvent } from '../../../modules/beachechoes-ar';
import { fetchZoneByTag } from '../services/echoPlacementService';
import type { ZoneInfo } from '../services/echoPlacementService';

type AnchorState = {
  tagId: number | null;
  zoneId: string | null;
  zoneName: string | null;
  poseMatrix: number[] | null;
  isResolved: boolean;
  isLoading: boolean;
};

const initialState: AnchorState = {
  tagId: null,
  zoneId: null,
  zoneName: null,
  poseMatrix: null,
  isResolved: false,
  isLoading: false,
};

/**
 * Manages the resolved anchor state including zone lookup from backend.
 */
export function useAnchorStore() {
  const [anchor, setAnchor] = useState<AnchorState>(initialState);

  const onAnchorResolved = useCallback(async (event: AnchorResolvedEvent) => {
    setAnchor((prev) => ({
      ...prev,
      tagId: event.tagId,
      poseMatrix: event.poseMatrix,
      isResolved: true,
      isLoading: true,
    }));

    // Look up the zone from the backend by tag ID
    try {
      const zone = await fetchZoneByTag(event.tagId);
      setAnchor((prev) => ({
        ...prev,
        zoneId: zone?.id ?? null,
        zoneName: zone?.name ?? null,
        isLoading: false,
      }));
    } catch (err) {
      console.error('[AR] Zone lookup failed for tag', event.tagId, err);
      setAnchor((prev) => ({ ...prev, isLoading: false }));
    }
  }, []);

  const reset = useCallback(() => {
    setAnchor(initialState);
  }, []);

  return {
    anchor,
    onAnchorResolved,
    reset,
  };
}

export type { AnchorState };
