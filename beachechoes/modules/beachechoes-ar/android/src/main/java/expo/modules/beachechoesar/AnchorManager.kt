package expo.modules.beachechoesar

/**
 * Manages the resolved AprilTag anchor for a zone.
 * Stores the tag's world-space pose and provides local-to-world coordinate transforms.
 */
class AnchorManager {

  data class ResolvedAnchor(
    val tagId: Int,
    val zoneId: String,
    /** 16-element column-major 4×4 transform (tag pose in AR world space) */
    val poseMatrix: DoubleArray
  )

  var currentAnchor: ResolvedAnchor? = null
    private set

  private var sendEvent: ((String, Map<String, Any>) -> Unit)? = null

  fun configure(eventEmitter: (String, Map<String, Any>) -> Unit) {
    sendEvent = eventEmitter
  }

  /**
   * Resolve a stable tag detection as the zone anchor.
   * Returns true if the anchor was resolved, false if inputs are invalid.
   */
  fun resolve(tagId: Int, zoneId: String, poseMatrix: List<Double>): Boolean {
    if (poseMatrix.size != 16) return false

    val anchor = ResolvedAnchor(tagId, zoneId, poseMatrix.toDoubleArray())
    currentAnchor = anchor

    sendEvent?.invoke("onAnchorResolved", mapOf(
      "tagId" to tagId,
      "zoneId" to zoneId,
      "poseMatrix" to poseMatrix
    ))

    return true
  }

  /**
   * Convert a local offset (relative to the tag anchor) into AR world coordinates.
   * Local X = right, local Y = up, local Z = forward (away from tag face).
   * Returns null if no anchor is resolved.
   */
  fun localToWorld(x: Double, y: Double, z: Double): Map<String, Double>? {
    val anchor = currentAnchor ?: return null
    val m = anchor.poseMatrix

    // 4×4 column-major matrix multiplication: worldPos = anchorPose × localOffset
    val worldX = m[0] * x + m[4] * y + m[8]  * z + m[12]
    val worldY = m[1] * x + m[5] * y + m[9]  * z + m[13]
    val worldZ = m[2] * x + m[6] * y + m[10] * z + m[14]

    return mapOf("x" to worldX, "y" to worldY, "z" to worldZ)
  }

  /** Reset the anchor (e.g. when the session stops or user requests recalibration). */
  fun reset() {
    currentAnchor = null
  }

  val isResolved: Boolean
    get() = currentAnchor != null
}
