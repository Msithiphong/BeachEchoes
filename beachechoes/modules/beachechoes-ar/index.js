import { NativeEventEmitter, NativeModules, Platform } from 'react-native'

const MODULE_NAME = 'BeachEchoesAR'
export const TRACKING_STATE_EVENT = 'BeachEchoesARTrackingStateChanged'
export const PLANE_UPDATE_EVENT = 'BeachEchoesARPlaneUpdated'
export const APRILTAG_UPDATE_EVENT = 'BeachEchoesARAprilTagUpdated'
export const AR_STATE_EVENT = 'BeachEchoesARStateChanged'

const nativeModule = NativeModules[MODULE_NAME]
const nativeEmitter =
  Platform.OS === 'android' && nativeModule
    ? new NativeEventEmitter(nativeModule)
    : null

export async function startARSession() {
  if (Platform.OS !== 'android') return 'unsupported_platform'
  if (!nativeModule?.startARSession) {
    throw new Error(`${MODULE_NAME} is not linked`)
  }
  return nativeModule.startARSession()
}

export async function stopARSession() {
  if (Platform.OS !== 'android') return 'unsupported_platform'
  if (!nativeModule?.stopARSession) {
    throw new Error(`${MODULE_NAME} is not linked`)
  }
  return nativeModule.stopARSession()
}

export async function placeEcho({ localOffset = { x: 0, y: 0, z: 0 }, floorLock = true } = {}) {
  if (Platform.OS !== 'android') {
    return {
      worldPosition: { x: 0, y: 0, z: 0 },
      floorLocked: false,
      anchorId: -1,
      unsupportedPlatform: true,
    }
  }
  if (!nativeModule?.placeEcho) {
    throw new Error(`${MODULE_NAME} is not linked`)
  }

  return nativeModule.placeEcho({
    localOffset: {
      x: Number(localOffset.x || 0),
      y: Number(localOffset.y || 0),
      z: Number(localOffset.z || 0),
    },
    floorLock: Boolean(floorLock),
  })
}

export function addTrackingStateListener(listener) {
  if (!nativeEmitter) {
    return { remove: () => {} }
  }
  return nativeEmitter.addListener(TRACKING_STATE_EVENT, listener)
}

export function addPlaneUpdateListener(listener) {
  if (!nativeEmitter) {
    return { remove: () => {} }
  }
  return nativeEmitter.addListener(PLANE_UPDATE_EVENT, listener)
}

export function addAprilTagListener(listener) {
  if (!nativeEmitter) {
    return { remove: () => {} }
  }
  return nativeEmitter.addListener(APRILTAG_UPDATE_EVENT, listener)
}

export function addARStateListener(listener) {
  if (!nativeEmitter) {
    return { remove: () => {} }
  }
  return nativeEmitter.addListener(AR_STATE_EVENT, listener)
}
