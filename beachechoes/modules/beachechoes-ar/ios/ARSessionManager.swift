import ARKit
import ExpoModulesCore

/// Manages the ARKit world tracking session and reports tracking/plane/tag state changes.
class ARSessionManager: NSObject, ARSessionDelegate {
  private var session: ARSession?
  private var sendEvent: ((String, [String: Any]) -> Void)?
  private var hasDetectedFloor = false
  private(set) var floorPlaneY: Double?

  private let tagDetector = AprilTagDetector()
  let anchorManager = AnchorManager()
  /// Throttle: skip frames to keep CPU usage reasonable.
  private var frameCount: Int = 0
  private let detectEveryNFrames = 3
  private var currentZoneId: String = ""

  /// Start a world-tracking AR session.
  /// - Parameters:
  ///   - zoneId: The zone identifier (stored for future use).
  ///   - eventEmitter: Closure to send events back to JS.
  func start(zoneId: String, eventEmitter: @escaping (String, [String: Any]) -> Void) throws {
    guard ARWorldTrackingConfiguration.isSupported else {
      throw NSError(
        domain: "BeachEchoesAR",
        code: 1,
        userInfo: [NSLocalizedDescriptionKey: "ARKit world tracking is not supported on this device."]
      )
    }

    stop()

    let session = ARSession()
    session.delegate = self
    self.session = session
    self.sendEvent = eventEmitter
    self.currentZoneId = zoneId
    anchorManager.configure(eventEmitter: eventEmitter)

    let config = ARWorldTrackingConfiguration()
    config.planeDetection = [.horizontal]
    session.run(config)

    eventEmitter("onPlaneStateChanged", [
      "state": "searching",
      "planeCount": 0
    ])
  }

  /// Pause and tear down the current AR session.
  func stop() {
    session?.pause()
    session?.delegate = nil
    session = nil
    sendEvent = nil
    hasDetectedFloor = false
    floorPlaneY = nil
    tagDetector.reset()
    anchorManager.reset()
    frameCount = 0
    currentZoneId = ""
  }

  var isRunning: Bool {
    return session != nil
  }

  // MARK: - ARSessionDelegate

  func session(_ session: ARSession, cameraDidChangeTrackingState camera: ARCamera) {
    let (state, reason) = trackingInfo(from: camera.trackingState)
    sendEvent?("onTrackingStateChanged", [
      "state": state,
      "reason": reason
    ])
  }

  func session(_ session: ARSession, didFailWithError error: Error) {
    sendEvent?("onTrackingStateChanged", [
      "state": "notAvailable",
      "reason": error.localizedDescription
    ])
  }

  func sessionWasInterrupted(_ session: ARSession) {
    sendEvent?("onTrackingStateChanged", [
      "state": "interrupted",
      "reason": "Session was interrupted"
    ])
  }

  func sessionInterruptionEnded(_ session: ARSession) {
    sendEvent?("onTrackingStateChanged", [
      "state": "resuming",
      "reason": "Interruption ended"
    ])
  }

  // MARK: - Plane Detection

  func session(_ session: ARSession, didAdd anchors: [ARAnchor]) {
    updatePlaneState(session: session)
  }

  func session(_ session: ARSession, didUpdate anchors: [ARAnchor]) {
    updatePlaneState(session: session)
  }

  func session(_ session: ARSession, didRemove anchors: [ARAnchor]) {
    updatePlaneState(session: session)
  }

  private func updatePlaneState(session: ARSession) {
    let planeAnchors = session.currentFrame?.anchors.compactMap { $0 as? ARPlaneAnchor } ?? []
    let horizontalPlanes = planeAnchors.filter { $0.alignment == .horizontal }
    let count = horizontalPlanes.count
    let floorDetected = count > 0

    // Track the lowest horizontal plane Y as floor
    if let lowestPlane = horizontalPlanes.min(by: { $0.transform.columns.3.y < $1.transform.columns.3.y }) {
      floorPlaneY = Double(lowestPlane.transform.columns.3.y)
    }

    // Only emit when state changes
    if floorDetected != hasDetectedFloor {
      hasDetectedFloor = floorDetected
      sendEvent?("onPlaneStateChanged", [
        "state": floorDetected ? "detected" : "searching",
        "planeCount": count
      ])
    }
  }

  // MARK: - AprilTag Detection (per-frame)

  func session(_ session: ARSession, didUpdate frame: ARFrame) {
    frameCount += 1
    guard frameCount % detectEveryNFrames == 0 else { return }
    guard case .normal = frame.camera.trackingState else { return }

    let stableDetections = tagDetector.detect(frame: frame)

    for det in stableDetections {
      if det.isNewlyStable {
        NSLog("[BeachEchoesAR] Tag %d newly stable after %d frames", det.tagId, det.consecutiveFrames)
      }
      sendEvent?("onAprilTagDetected", [
        "tagId": det.tagId,
        "poseMatrix": det.poseMatrix,
        "centerX": det.centerX,
        "centerY": det.centerY,
        "hamming": det.hamming,
        "decisionMargin": det.decisionMargin,
        "consecutiveFrames": det.consecutiveFrames,
        "isNewlyStable": det.isNewlyStable
      ])

      // Auto-resolve anchor on first stable detection if not already resolved
      if det.isNewlyStable && !anchorManager.isResolved {
        anchorManager.resolve(tagId: det.tagId, zoneId: currentZoneId, poseMatrix: det.poseMatrix)
      }
    }
  }

  // MARK: - Helpers

  private func trackingInfo(from state: ARCamera.TrackingState) -> (String, String) {
    switch state {
    case .notAvailable:
      return ("notAvailable", "Tracking not available")
    case .limited(let reason):
      switch reason {
      case .initializing:
        return ("limited", "Initializing AR session")
      case .excessiveMotion:
        return ("limited", "Device is moving too fast")
      case .insufficientFeatures:
        return ("limited", "Not enough visual features")
      case .relocalizing:
        return ("limited", "Relocalizing")
      @unknown default:
        return ("limited", "Unknown reason")
      }
    case .normal:
      return ("normal", "Tracking is normal")
    }
  }
}
