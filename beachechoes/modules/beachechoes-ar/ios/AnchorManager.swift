import Foundation

/// Manages the resolved AprilTag anchor for a zone.
/// Stores the tag's world-space pose and provides local-to-world coordinate transforms.
class AnchorManager {
  
  struct ResolvedAnchor {
    let tagId: Int
    let zoneId: String
    /// 16-element column-major 4×4 transform (tag pose in AR world space)
    let poseMatrix: [Double]
  }
  
  private(set) var currentAnchor: ResolvedAnchor?
  private var sendEvent: ((String, [String: Any]) -> Void)?
  
  func configure(eventEmitter: @escaping (String, [String: Any]) -> Void) {
    self.sendEvent = eventEmitter
  }
  
  /// Resolve a stable tag detection as the zone anchor.
  /// Returns true if the anchor was resolved (or updated), false if inputs are invalid.
  @discardableResult
  func resolve(tagId: Int, zoneId: String, poseMatrix: [Double]) -> Bool {
    guard poseMatrix.count == 16 else { return false }
    
    let anchor = ResolvedAnchor(tagId: tagId, zoneId: zoneId, poseMatrix: poseMatrix)
    currentAnchor = anchor
    NSLog("[BeachEchoesAR] Anchor resolved — tag: %d, zone: %@", tagId, zoneId)
    
    sendEvent?("onAnchorResolved", [
      "tagId": tagId,
      "zoneId": zoneId,
      "poseMatrix": poseMatrix
    ])
    
    return true
  }
  
  /// Convert a local offset (relative to the tag anchor) into AR world coordinates.
  /// Local X = right, local Y = up, local Z = forward (away from tag face).
  /// Returns nil if no anchor is resolved.
  func localToWorld(x: Double, y: Double, z: Double) -> [String: Double]? {
    guard let anchor = currentAnchor else { return nil }
    let m = anchor.poseMatrix
    
    // 4×4 column-major matrix multiplication: worldPos = anchorPose × localOffset
    // Column 0: right (m[0], m[1], m[2])
    // Column 1: up    (m[4], m[5], m[6])
    // Column 2: fwd   (m[8], m[9], m[10])
    // Column 3: pos   (m[12], m[13], m[14])
    let worldX = m[0] * x + m[4] * y + m[8]  * z + m[12]
    let worldY = m[1] * x + m[5] * y + m[9]  * z + m[13]
    let worldZ = m[2] * x + m[6] * y + m[10] * z + m[14]
    
    return ["x": worldX, "y": worldY, "z": worldZ]
  }
  
  /// Reset the anchor (e.g. when the session stops or user requests recalibration).
  func reset() {
    currentAnchor = nil
  }
  
  var isResolved: Bool {
    return currentAnchor != nil
  }
}
