export type ARSessionResult = {
  success: boolean;
  message: string;
};

export type TrackingState = 'notAvailable' | 'limited' | 'normal' | 'interrupted' | 'resuming';

export type TrackingStateEvent = {
  state: TrackingState;
  reason: string;
};

export type PlaneState = 'searching' | 'detected';

export type PlaneStateEvent = {
  state: PlaneState;
  planeCount: number;
};

export type AprilTagDetectionEvent = {
  tagId: number;
  /** 16-element column-major 4×4 camera-to-tag pose matrix */
  poseMatrix: number[];
  centerX: number;
  centerY: number;
  hamming: number;
  decisionMargin: number;
  /** How many consecutive frames this tag has been tracked */
  consecutiveFrames: number;
  /** True only on the frame where the tag first becomes stable */
  isNewlyStable: boolean;
};

export type AnchorResolvedEvent = {
  tagId: number;
  zoneId: string;
  /** 16-element column-major 4×4 anchor pose in world space */
  poseMatrix: number[];
};

export type LocalToWorldResult = {
  success: boolean;
  message?: string;
  worldPosition?: { x: number; y: number; z: number };
};

export type PlaceEchoInput = {
  tagId: number;
  localOffset: { x: number; z: number };
  rotationY?: number;
};

export type PlaceEchoResult = {
  success: boolean;
  message?: string;
  worldPosition?: { x: number; y: number; z: number };
  localPosition?: { x: number; y: number; z: number };
  floorLocked?: boolean;
  rotationY?: number;
};
