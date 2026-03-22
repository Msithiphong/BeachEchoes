import { useState, useCallback } from 'react';
import { placeEcho } from '../../../modules/beachechoes-ar';
import type { PlaceEchoResult } from '../../../modules/beachechoes-ar';
import { saveEcho, fetchEchoesByTag, deleteEcho } from '../services/echoPlacementService';
import type { AREcho } from '../services/echoPlacementService';

type PlacedEcho = AREcho & {
  worldPosition?: { x: number; y: number; z: number };
  floorLocked?: boolean;
};

type PlacementState = {
  echoes: PlacedEcho[];
  isLoading: boolean;
  error: string | null;
};

const initialState: PlacementState = {
  echoes: [],
  isLoading: false,
  error: null,
};

/**
 * Manages placed echoes — fetching from backend, placing new ones, and deleting.
 */
export function usePlacementStore() {
  const [state, setState] = useState<PlacementState>(initialState);

  /** Fetch saved echoes for a tag from the backend */
  const loadEchoes = useCallback(async (tagId: number) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const echoes = await fetchEchoesByTag(tagId);
      setState({
        echoes: echoes.map((e) => ({ ...e })),
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error('[AR] loadEchoes failed:', err);
      setState((prev) => ({ ...prev, isLoading: false, error: 'Failed to load echoes' }));
    }
  }, []);

  /** Place a new echo: call native placeEcho, then persist to backend */
  const place = useCallback(
    async (params: {
      tagId: number;
      zoneId: string;
      text: string;
      localX: number;
      localZ: number;
      rotationY?: number;
    }): Promise<PlaceEchoResult & { echo?: AREcho }> => {
      // 1. Get world position from native
      const nativeResult = await placeEcho({
        tagId: params.tagId,
        localOffset: { x: params.localX, z: params.localZ },
        rotationY: params.rotationY,
      });

      if (!nativeResult.success) {
        return nativeResult;
      }

      // 2. Persist to backend (local coordinates, not world)
      const saved = await saveEcho({
        zoneId: params.zoneId,
        apriltagId: params.tagId,
        text: params.text,
        localX: params.localX,
        localY: 0,
        localZ: params.localZ,
        rotationY: params.rotationY ?? 0,
      });

      if (!saved) {
        return { ...nativeResult, message: 'Placed but failed to save to server' };
      }

      // Add to local state
      const placedEcho: PlacedEcho = {
        ...saved,
        worldPosition: nativeResult.worldPosition,
        floorLocked: nativeResult.floorLocked,
      };

      setState((prev) => ({
        ...prev,
        echoes: [placedEcho, ...prev.echoes],
      }));

      return { ...nativeResult, echo: saved };
    },
    []
  );

  /** Remove an echo */
  const remove = useCallback(async (echoId: string): Promise<boolean> => {
    try {
      const success = await deleteEcho(echoId);
      if (success) {
        setState((prev) => ({
          ...prev,
          echoes: prev.echoes.filter((e) => e.id !== echoId),
        }));
      }
      return success;
    } catch (err) {
      console.error('[AR] remove echo failed:', err);
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    ...state,
    loadEchoes,
    place,
    remove,
    reset,
  };
}

export type { PlacedEcho, PlacementState };
