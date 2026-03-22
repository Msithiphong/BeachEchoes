export {
  startARSession,
  stopARSession,
  isSessionRunning,
  addTrackingStateListener,
  addPlaneStateListener,
  addAprilTagListener,
  addAnchorResolvedListener,
  resolveAnchor,
  localToWorld,
  isAnchorResolved,
  placeEcho,
} from './src/BeachEchoesARModule';

export type {
  ARSessionResult,
  TrackingState,
  TrackingStateEvent,
  PlaneState,
  PlaneStateEvent,
  AprilTagDetectionEvent,
  AnchorResolvedEvent,
  LocalToWorldResult,
  PlaceEchoInput,
  PlaceEchoResult,
} from './src/BeachEchoesAR.types';
