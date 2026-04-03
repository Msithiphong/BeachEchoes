package expo.modules.beachechoesar

/**
 * JNI bridge to the native AprilTag C library.
 */
object AprilTagJNI {
    init {
        System.loadLibrary("apriltag_jni")
    }

    external fun nativeInit()
    external fun nativeDestroy()

    /**
     * Detect AprilTags in a grayscale image.
     *
     * @param grayscale Y-plane pixel data
     * @param width     image width
     * @param height    image height
     * @param fx, fy, cx, cy  camera intrinsics in pixels
     * @param tagSize   physical tag size in metres
     * @return Array of float arrays. Each: [tagId, cX, cY, hamming, decisionMargin, m0..m15]
     */
    external fun nativeDetect(
        grayscale: ByteArray,
        width: Int,
        height: Int,
        fx: Double,
        fy: Double,
        cx: Double,
        cy: Double,
        tagSize: Double
    ): Array<FloatArray>
}
