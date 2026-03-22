package expo.modules.beachechoesar

/**
 * Wraps AprilTagJNI and adds multi-frame pose smoothing / stability gating.
 */
class AprilTagDetector {

    private val requiredStableFrames = 5
    private val smoothingAlpha = 0.3
    /** Default tag size in metres (6 inches ≈ 0.1524 m). */
    private val tagSizeMeters = 0.1524

    private var initialised = false
    private val tagHistory = mutableMapOf<Int, TagTrack>()

    data class TagTrack(
        var consecutiveFrames: Int = 0,
        var smoothedPose: FloatArray,
        var lastCenterX: Float = 0f,
        var lastCenterY: Float = 0f
    )

    data class StableDetection(
        val tagId: Int,
        val poseMatrix: List<Double>,
        val centerX: Double,
        val centerY: Double,
        val hamming: Int,
        val decisionMargin: Float,
        val consecutiveFrames: Int,
        val isNewlyStable: Boolean
    )

    fun init() {
        if (!initialised) {
            AprilTagJNI.nativeInit()
            initialised = true
        }
    }

    fun destroy() {
        if (initialised) {
            AprilTagJNI.nativeDestroy()
            initialised = false
        }
        tagHistory.clear()
    }

    /**
     * Run detection on a grayscale image.
     */
    fun detect(
        grayscale: ByteArray,
        width: Int,
        height: Int,
        fx: Double,
        fy: Double,
        cx: Double,
        cy: Double
    ): List<StableDetection> {
        if (!initialised) return emptyList()

        val rawResults = AprilTagJNI.nativeDetect(
            grayscale, width, height,
            fx, fy, cx, cy,
            tagSizeMeters
        )

        val currentTagIds = mutableSetOf<Int>()
        val stableDetections = mutableListOf<StableDetection>()

        for (row in rawResults) {
            val tagId = row[0].toInt()
            currentTagIds.add(tagId)

            val pose = row.sliceArray(5..20)

            val track = tagHistory[tagId]
            if (track != null) {
                track.consecutiveFrames++
                smoothPose(track.smoothedPose, pose)
                track.lastCenterX = row[1]
                track.lastCenterY = row[2]

                val isNewlyStable = track.consecutiveFrames == requiredStableFrames

                if (track.consecutiveFrames >= requiredStableFrames) {
                    stableDetections.add(StableDetection(
                        tagId = tagId,
                        poseMatrix = track.smoothedPose.map { it.toDouble() },
                        centerX = row[1].toDouble(),
                        centerY = row[2].toDouble(),
                        hamming = row[3].toInt(),
                        decisionMargin = row[4],
                        consecutiveFrames = track.consecutiveFrames,
                        isNewlyStable = isNewlyStable
                    ))
                }
            } else {
                tagHistory[tagId] = TagTrack(
                    consecutiveFrames = 1,
                    smoothedPose = pose.copyOf(),
                    lastCenterX = row[1],
                    lastCenterY = row[2]
                )
            }
        }

        // Remove tags not seen this frame
        tagHistory.keys.retainAll(currentTagIds)

        return stableDetections
    }

    fun reset() {
        tagHistory.clear()
    }

    private fun smoothPose(smoothed: FloatArray, current: FloatArray) {
        for (i in smoothed.indices) {
            smoothed[i] = (smoothed[i] * (1.0 - smoothingAlpha) + current[i] * smoothingAlpha).toFloat()
        }
    }
}
