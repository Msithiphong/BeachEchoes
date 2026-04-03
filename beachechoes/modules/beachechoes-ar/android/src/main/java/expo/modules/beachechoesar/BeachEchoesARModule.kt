package expo.modules.beachechoesar

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class BeachEchoesARModule : Module() {
  private val sessionManager = ARSessionManager()

  override fun definition() = ModuleDefinition {
    Name("BeachEchoesAR")

    Events("onTrackingStateChanged", "onPlaneStateChanged", "onAprilTagDetected", "onAnchorResolved")

    AsyncFunction("startARSession") { zoneId: String ->
      val activity = appContext.currentActivity
        ?: return@AsyncFunction mapOf("success" to false, "message" to "No activity available")

      sessionManager.start(activity, zoneId) { eventName, body ->
        sendEvent(eventName, body)
      }
    }

    AsyncFunction("stopARSession") {
      sessionManager.stop()
      mapOf("success" to true, "message" to "AR session stopped")
    }

    Function("isSessionRunning") {
      sessionManager.isRunning
    }

    AsyncFunction("resolveAnchor") { tagId: Int, poseMatrix: List<Double> ->
      if (!sessionManager.isRunning) {
        return@AsyncFunction mapOf("success" to false, "message" to "AR session is not running")
      }
      val resolved = sessionManager.anchorManager.resolve(
        tagId = tagId,
        zoneId = "manual",
        poseMatrix = poseMatrix
      )
      mapOf("success" to resolved, "message" to if (resolved) "Anchor resolved" else "Invalid pose matrix")
    }

    AsyncFunction("localToWorld") { x: Double, y: Double, z: Double ->
      val worldPos = sessionManager.anchorManager.localToWorld(x, y, z)
        ?: return@AsyncFunction mapOf("success" to false, "message" to "No anchor resolved")
      mapOf(
        "success" to true,
        "worldPosition" to worldPos
      )
    }

    Function("isAnchorResolved") {
      sessionManager.anchorManager.isResolved
    }

    AsyncFunction("placeEcho") { tagId: Int, localX: Double, localZ: Double, rotationY: Double ->
      if (!sessionManager.isRunning) {
        return@AsyncFunction mapOf("success" to false, "message" to "AR session is not running")
      }
      if (!sessionManager.anchorManager.isResolved) {
        return@AsyncFunction mapOf("success" to false, "message" to "No anchor resolved")
      }

      val worldPos = sessionManager.anchorManager.localToWorld(localX, 0.0, localZ)
        ?: return@AsyncFunction mapOf("success" to false, "message" to "Transform failed")

      val floorY = sessionManager.floorPlaneY ?: worldPos["y"] ?: 0.0
      val floorLocked = sessionManager.floorPlaneY != null

      mapOf(
        "success" to true,
        "worldPosition" to mapOf(
          "x" to (worldPos["x"] ?: 0.0),
          "y" to floorY,
          "z" to (worldPos["z"] ?: 0.0)
        ),
        "localPosition" to mapOf(
          "x" to localX,
          "y" to 0.0,
          "z" to localZ
        ),
        "floorLocked" to floorLocked,
        "rotationY" to rotationY
      )
    }

    OnDestroy {
      sessionManager.stop()
    }
  }
}
