#include <jni.h>
#include <android/log.h>
#include <cstring>
#include <cstdlib>

extern "C" {
#include "apriltag.h"
#include "tag36h11.h"
#include "apriltag_pose.h"
#include "common/image_u8.h"
}

#define LOG_TAG "AprilTagJNI"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

static apriltag_detector_t *detector = nullptr;
static apriltag_family_t *tagFamily = nullptr;

extern "C" {

JNIEXPORT void JNICALL
Java_expo_modules_beachechoesar_AprilTagJNI_nativeInit(JNIEnv *env, jobject /* this */) {
    if (detector != nullptr) return;

    tagFamily = tag36h11_create();
    detector = apriltag_detector_create();
    apriltag_detector_add_family(detector, tagFamily);

    detector->quad_decimate = 2.0f;
    detector->quad_sigma = 0.0f;
    detector->nthreads = 2;
    detector->refine_edges = true;

    LOGI("AprilTag detector initialised (tag36h11)");
}

JNIEXPORT void JNICALL
Java_expo_modules_beachechoesar_AprilTagJNI_nativeDestroy(JNIEnv *env, jobject /* this */) {
    if (detector) {
        apriltag_detector_destroy(detector);
        detector = nullptr;
    }
    if (tagFamily) {
        tag36h11_destroy(tagFamily);
        tagFamily = nullptr;
    }
    LOGI("AprilTag detector destroyed");
}

/**
 * Detect AprilTags in a grayscale image.
 *
 * @param grayscale  byte[] of Y-plane pixels
 * @param width      image width
 * @param height     image height
 * @param fx, fy, cx, cy  camera intrinsics (pixels)
 * @param tagSize    physical tag size in metres
 * @return float[][] — each inner array is:
 *   [tagId, centerX, centerY, hamming, decisionMargin, m0..m15]
 *   where m0..m15 is the 4x4 column-major camera-to-tag pose matrix
 */
JNIEXPORT jobjectArray JNICALL
Java_expo_modules_beachechoesar_AprilTagJNI_nativeDetect(
    JNIEnv *env, jobject /* this */,
    jbyteArray grayscale, jint width, jint height,
    jdouble fx, jdouble fy, jdouble cx, jdouble cy,
    jdouble tagSize)
{
    if (!detector) {
        LOGE("Detector not initialised");
        return env->NewObjectArray(0, env->FindClass("[F"), nullptr);
    }

    jbyte *data = env->GetByteArrayElements(grayscale, nullptr);

    image_u8_t im = {
        .width  = width,
        .height = height,
        .stride = width,
        .buf    = reinterpret_cast<uint8_t *>(data)
    };

    zarray_t *detections = apriltag_detector_detect(detector, &im);
    int count = zarray_size(detections);

    // Each result has 5 scalars + 16 matrix values = 21 floats
    jclass floatArrayClass = env->FindClass("[F");
    jobjectArray results = env->NewObjectArray(count, floatArrayClass, nullptr);

    for (int i = 0; i < count; i++) {
        apriltag_detection_t *det;
        zarray_get(detections, i, &det);

        // Pose estimation
        apriltag_detection_info_t info;
        info.det     = det;
        info.tagsize = tagSize;
        info.fx = fx;
        info.fy = fy;
        info.cx = cx;
        info.cy = cy;

        apriltag_pose_t pose;
        estimate_tag_pose(&info, &pose);

        // Pack: [tagId, cX, cY, hamming, decisionMargin, m0..m15]
        jfloatArray row = env->NewFloatArray(21);
        float buf[21];
        buf[0] = static_cast<float>(det->id);
        buf[1] = static_cast<float>(det->c[0]);
        buf[2] = static_cast<float>(det->c[1]);
        buf[3] = static_cast<float>(det->hamming);
        buf[4] = det->decision_margin;

        // 4x4 column-major
        for (int col = 0; col < 4; col++) {
            for (int row_i = 0; row_i < 4; row_i++) {
                int idx = 5 + col * 4 + row_i;
                if (col < 3 && row_i < 3)
                    buf[idx] = static_cast<float>(matd_get(pose.R, row_i, col));
                else if (col == 3 && row_i < 3)
                    buf[idx] = static_cast<float>(matd_get(pose.t, row_i, 0));
                else if (col == 3 && row_i == 3)
                    buf[idx] = 1.0f;
                else
                    buf[idx] = 0.0f;
            }
        }
        env->SetFloatArrayRegion(row, 0, 21, buf);
        env->SetObjectArrayElement(results, i, row);

        matd_destroy(pose.R);
        matd_destroy(pose.t);
    }

    apriltag_detections_destroy(detections);
    env->ReleaseByteArrayElements(grayscale, data, JNI_ABORT);

    return results;
}

} // extern "C"
