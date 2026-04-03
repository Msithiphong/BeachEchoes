import { requireNativeModule } from 'expo-modules-core';
import type { ARSessionResult, TrackingStateEvent, PlaneStateEvent, AprilTagDetectionEvent, AnchorResolvedEvent, LocalToWorldResult, PlaceEchoInput, PlaceEchoResult } from './BeachEchoesAR.types';
import type { EventSubscription } from 'expo-modules-core';

type BeachEchoesARNativeModule = {
  startARSession(zoneId: string): Promise<ARSessionResult>;
  stopARSession(): Promise<ARSessionResult>;
  isSessionRunning(): boolean;
  addListener(eventName: string, listener: (event: unknown) => void): EventSubscription;
  resolveAnchor(tagId: number, poseMatrix: number[]): Promise<ARSessionResult>;
  localToWorld(x: number, y: number, z: number): Promise<LocalToWorldResult>;
  isAnchorResolved(): boolean;
  placeEcho(tagId: number, localX: number, localZ: number, rotationY: number): Promise<PlaceEchoResult>;
};

let nativeModule: BeachEchoesARNativeModule | null = null;

function getNativeModule(): BeachEchoesARNativeModule {
  if (nativeModule) {
    return nativeModule;
  }

  nativeModule = requireNativeModule<BeachEchoesARNativeModule>('BeachEchoesAR');
  return nativeModule;
}

export async function startARSession(zoneId: string): Promise<ARSessionResult> {
  return await getNativeModule().startARSession(zoneId);
}

export async function stopARSession(): Promise<ARSessionResult> {
  return await getNativeModule().stopARSession();
}

export function isSessionRunning(): boolean {
  return getNativeModule().isSessionRunning();
}

export function addTrackingStateListener(
  listener: (event: TrackingStateEvent) => void
): EventSubscription {
  return getNativeModule().addListener('onTrackingStateChanged', listener);
}

export function addPlaneStateListener(
  listener: (event: PlaneStateEvent) => void
): EventSubscription {
  return getNativeModule().addListener('onPlaneStateChanged', listener);
}

export function addAprilTagListener(
  listener: (event: AprilTagDetectionEvent) => void
): EventSubscription {
  return getNativeModule().addListener('onAprilTagDetected', listener);
}

export function addAnchorResolvedListener(
  listener: (event: AnchorResolvedEvent) => void
): EventSubscription {
  return getNativeModule().addListener('onAnchorResolved', listener);
}

export async function resolveAnchor(
  tagId: number,
  poseMatrix: number[]
): Promise<ARSessionResult> {
  return await getNativeModule().resolveAnchor(tagId, poseMatrix);
}

export async function localToWorld(
  x: number,
  y: number,
  z: number
): Promise<LocalToWorldResult> {
  return await getNativeModule().localToWorld(x, y, z);
}

export function isAnchorResolved(): boolean {
  return getNativeModule().isAnchorResolved();
}

export async function placeEcho(input: PlaceEchoInput): Promise<PlaceEchoResult> {
  return await getNativeModule().placeEcho(
    input.tagId,
    input.localOffset.x,
    input.localOffset.z,
    input.rotationY ?? 0
  );
}
