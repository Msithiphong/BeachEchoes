package expo.modules.beachechoesar

import android.app.Activity
import android.media.Image
import com.google.ar.core.ArCoreApk
import com.google.ar.core.Config
import com.google.ar.core.Frame
import com.google.ar.core.Session
import com.google.ar.core.TrackingState
import com.google.ar.core.exceptions.UnavailableException

/**
 * Manages the ARCore session lifecycle and reports tracking/plane/tag state changes.
 */
class ARSessionManager {
  private var session: Session? = null
  private var previousTrackingState: TrackingState? = null
  private var hasDetectedFloor = false
  var floorPlaneY: Double? = null
    private set
  private var sendEvent: ((String, Map<String, Any>) -> Unit)? = null

  private val tagDetector = AprilTagDetector()
  val anchorManager = AnchorManager()
  private var frameCount = 0
  private val detectEveryNFrames = 3
  private var currentZoneId = ""

  /**
   * Start an ARCore session.
   * Must be called from an Activity context.
   */
  fun start(activity: Activity, zoneId: String, eventEmitter: (String, Map<String, Any>) -> Unit): Map<String, Any> {
    val availability = ArCoreApk.getInstance().checkAvailability(activity)
    if (!availability.isSupported) {
      return mapOf("success" to false, "message" to "ARCore is not supported on this device")
    }

    stop()

    return try {
      val newSession = Session(activity)
      val config = Config(newSession)
      config.planeFindingMode = Config.PlaneFindingMode.HORIZONTAL
      newSession.configure(config)
      newSession.resume()

      session = newSession
      sendEvent = eventEmitter
      previousTrackingState = null
      hasDetectedFloor = false
      tagDetector.init()
      frameCount = 0
      currentZoneId = zoneId
      anchorManager.configure(eventEmitter)

      eventEmitter("onPlaneStateChanged", mapOf(
        "state" to "searching",
        "planeCount" to 0
      ))

      eventEmitter("onTrackingStateChanged", mapOf(
        "state" to "limited",
        "reason" to "Initializing AR session"
      ))

      mapOf("success" to true, "message" to "AR session started")
    } catch (e: UnavailableException) {
      mapOf("success" to false, "message" to "ARCore unavailable: ${e.message}")
    } catch (e: Exception) {
      mapOf("success" to false, "message" to "Failed to start AR session: ${e.message}")
    }
  }

  /**
   * Poll the current frame and emit tracking state if changed.
   * Should be called periodically (e.g., from a timer or frame callback).
   */
  fun update() {
    val currentSession = session ?: return
    try {
      val frame: Frame = currentSession.update()
      val camera = frame.camera
      val currentState = camera.trackingState

      if (currentState != previousTrackingState) {
        previousTrackingState = currentState
        val (state, reason) = trackingInfo(currentState)
        sendEvent?.invoke("onTrackingStateChanged", mapOf(
          "state" to state,
          "reason" to reason
        ))
      }

      // Check plane state
      val planes = currentSession.getAllTrackables(com.google.ar.core.Plane::class.java)
      val horizontalPlanes = planes.filter {
        it.type == com.google.ar.core.Plane.Type.HORIZONTAL_UPWARD_FACING &&
        it.trackingState == TrackingState.TRACKING
      }

      // Track the lowest horizontal plane Y as floor
      val lowestY = horizontalPlanes.minByOrNull {
        val pose = it.centerPose
        pose.ty()
      }?.centerPose?.ty()
      if (lowestY != null) {
        floorPlaneY = lowestY.toDouble()
      }

      val floorDetected = horizontalPlanes.isNotEmpty()
      if (floorDetected != hasDetectedFloor) {
        hasDetectedFloor = floorDetected
        sendEvent?.invoke("onPlaneStateChanged", mapOf(
          "state" to if (floorDetected) "detected" else "searching",
          "planeCount" to horizontalPlanes.size
        ))
      }

      // AprilTag detection (throttled)
      frameCount++
      if (frameCount % detectEveryNFrames == 0 && currentState == TrackingState.TRACKING) {
        detectAprilTags(frame, camera)
      }
    } catch (e: Exception) {
      sendEvent?.invoke("onTrackingStateChanged", mapOf(
        "state" to "notAvailable",
        "reason" to "Session update error: ${e.message}"
      ))
    }
  }

  /** Pause and tear down the ARCore session. */
  fun stop() {
    session?.pause()
    session?.close()
    session = null
    sendEvent = null
    previousTrackingState = null
    hasDetectedFloor = false
    floorPlaneY = null
    tagDetector.destroy()
    anchorManager.reset()
    frameCount = 0
    currentZoneId = ""
  }

  private fun detectAprilTags(frame: Frame, camera: com.google.ar.core.Camera) {
    var image: Image? = null
    try {
      image = frame.acquireCameraImage()
      val yPlane = image.planes[0]
      val yBuffer = yPlane.buffer
      val width = image.width
      val height = image.height

      val grayscale = ByteArray(width * height)
      val rowStride = yPlane.rowStride
      val pixelStride = yPlane.pixelStride
      if (rowStride == width && pixelStride == 1) {
        yBuffer.get(grayscale)
      } else {
        for (row in 0 until height) {
          yBuffer.position(row * rowStride)
          for (col in 0 until width) {
            grayscale[row * width + col] = yBuffer.get(col * pixelStride)
          }
        }
      }

      val intrinsics = camera.imageIntrinsics
      val focalLength = intrinsics.focalLength
      val principalPoint = intrinsics.principalPoint

      val detections = tagDetector.detect(
        grayscale, width, height,
        focalLength[0].toDouble(), focalLength[1].toDouble(),
        principalPoint[0].toDouble(), principalPoint[1].toDouble()
      )

      for (det in detections) {
        sendEvent?.invoke("onAprilTagDetected", mapOf(
          "tagId" to det.tagId,
          "poseMatrix" to det.poseMatrix,
          "centerX" to det.centerX,
          "centerY" to det.centerY,
          "hamming" to det.hamming,
          "decisionMargin" to det.decisionMargin.toDouble(),
          "consecutiveFrames" to det.consecutiveFrames,
          "isNewlyStable" to det.isNewlyStable
        ))

        // Auto-resolve anchor on first stable detection if not already resolved
        if (det.isNewlyStable && !anchorManager.isResolved) {
          anchorManager.resolve(tagId = det.tagId, zoneId = currentZoneId, poseMatrix = det.poseMatrix)
        }
      }
    } catch (e: Exception) {
      android.util.Log.w("BeachEchoesAR", "AprilTag detection frame skipped: ${e.message}")
    } finally {
      image?.close()
    }
  }

  val isRunning: Boolean
    get() = session != null

  private fun trackingInfo(state: TrackingState): Pair<String, String> {
    return when (state) {
      TrackingState.TRACKING -> Pair("normal", "Tracking is normal")
      TrackingState.PAUSED -> Pair("limited", "Tracking paused")
      TrackingState.STOPPED -> Pair("notAvailable", "Tracking stopped")
    }
  }
}
