import ARKit

/// Wraps AprilTagBridge and adds multi-frame pose smoothing / stability gating.
class AprilTagDetector {

  /// Minimum consecutive frames a tag must be seen before it is considered stable.
  private let requiredStableFrames = 5
  /// Exponential moving average factor for pose smoothing (0–1, higher = less smoothing).
  private let smoothingAlpha: Double = 0.3
  /// Default tag size in meters (6 inches ≈ 0.1524 m).
  private let tagSizeMeters: Double = 0.1524

  private let bridge = AprilTagBridge()

  /// Per-tag tracking state for stability.
  private var tagHistory: [Int: TagTrack] = [:]

  struct TagTrack {
    var consecutiveFrames: Int = 0
    var smoothedPose: [Double]  // 16-element column-major 4x4
    var lastCenter: (x: Double, y: Double)
  }

  struct StableDetection {
    let tagId: Int
    let poseMatrix: [Double]  // 16-element column-major 4x4
    let centerX: Double
    let centerY: Double
    let hamming: Int
    let decisionMargin: Float
    let consecutiveFrames: Int
    let isNewlyStable: Bool
  }

  /// Run detection on an ARFrame and return stable detections.
  func detect(frame: ARFrame) -> [StableDetection] {
    let pixelBuffer = frame.capturedImage
    let intrinsics = frame.camera.intrinsics

    let fx = Double(intrinsics[0][0])
    let fy = Double(intrinsics[1][1])
    let cx = Double(intrinsics[2][0])
    let cy = Double(intrinsics[2][1])

    let rawResults = bridge.detectTags(
      pixelBuffer,
      fx: fx, fy: fy, cx: cx, cy: cy,
      tagSize: tagSizeMeters
    )

    var currentTagIds = Set<Int>()
    var stableDetections: [StableDetection] = []

    for result in rawResults {
      let tagId = Int(result.tagId)
      currentTagIds.insert(tagId)

      let pose = result.poseMatrix.map { $0.doubleValue }

      if var track = tagHistory[tagId] {
        track.consecutiveFrames += 1
        track.smoothedPose = smoothPose(previous: track.smoothedPose, current: pose)
        track.lastCenter = (x: result.centerX, y: result.centerY)
        tagHistory[tagId] = track

        let isNewlyStable = track.consecutiveFrames == requiredStableFrames

        if track.consecutiveFrames >= requiredStableFrames {
          stableDetections.append(StableDetection(
            tagId: tagId,
            poseMatrix: track.smoothedPose,
            centerX: result.centerX,
            centerY: result.centerY,
            hamming: Int(result.hamming),
            decisionMargin: result.decisionMargin,
            consecutiveFrames: track.consecutiveFrames,
            isNewlyStable: isNewlyStable
          ))
        }
      } else {
        // First time seeing this tag
        tagHistory[tagId] = TagTrack(
          consecutiveFrames: 1,
          smoothedPose: pose,
          lastCenter: (x: result.centerX, y: result.centerY)
        )
      }
    }

    // Reset tracking for tags not seen this frame
    for existingTagId in tagHistory.keys where !currentTagIds.contains(existingTagId) {
      tagHistory.removeValue(forKey: existingTagId)
    }

    return stableDetections
  }

  /// Exponential moving average of each matrix element.
  private func smoothPose(previous: [Double], current: [Double]) -> [Double] {
    guard previous.count == 16 && current.count == 16 else { return current }
    return zip(previous, current).map { prev, cur in
      prev * (1.0 - smoothingAlpha) + cur * smoothingAlpha
    }
  }

  /// Reset all tracking state (e.g. when session restarts).
  func reset() {
    tagHistory.removeAll()
  }
}
