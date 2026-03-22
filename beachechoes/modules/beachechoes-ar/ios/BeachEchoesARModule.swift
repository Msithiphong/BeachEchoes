import ExpoModulesCore

public class BeachEchoesARModule: Module {
  private let sessionManager = ARSessionManager()

  public func definition() -> ModuleDefinition {
    Name("BeachEchoesAR")

    Events("onTrackingStateChanged", "onPlaneStateChanged", "onAprilTagDetected", "onAnchorResolved")

    AsyncFunction("startARSession") { [weak self] (zoneId: String) -> [String: Any] in
      guard let self else {
        return ["success": false, "message": "Module deallocated"]
      }

      do {
        try self.sessionManager.start(zoneId: zoneId) { [weak self] eventName, body in
          self?.sendEvent(eventName, body)
        }
        return ["success": true, "message": "AR session started"]
      } catch {
        return ["success": false, "message": error.localizedDescription]
      }
    }

    AsyncFunction("stopARSession") { [weak self] () -> [String: Any] in
      self?.sessionManager.stop()
      return ["success": true, "message": "AR session stopped"]
    }

    Function("isSessionRunning") { [weak self] () -> Bool in
      return self?.sessionManager.isRunning ?? false
    }

    AsyncFunction("resolveAnchor") { [weak self] (tagId: Int, poseMatrix: [Double]) -> [String: Any] in
      guard let self else {
        return ["success": false, "message": "Module deallocated"]
      }
      guard self.sessionManager.isRunning else {
        return ["success": false, "message": "AR session is not running"]
      }
      let resolved = self.sessionManager.anchorManager.resolve(
        tagId: tagId,
        zoneId: "manual",
        poseMatrix: poseMatrix
      )
      return ["success": resolved, "message": resolved ? "Anchor resolved" : "Invalid pose matrix"]
    }

    AsyncFunction("localToWorld") { [weak self] (x: Double, y: Double, z: Double) -> [String: Any] in
      guard let self else {
        return ["success": false, "message": "Module deallocated"]
      }
      guard let worldPos = self.sessionManager.anchorManager.localToWorld(x: x, y: y, z: z) else {
        return ["success": false, "message": "No anchor resolved"]
      }
      return [
        "success": true,
        "worldPosition": worldPos
      ]
    }

    Function("isAnchorResolved") { [weak self] () -> Bool in
      return self?.sessionManager.anchorManager.isResolved ?? false
    }

    AsyncFunction("placeEcho") { [weak self] (tagId: Int, localX: Double, localZ: Double, rotationY: Double) -> [String: Any] in
      guard let self else {
        return ["success": false, "message": "Module deallocated"]
      }
      guard self.sessionManager.isRunning else {
        return ["success": false, "message": "AR session is not running"]
      }
      guard self.sessionManager.anchorManager.isResolved else {
        return ["success": false, "message": "No anchor resolved"]
      }

      // Transform local offset to world space
      guard let worldPos = self.sessionManager.anchorManager.localToWorld(x: localX, y: 0, z: localZ) else {
        return ["success": false, "message": "Transform failed"]
      }

      // Snap Y to floor plane if available
      let floorY = self.sessionManager.floorPlaneY ?? worldPos["y"] ?? 0
      let floorLocked = self.sessionManager.floorPlaneY != nil

      return [
        "success": true,
        "worldPosition": [
          "x": worldPos["x"] ?? 0,
          "y": floorY,
          "z": worldPos["z"] ?? 0,
        ],
        "localPosition": [
          "x": localX,
          "y": 0.0,
          "z": localZ,
        ],
        "floorLocked": floorLocked,
        "rotationY": rotationY,
      ]
    }

    OnDestroy {
      self.sessionManager.stop()
    }
  }
}
