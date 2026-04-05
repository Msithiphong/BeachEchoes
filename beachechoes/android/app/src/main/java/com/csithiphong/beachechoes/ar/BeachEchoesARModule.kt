package com.csithiphong.beachechoes.ar

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class BeachEchoesARModule(
  reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

  private val arSessionManager: ARSessionManager = ARSessionManager(
    reactApplicationContext,
    onTrackingStateChanged = { trackingState, reason ->
      emitTrackingStateEvent(trackingState, reason)
    },
    onPlaneUpdated = { planeUpdate ->
      emitPlaneUpdateEvent(planeUpdate)
    },
    onAprilTagUpdated = { aprilTagUpdate ->
      emitAprilTagEvent(aprilTagUpdate)
    },
    onArStateUpdated = { arStateUpdate ->
      emitArStateEvent(arStateUpdate)
    }
  )

  override fun getName(): String = MODULE_NAME

  @ReactMethod
  fun startARSession(promise: Promise) {
    when (val result = arSessionManager.start(reactApplicationContext.currentActivity)) {
      ARSessionManager.StartResult.Started -> {
        promise.resolve("started")
      }
      ARSessionManager.StartResult.AlreadyRunning -> {
        promise.resolve("already_running")
      }
      ARSessionManager.StartResult.InstallRequested -> {
        promise.resolve("install_requested")
      }
      is ARSessionManager.StartResult.Error -> {
        promise.reject("AR_START_FAILED", result.message)
      }
    }
  }

  @ReactMethod
  fun stopARSession(promise: Promise) {
    when (arSessionManager.stop()) {
      ARSessionManager.StopResult.Stopped -> promise.resolve("stopped")
      ARSessionManager.StopResult.AlreadyStopped -> promise.resolve("already_stopped")
    }
  }

  @ReactMethod
  fun placeEcho(options: ReadableMap, promise: Promise) {
    val offset = options.getMap("localOffset")
    val localX = offset?.takeIf { it.hasKey("x") }?.getDouble("x") ?: 0.0
    val localY = offset?.takeIf { it.hasKey("y") }?.getDouble("y") ?: 0.0
    val localZ = offset?.takeIf { it.hasKey("z") }?.getDouble("z") ?: 0.0
    val floorLock = if (options.hasKey("floorLock")) options.getBoolean("floorLock") else true

    when (val result = arSessionManager.placeEcho(localX, localY, localZ, floorLock)) {
      is ARSessionManager.PlaceEchoResult.Success -> {
        val payload = Arguments.createMap().apply {
          putMap(
            "worldPosition",
            Arguments.createMap().apply {
              putDouble("x", result.worldX)
              putDouble("y", result.worldY)
              putDouble("z", result.worldZ)
            }
          )
          putBoolean("floorLocked", result.floorLocked)
          putDouble("anchorId", result.anchorId.toDouble())
        }
        promise.resolve(payload)
      }
      is ARSessionManager.PlaceEchoResult.Error -> {
        promise.reject("PLACE_ECHO_FAILED", result.message)
      }
    }
  }

  override fun invalidate() {
    super.invalidate()
    arSessionManager.stop()
  }

  private fun emitTrackingStateEvent(state: String, reason: String?) {
    val params = Arguments.createMap().apply {
      putString("state", state)
      if (reason != null) {
        putString("reason", reason)
      }
    }
    emitEvent(TRACKING_STATE_EVENT, params)
  }

  private fun emitPlaneUpdateEvent(update: ARSessionManager.PlaneUpdate) {
    val params = Arguments.createMap().apply {
      putString("id", update.id)
      putString("trackingState", update.trackingState)
      putString("type", update.type)
      putBoolean("isFloorCandidate", update.isFloorCandidate)
      putDouble("centerX", update.centerX.toDouble())
      putDouble("centerY", update.centerY.toDouble())
      putDouble("centerZ", update.centerZ.toDouble())
      putDouble("extentX", update.extentX.toDouble())
      putDouble("extentZ", update.extentZ.toDouble())
      putDouble("timestampMs", update.timestampMs.toDouble())
    }
    emitEvent(PLANE_UPDATE_EVENT, params)
  }

  private fun emitAprilTagEvent(update: ARSessionManager.AprilTagUpdate) {
    val params = Arguments.createMap().apply {
      putString("event", update.event)
      putInt("id", update.id)
      putDouble("centerX", update.centerX)
      putDouble("centerY", update.centerY)
      putDouble("decisionMargin", update.decisionMargin)
      putDouble("timestampMs", update.timestampMs.toDouble())
      if (update.reason != null) {
        putString("reason", update.reason)
      }
    }
    emitEvent(APRILTAG_UPDATE_EVENT, params)
  }

  private fun emitArStateEvent(update: ARSessionManager.ArStateUpdate) {
    val params = Arguments.createMap().apply {
      putString("state", update.state)
      putString("reason", update.reason)
      putDouble("timestampMs", update.timestampMs.toDouble())
      if (update.tagId != null) {
        putInt("tagId", update.tagId)
      }
    }
    emitEvent(AR_STATE_EVENT, params)
  }

  private fun emitEvent(eventName: String, payload: com.facebook.react.bridge.WritableMap) {
    reactApplicationContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit(eventName, payload)
  }

  companion object {
    const val MODULE_NAME = "BeachEchoesAR"
    const val TRACKING_STATE_EVENT = "BeachEchoesARTrackingStateChanged"
    const val PLANE_UPDATE_EVENT = "BeachEchoesARPlaneUpdated"
    const val APRILTAG_UPDATE_EVENT = "BeachEchoesARAprilTagUpdated"
    const val AR_STATE_EVENT = "BeachEchoesARStateChanged"
  }
}
