import { requireNativeModule } from 'expo-modules-core';
import type { ARSessionResult, TrackingStateEvent, PlaneStateEvent, AprilTagDetectionEvent, AnchorResolvedEvent, LocalToWorldResult, PlaceEchoInput, PlaceEchoResult } from './BeachEchoesAR.types';
import type { EventSubscription } from 'expo-modules-core';

const BeachEchoesAR = requireNativeModule('BeachEchoesAR');

export async function startARSession(zoneId: string): Promise<ARSessionResult> {
  return await BeachEchoesAR.startARSession(zoneId);
}

export async function stopARSession(): Promise<ARSessionResult> {
  return await BeachEchoesAR.stopARSession();
}

export function isSessionRunning(): boolean {
  return BeachEchoesAR.isSessionRunning();
}

export function addTrackingStateListener(
  listener: (event: TrackingStateEvent) => void
): EventSubscription {
  return BeachEchoesAR.addListener('onTrackingStateChanged', listener);
}

export function addPlaneStateListener(
  listener: (event: PlaneStateEvent) => void
): EventSubscription {
  return BeachEchoesAR.addListener('onPlaneStateChanged', listener);
}

export function addAprilTagListener(
  listener: (event: AprilTagDetectionEvent) => void
): EventSubscription {
  return BeachEchoesAR.addListener('onAprilTagDetected', listener);
}

export function addAnchorResolvedListener(
  listener: (event: AnchorResolvedEvent) => void
): EventSubscription {
  return BeachEchoesAR.addListener('onAnchorResolved', listener);
}

export async function resolveAnchor(
  tagId: number,
  poseMatrix: number[]
): Promise<ARSessionResult> {
  return await BeachEchoesAR.resolveAnchor(tagId, poseMatrix);
}

export async function localToWorld(
  x: number,
  y: number,
  z: number
): Promise<LocalToWorldResult> {
  return await BeachEchoesAR.localToWorld(x, y, z);
}

export function isAnchorResolved(): boolean {
  return BeachEchoesAR.isAnchorResolved();
}

export async function placeEcho(input: PlaceEchoInput): Promise<PlaceEchoResult> {
  return await BeachEchoesAR.placeEcho(
    input.tagId,
    input.localOffset.x,
    input.localOffset.z,
    input.rotationY ?? 0
  );
}
