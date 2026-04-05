package com.csithiphong.beachechoes.ar

import android.app.Activity
import android.content.Context
import android.media.Image
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.util.Log
import com.csithiphong.beachechoes.BuildConfig
import com.google.ar.core.Anchor
import com.google.ar.core.ArCoreApk
import com.google.ar.core.Config
import com.google.ar.core.Frame
import com.google.ar.core.Plane
import com.google.ar.core.Pose
import com.google.ar.core.Session
import com.google.ar.core.TrackingState
import com.google.ar.core.exceptions.MissingGlContextException
import com.google.ar.core.exceptions.NotYetAvailableException
import com.google.ar.core.exceptions.SessionPausedException
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.abs
import kotlin.math.max

class ARSessionManager(
  private val context: Context,
  private val onTrackingStateChanged: (String, String?) -> Unit,
  private val onPlaneUpdated: (PlaneUpdate) -> Unit,
  private val onAprilTagUpdated: (AprilTagUpdate) -> Unit,
  private val onArStateUpdated: (ArStateUpdate) -> Unit
) {
  private var session: Session? = null
  private var handlerThread: HandlerThread? = null
  private var handler: Handler? = null
  private var installRequested = false
  private var lastTrackingState: String? = null
  private val isRunning = AtomicBoolean(false)
  private var isSimulatedMode = false
  private var simulatedTick = 0L
  private var pausedExceptionReported = false
  private var glFallbackReported = false

  private val planeStateCache = mutableMapOf<String, PlaneSnapshot>()
  private val tagStateCache = mutableMapOf<Int, TagTemporalState>()
  private var nativeDetector: AprilTagNativeDetector? = null

  private var latestFrame: Frame? = null
  private var lastFloorTrackedAtMs = 0L
  private var floorUnavailableEmitted = false

  private var nextAnchorId = 1L
  private val anchorCache = linkedMapOf<Long, Anchor>()

  @Synchronized
  fun start(activity: Activity?): StartResult {
    if (isRunning.get()) {
      return StartResult.AlreadyRunning
    }

    if (activity == null) {
      return StartResult.Error("No foreground activity available")
    }

    val availability = ArCoreApk.getInstance().checkAvailability(context)
    if (availability.isUnsupported) {
      if (isLikelyEmulator()) {
        return startSimulatedMode("ARCore unsupported on emulator; using simulated mode")
      }
      onTrackingStateChanged("UNSUPPORTED", "This device does not support ARCore")
      onArStateUpdated(
        ArStateUpdate(
          state = "unsupported",
          reason = "This device does not support ARCore",
          timestampMs = System.currentTimeMillis()
        )
      )
      return StartResult.Error("This device does not support ARCore")
    }

    try {
      val installStatus = ArCoreApk.getInstance().requestInstall(activity, !installRequested)
      if (installStatus == ArCoreApk.InstallStatus.INSTALL_REQUESTED) {
        if (isLikelyEmulator()) {
          return startSimulatedMode("Google Play Services for AR unavailable; using simulated mode")
        }
        installRequested = true
        onTrackingStateChanged("INSTALL_REQUESTED", "ARCore install/update requested")
        return StartResult.InstallRequested
      }

      session = Session(context)
      installRequested = false
      isSimulatedMode = false

      val config = Config(session).apply {
        focusMode = Config.FocusMode.AUTO
        updateMode = Config.UpdateMode.LATEST_CAMERA_IMAGE
        planeFindingMode = Config.PlaneFindingMode.HORIZONTAL
      }
      session?.configure(config)
      session?.resume()

      nativeDetector = AprilTagNativeDetector().also { it.start() }
      clearRuntimeState()

      isRunning.set(true)
      startTrackingLoop()
      onTrackingStateChanged("SESSION_STARTED", null)
      logDebug("AR session started")
      return StartResult.Started
    } catch (exception: Exception) {
      if (isLikelyEmulator()) {
        val reason = exception.message ?: "ARCore unavailable in emulator"
        return startSimulatedMode("ARCore init failed ($reason); using simulated mode")
      }
      closeSession()
      onTrackingStateChanged("ERROR", exception.message)
      onArStateUpdated(
        ArStateUpdate(
          state = "session_error",
          reason = exception.message ?: "Unknown start error",
          timestampMs = System.currentTimeMillis()
        )
      )
      logError("Failed to start AR session", exception)
      return StartResult.Error(exception.message ?: "Failed to start AR session")
    }
  }

  @Synchronized
  fun stop(): StopResult {
    if (!isRunning.get()) {
      closeSession()
      isSimulatedMode = false
      onTrackingStateChanged("SESSION_STOPPED", null)
      return StopResult.AlreadyStopped
    }

    isRunning.set(false)
    stopTrackingLoop()
    closeSession()
    isSimulatedMode = false
    onTrackingStateChanged("SESSION_STOPPED", null)
    logDebug("AR session stopped")
    return StopResult.Stopped
  }

  @Synchronized
  fun placeEcho(localX: Double, localY: Double, localZ: Double, floorLock: Boolean): PlaceEchoResult {
    if (isSimulatedMode) {
      val worldX = localX
      val worldY = if (floorLock) 0.0 else localY
      val worldZ = -1.25 + localZ
      val anchorId = nextAnchorId++
      return PlaceEchoResult.Success(
        worldX = worldX,
        worldY = worldY,
        worldZ = worldZ,
        floorLocked = floorLock,
        anchorId = anchorId
      )
    }

    val activeSession = session ?: return PlaceEchoResult.Error("AR session is not active")
    val frame = latestFrame ?: return PlaceEchoResult.Error("No AR frame available yet")
    val cameraPose = frame.camera.pose ?: return PlaceEchoResult.Error("Camera pose unavailable")

    val floorPose = if (floorLock) bestFloorPose() else null
    val basePose = floorPose ?: cameraPose
    val worldPose = localOffsetToWorldPose(basePose, localX.toFloat(), localY.toFloat(), localZ.toFloat())
    val anchor = createAnchorForWorldPose(activeSession, worldPose)
      ?: return PlaceEchoResult.Error("Failed to create anchor for world pose")

    val anchorId = registerAnchor(anchor)
    val translation = worldPose.translation
    val usedFloorLock = floorLock && floorPose != null

    if (floorLock && !usedFloorLock) {
      emitStateOnce(
        state = "floor_unavailable",
        reason = "Falling back to camera pose for placeEcho",
        timestampMs = System.currentTimeMillis()
      )
    }

    return PlaceEchoResult.Success(
      worldX = translation[0].toDouble(),
      worldY = translation[1].toDouble(),
      worldZ = translation[2].toDouble(),
      floorLocked = usedFloorLock,
      anchorId = anchorId
    )
  }

  private fun startTrackingLoop() {
    val thread = HandlerThread("BeachEchoesARTracking")
    thread.start()
    handlerThread = thread
    handler = Handler(thread.looper)
    handler?.post(trackingRunnable)
  }

  private fun stopTrackingLoop() {
    handler?.removeCallbacksAndMessages(null)
    handler = null
    handlerThread?.quitSafely()
    handlerThread = null

    nativeDetector?.stop()
    nativeDetector = null
    clearRuntimeState()
    clearAnchors()
  }

  private fun clearRuntimeState() {
    lastTrackingState = null
    simulatedTick = 0L
    pausedExceptionReported = false
    glFallbackReported = false
    planeStateCache.clear()
    tagStateCache.clear()
    latestFrame = null
    lastFloorTrackedAtMs = 0L
    floorUnavailableEmitted = false
  }

  private fun closeSession() {
    try {
      session?.pause()
    } catch (_: Exception) {
      // Ignore pause errors when shutting down.
    }
    session?.close()
    session = null
  }

  private val trackingRunnable = object : Runnable {
    override fun run() {
      if (!isRunning.get()) return
      val nowMs = System.currentTimeMillis()

      if (isSimulatedMode) {
        runSimulatedTrackingTick(nowMs)
        if (isRunning.get()) {
          handler?.postDelayed(this, TRACKING_POLL_INTERVAL_MS)
        }
        return
      }

      try {
        val frame = session?.update()
        latestFrame = frame
        val trackingState = frame?.camera?.trackingState?.name ?: "UNKNOWN"
        if (trackingState != lastTrackingState) {
          lastTrackingState = trackingState
          onTrackingStateChanged(trackingState, null)

          if (trackingState == TrackingState.PAUSED.name || trackingState == TrackingState.STOPPED.name) {
            onArStateUpdated(
              ArStateUpdate(
                state = "degraded_tracking",
                reason = "Camera tracking state is $trackingState",
                timestampMs = nowMs
              )
            )
          }
        }

        if (frame != null) {
          processPlaneUpdates(frame, nowMs)
          processAprilTags(frame, nowMs)
          processFloorAvailability(nowMs)
        }
      } catch (exception: Exception) {
        if (exception is MissingGlContextException) {
          if (!glFallbackReported) {
            glFallbackReported = true
            closeSession()
            clearRuntimeState()
            isSimulatedMode = true
            onTrackingStateChanged("SESSION_STARTED", "SIMULATED")
            onArStateUpdated(
              ArStateUpdate(
                state = "simulated_mode",
                reason = "Missing GL context for ARCore frame updates; using simulated mode",
                timestampMs = nowMs
              )
            )
            logDebug("Switched to simulated mode because ARCore requires a GL context")
          }
        } else if (exception is SessionPausedException) {
          if (!pausedExceptionReported) {
            pausedExceptionReported = true
            onTrackingStateChanged("PAUSED", "ARCore session is paused")
            onArStateUpdated(
              ArStateUpdate(
                state = "degraded_tracking",
                reason = "ARCore session paused",
                timestampMs = nowMs
              )
            )
            logDebug("ARCore session paused; waiting for resume")
          }
        } else {
          pausedExceptionReported = false
          onTrackingStateChanged("ERROR", exception.message)
          onArStateUpdated(
            ArStateUpdate(
              state = "session_error",
              reason = exception.message ?: "Session update failed",
              timestampMs = nowMs
            )
          )
          logError("Tracking loop error", exception)
        }
      } finally {
        if (isRunning.get()) {
          handler?.postDelayed(this, TRACKING_POLL_INTERVAL_MS)
        }
      }
    }
  }

  @Synchronized
  private fun startSimulatedMode(reason: String): StartResult {
    closeSession()
    installRequested = false
    isSimulatedMode = true
    clearRuntimeState()
    isRunning.set(true)
    startTrackingLoop()
    onTrackingStateChanged("SESSION_STARTED", "SIMULATED")
    onArStateUpdated(
      ArStateUpdate(
        state = "simulated_mode",
        reason = reason,
        timestampMs = System.currentTimeMillis()
      )
    )
    logDebug("Started simulated AR mode: $reason")
    return StartResult.Started
  }

  private fun runSimulatedTrackingTick(nowMs: Long) {
    simulatedTick += 1

    val trackingState = if (simulatedTick < 6) TrackingState.PAUSED.name else TrackingState.TRACKING.name
    if (trackingState != lastTrackingState) {
      lastTrackingState = trackingState
      onTrackingStateChanged(trackingState, if (trackingState == TrackingState.PAUSED.name) "SIMULATED" else null)
    }

    if (trackingState == TrackingState.TRACKING.name) {
      val centerX = 0.0f
      val centerY = 0.0f
      val centerZ = -1.4f + ((simulatedTick % 7).toFloat() * 0.01f)
      val extent = 1.6f
      onPlaneUpdated(
        PlaneUpdate(
          id = "sim_floor_1",
          trackingState = TrackingState.TRACKING.name,
          type = Plane.Type.HORIZONTAL_UPWARD_FACING.name,
          isFloorCandidate = true,
          centerX = centerX,
          centerY = centerY,
          centerZ = centerZ,
          extentX = extent,
          extentZ = extent,
          timestampMs = nowMs
        )
      )

      if (simulatedTick == 6L) {
        onArStateUpdated(
          ArStateUpdate(
            state = "floor_available",
            reason = "Simulated floor plane available",
            timestampMs = nowMs
          )
        )
      }
    }

    when (simulatedTick) {
      10L -> {
        onAprilTagUpdated(
          AprilTagUpdate(
            event = "detected",
            id = 7,
            centerX = 540.0,
            centerY = 860.0,
            decisionMargin = 42.0,
            timestampMs = nowMs
          )
        )
      }
      18L -> {
        onAprilTagUpdated(
          AprilTagUpdate(
            event = "degraded_tracking",
            id = 7,
            centerX = 548.0,
            centerY = 856.0,
            decisionMargin = 24.0,
            timestampMs = nowMs,
            reason = "Low decision margin"
          )
        )
        onArStateUpdated(
          ArStateUpdate(
            state = "degraded_tracking",
            reason = "Simulated AprilTag tracking degraded",
            timestampMs = nowMs,
            tagId = 7
          )
        )
      }
      26L -> {
        onAprilTagUpdated(
          AprilTagUpdate(
            event = "lost",
            id = 7,
            centerX = 548.0,
            centerY = 856.0,
            decisionMargin = 24.0,
            timestampMs = nowMs
          )
        )
        onArStateUpdated(
          ArStateUpdate(
            state = "tag_lost",
            reason = "Simulated AprilTag lost",
            timestampMs = nowMs,
            tagId = 7
          )
        )
      }
    }
  }

  private fun processPlaneUpdates(frame: Frame, nowMs: Long) {
    val updatedPlanes = frame.getUpdatedTrackables(Plane::class.java)

    for (plane in updatedPlanes) {
      val planeId = "plane_${System.identityHashCode(plane)}"
      val pose = plane.centerPose
      val trackingState = plane.trackingState.name
      val type = plane.type.name
      val isFloorCandidate = plane.type == Plane.Type.HORIZONTAL_UPWARD_FACING &&
        plane.trackingState == TrackingState.TRACKING
      val snapshot = PlaneSnapshot(
        trackingState = trackingState,
        centerX = pose.tx(),
        centerY = pose.ty(),
        centerZ = pose.tz(),
        extentX = plane.extentX,
        extentZ = plane.extentZ,
        pose = pose,
        isFloorCandidate = isFloorCandidate,
        updatedAtMs = nowMs
      )

      val previous = planeStateCache[planeId]
      if (previous != null && !shouldEmitPlane(previous, snapshot)) {
        planeStateCache[planeId] = snapshot
        continue
      }

      val update = PlaneUpdate(
        id = planeId,
        trackingState = trackingState,
        type = type,
        isFloorCandidate = isFloorCandidate,
        centerX = snapshot.centerX,
        centerY = snapshot.centerY,
        centerZ = snapshot.centerZ,
        extentX = snapshot.extentX,
        extentZ = snapshot.extentZ,
        timestampMs = nowMs
      )

      if (isFloorCandidate) {
        lastFloorTrackedAtMs = nowMs
        if (floorUnavailableEmitted) {
          floorUnavailableEmitted = false
          onArStateUpdated(
            ArStateUpdate(
              state = "floor_available",
              reason = "Detected tracked horizontal floor plane",
              timestampMs = nowMs
            )
          )
        }
      }

      planeStateCache[planeId] = snapshot
      onPlaneUpdated(update)
    }
  }

  private fun processFloorAvailability(nowMs: Long) {
    val hasTrackedFloor = planeStateCache.values.any { snapshot ->
      snapshot.isFloorCandidate &&
        snapshot.trackingState == TrackingState.TRACKING.name &&
        nowMs - snapshot.updatedAtMs <= FLOOR_STALE_TIMEOUT_MS
    }

    if (hasTrackedFloor) {
      lastFloorTrackedAtMs = nowMs
      return
    }

    if (!floorUnavailableEmitted && nowMs - lastFloorTrackedAtMs >= FLOOR_UNAVAILABLE_TIMEOUT_MS) {
      floorUnavailableEmitted = true
      onArStateUpdated(
        ArStateUpdate(
          state = "floor_unavailable",
          reason = "No tracked floor plane available",
          timestampMs = nowMs
        )
      )
    }
  }

  private fun shouldEmitPlane(previous: PlaneSnapshot, current: PlaneSnapshot): Boolean {
    if (previous.trackingState != current.trackingState) return true
    if (previous.isFloorCandidate != current.isFloorCandidate) return true
    if (abs(previous.centerX - current.centerX) > PLANE_POSITION_EPSILON_M) return true
    if (abs(previous.centerY - current.centerY) > PLANE_POSITION_EPSILON_M) return true
    if (abs(previous.centerZ - current.centerZ) > PLANE_POSITION_EPSILON_M) return true
    if (abs(previous.extentX - current.extentX) > PLANE_EXTENT_EPSILON_M) return true
    if (abs(previous.extentZ - current.extentZ) > PLANE_EXTENT_EPSILON_M) return true
    return false
  }

  private fun processAprilTags(frame: Frame, nowMs: Long) {
    val detector = nativeDetector ?: return
    val seenThisFrame = mutableSetOf<Int>()

    var image: Image? = null
    try {
      image = frame.acquireCameraImage()
      val yPlane = image.planes.firstOrNull() ?: return
      val rawDetections = detector.detect(
        yPlane.buffer,
        image.width,
        image.height,
        yPlane.rowStride
      )

      val bestPerTag = rawDetections
        .filter { it.hamming <= MAX_ALLOWED_HAMMING }
        .groupBy { it.id }
        .mapValues { (_, values) -> values.maxBy { it.decisionMargin } }

      for ((id, rawDetection) in bestPerTag) {
        seenThisFrame.add(id)
        val existing = tagStateCache[id]

        val nextState = if (existing == null) {
          TagTemporalState(
            id = id,
            smoothedX = rawDetection.centerX,
            smoothedY = rawDetection.centerY,
            smoothedMargin = rawDetection.decisionMargin,
            framesSeenConsecutively = 1,
            lastSeenAtMs = nowMs,
            lastEmittedAtMs = 0L,
            hasEverEmitted = false,
            degradedEmitted = false
          )
        } else {
          existing.copy(
            smoothedX = existing.smoothedX + SMOOTHING_ALPHA * (rawDetection.centerX - existing.smoothedX),
            smoothedY = existing.smoothedY + SMOOTHING_ALPHA * (rawDetection.centerY - existing.smoothedY),
            smoothedMargin = existing.smoothedMargin + SMOOTHING_ALPHA * (rawDetection.decisionMargin - existing.smoothedMargin),
            framesSeenConsecutively = existing.framesSeenConsecutively + 1,
            lastSeenAtMs = nowMs
          )
        }

        val shouldEmitDetection = nextState.framesSeenConsecutively >= MIN_STABLE_FRAMES &&
          (
            !nextState.hasEverEmitted ||
              abs(nextState.smoothedX - (existing?.smoothedX ?: nextState.smoothedX)) > TAG_MOVE_EPSILON_PX ||
              abs(nextState.smoothedY - (existing?.smoothedY ?: nextState.smoothedY)) > TAG_MOVE_EPSILON_PX ||
              abs(nextState.smoothedMargin - (existing?.smoothedMargin ?: nextState.smoothedMargin)) > TAG_MARGIN_EPSILON ||
              nowMs - nextState.lastEmittedAtMs >= TAG_EMIT_INTERVAL_MS
            )

        var updatedState = nextState
        if (shouldEmitDetection) {
          onAprilTagUpdated(
            AprilTagUpdate(
              event = "detected",
              id = id,
              centerX = nextState.smoothedX,
              centerY = nextState.smoothedY,
              decisionMargin = nextState.smoothedMargin,
              timestampMs = nowMs
            )
          )
          updatedState = updatedState.copy(
            lastEmittedAtMs = nowMs,
            hasEverEmitted = true
          )
        }

        val isDegraded = updatedState.hasEverEmitted && updatedState.smoothedMargin < TAG_DEGRADED_MARGIN
        if (isDegraded && !updatedState.degradedEmitted) {
          onAprilTagUpdated(
            AprilTagUpdate(
              event = "degraded_tracking",
              id = id,
              centerX = updatedState.smoothedX,
              centerY = updatedState.smoothedY,
              decisionMargin = updatedState.smoothedMargin,
              timestampMs = nowMs,
              reason = "Low decision margin"
            )
          )
          onArStateUpdated(
            ArStateUpdate(
              state = "degraded_tracking",
              reason = "AprilTag $id has low decision margin",
              timestampMs = nowMs,
              tagId = id
            )
          )
          updatedState = updatedState.copy(degradedEmitted = true)
        } else if (!isDegraded && updatedState.degradedEmitted) {
          updatedState = updatedState.copy(degradedEmitted = false)
        }

        tagStateCache[id] = updatedState
      }
    } catch (_: NotYetAvailableException) {
      // Frame not ready for camera-image access this cycle.
    } catch (exception: Exception) {
      onAprilTagUpdated(
        AprilTagUpdate(
          event = "error",
          id = -1,
          centerX = 0.0,
          centerY = 0.0,
          decisionMargin = 0.0,
          timestampMs = nowMs,
          reason = exception.message
        )
      )
      logError("AprilTag processing failed", exception)
    } finally {
      image?.close()
    }

    val missingIds = tagStateCache.keys.filter { it !in seenThisFrame }
    for (id in missingIds) {
      val state = tagStateCache[id] ?: continue
      if (nowMs - state.lastSeenAtMs >= TAG_LOST_TIMEOUT_MS && state.hasEverEmitted) {
        onAprilTagUpdated(
          AprilTagUpdate(
            event = "lost",
            id = id,
            centerX = state.smoothedX,
            centerY = state.smoothedY,
            decisionMargin = state.smoothedMargin,
            timestampMs = nowMs
          )
        )
        onArStateUpdated(
          ArStateUpdate(
            state = "tag_lost",
            reason = "AprilTag $id not seen recently",
            timestampMs = nowMs,
            tagId = id
          )
        )
        tagStateCache.remove(id)
      }
    }
  }

  private fun localOffsetToWorldPose(basePose: Pose, offsetX: Float, offsetY: Float, offsetZ: Float): Pose {
    val offsetPose = Pose.makeTranslation(offsetX, offsetY, offsetZ)
    return basePose.compose(offsetPose)
  }

  private fun bestFloorPose(): Pose? {
    val bestFloor = planeStateCache.values
      .filter { it.isFloorCandidate && it.trackingState == TrackingState.TRACKING.name }
      .maxByOrNull { max(it.extentX * it.extentZ, 0f) }
    return bestFloor?.pose
  }

  private fun createAnchorForWorldPose(activeSession: Session, worldPose: Pose): Anchor? {
    return try {
      activeSession.createAnchor(worldPose)
    } catch (exception: Exception) {
      logError("Unable to create anchor", exception)
      null
    }
  }

  private fun registerAnchor(anchor: Anchor): Long {
    val id = nextAnchorId++
    anchorCache[id] = anchor
    while (anchorCache.size > MAX_ACTIVE_ANCHORS) {
      val oldestKey = anchorCache.keys.firstOrNull() ?: break
      anchorCache.remove(oldestKey)?.detach()
    }
    return id
  }

  private fun clearAnchors() {
    anchorCache.values.forEach { anchor ->
      try {
        anchor.detach()
      } catch (_: Exception) {
        // Ignore anchor detach failures during shutdown.
      }
    }
    anchorCache.clear()
    nextAnchorId = 1L
  }

  private fun emitStateOnce(state: String, reason: String, timestampMs: Long) {
    if (state == "floor_unavailable" && floorUnavailableEmitted) return
    onArStateUpdated(ArStateUpdate(state = state, reason = reason, timestampMs = timestampMs))
    if (state == "floor_unavailable") {
      floorUnavailableEmitted = true
    }
  }

  private fun logDebug(message: String) {
    if (BuildConfig.DEBUG) {
      Log.d(LOG_TAG, message)
    }
  }

  private fun logError(message: String, throwable: Throwable? = null) {
    Log.e(LOG_TAG, message, throwable)
  }

  private fun isLikelyEmulator(): Boolean {
    val fingerprint = Build.FINGERPRINT.lowercase()
    val model = Build.MODEL.lowercase()
    val product = Build.PRODUCT.lowercase()
    val manufacturer = Build.MANUFACTURER.lowercase()
    return fingerprint.contains("generic") ||
      fingerprint.contains("emulator") ||
      model.contains("emulator") ||
      model.contains("sdk_gphone") ||
      product.contains("sdk_gphone") ||
      manufacturer.contains("genymotion")
  }

  data class PlaneUpdate(
    val id: String,
    val trackingState: String,
    val type: String,
    val isFloorCandidate: Boolean,
    val centerX: Float,
    val centerY: Float,
    val centerZ: Float,
    val extentX: Float,
    val extentZ: Float,
    val timestampMs: Long
  )

  data class AprilTagUpdate(
    val event: String,
    val id: Int,
    val centerX: Double,
    val centerY: Double,
    val decisionMargin: Double,
    val timestampMs: Long,
    val reason: String? = null
  )

  data class ArStateUpdate(
    val state: String,
    val reason: String,
    val timestampMs: Long,
    val tagId: Int? = null
  )

  data class PlaneSnapshot(
    val trackingState: String,
    val centerX: Float,
    val centerY: Float,
    val centerZ: Float,
    val extentX: Float,
    val extentZ: Float,
    val pose: Pose,
    val isFloorCandidate: Boolean,
    val updatedAtMs: Long
  )

  data class TagTemporalState(
    val id: Int,
    val smoothedX: Double,
    val smoothedY: Double,
    val smoothedMargin: Double,
    val framesSeenConsecutively: Int,
    val lastSeenAtMs: Long,
    val lastEmittedAtMs: Long,
    val hasEverEmitted: Boolean,
    val degradedEmitted: Boolean
  )

  sealed class StartResult {
    data object Started : StartResult()
    data object AlreadyRunning : StartResult()
    data object InstallRequested : StartResult()
    data class Error(val message: String) : StartResult()
  }

  sealed class StopResult {
    data object Stopped : StopResult()
    data object AlreadyStopped : StopResult()
  }

  sealed class PlaceEchoResult {
    data class Success(
      val worldX: Double,
      val worldY: Double,
      val worldZ: Double,
      val floorLocked: Boolean,
      val anchorId: Long
    ) : PlaceEchoResult()

    data class Error(val message: String) : PlaceEchoResult()
  }

  companion object {
    private const val LOG_TAG = "BeachEchoesAR"
    private const val TRACKING_POLL_INTERVAL_MS = 100L

    private const val PLANE_POSITION_EPSILON_M = 0.02f
    private const val PLANE_EXTENT_EPSILON_M = 0.03f

    private const val SMOOTHING_ALPHA = 0.35
    private const val MIN_STABLE_FRAMES = 3
    private const val TAG_MOVE_EPSILON_PX = 2.0
    private const val TAG_MARGIN_EPSILON = 1.5
    private const val TAG_EMIT_INTERVAL_MS = 200L
    private const val TAG_LOST_TIMEOUT_MS = 500L
    private const val TAG_DEGRADED_MARGIN = 28.0
    private const val MAX_ALLOWED_HAMMING = 1

    private const val FLOOR_STALE_TIMEOUT_MS = 800L
    private const val FLOOR_UNAVAILABLE_TIMEOUT_MS = 1500L
    private const val MAX_ACTIVE_ANCHORS = 64
  }
}
