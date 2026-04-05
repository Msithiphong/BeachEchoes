package com.csithiphong.beachechoes.ar

import java.nio.ByteBuffer

class AprilTagNativeDetector {
  private var nativeHandle: Long = 0L

  fun start() {
    if (!isNativeLibraryLoaded) return
    if (nativeHandle != 0L) return
    nativeHandle = nativeCreateDetector("tag36h11")
    if (nativeHandle == 0L) return
  }

  fun stop() {
    if (nativeHandle == 0L) return
    nativeDestroyDetector(nativeHandle)
    nativeHandle = 0L
  }

  fun detect(
    yPlaneBuffer: ByteBuffer,
    width: Int,
    height: Int,
    rowStride: Int
  ): List<AprilTagDetection> {
    if (nativeHandle == 0L) return emptyList()
    if (!yPlaneBuffer.isDirect || width <= 0 || height <= 0 || rowStride <= 0) {
      return emptyList()
    }
    val packed = nativeDetect(nativeHandle, yPlaneBuffer, width, height, rowStride)
    if (packed.isEmpty()) return emptyList()

    val detections = ArrayList<AprilTagDetection>(packed.size / FIELDS_PER_DETECTION)
    var idx = 0
    while (idx + (FIELDS_PER_DETECTION - 1) < packed.size) {
      detections.add(
        AprilTagDetection(
          id = packed[idx].toInt(),
          centerX = packed[idx + 1].toDouble(),
          centerY = packed[idx + 2].toDouble(),
          decisionMargin = packed[idx + 3].toDouble(),
          hamming = packed[idx + 4].toInt()
        )
      )
      idx += FIELDS_PER_DETECTION
    }
    return detections
  }

  private external fun nativeCreateDetector(familyName: String): Long
  private external fun nativeDestroyDetector(handle: Long)
  private external fun nativeDetect(
    handle: Long,
    yPlaneBuffer: ByteBuffer,
    width: Int,
    height: Int,
    rowStride: Int
  ): FloatArray

  data class AprilTagDetection(
    val id: Int,
    val centerX: Double,
    val centerY: Double,
    val decisionMargin: Double,
    val hamming: Int
  )

  companion object {
    private const val FIELDS_PER_DETECTION = 5
    private val isNativeLibraryLoaded: Boolean = try {
      System.loadLibrary("apriltag_jni")
      true
    } catch (_: UnsatisfiedLinkError) {
      false
    }
  }
}
