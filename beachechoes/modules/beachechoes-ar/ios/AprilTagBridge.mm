#import "AprilTagBridge.h"

#include "apriltag.h"
#include "tag36h11.h"
#include "apriltag_pose.h"
#include "common/image_u8.h"

@implementation AprilTagResult
@end

@interface AprilTagBridge () {
    apriltag_detector_t *_detector;
    apriltag_family_t *_tagFamily;
}
@end

@implementation AprilTagBridge

- (instancetype)init {
    self = [super init];
    if (self) {
        _tagFamily = tag36h11_create();
        _detector = apriltag_detector_create();
        apriltag_detector_add_family(_detector, _tagFamily);

        // Tuned for mobile: favour speed over maximum detection range
        _detector->quad_decimate = 2.0f;
        _detector->quad_sigma = 0.0f;
        _detector->nthreads = 2;
        _detector->refine_edges = true;
    }
    return self;
}

- (void)dealloc {
    if (_detector) {
        apriltag_detector_destroy(_detector);
        _detector = NULL;
    }
    if (_tagFamily) {
        tag36h11_destroy(_tagFamily);
        _tagFamily = NULL;
    }
}

- (NSArray<AprilTagResult *> *)detectTags:(CVPixelBufferRef)pixelBuffer
                                       fx:(double)fx
                                       fy:(double)fy
                                       cx:(double)cx
                                       cy:(double)cy
                                  tagSize:(double)tagSize {
    CVPixelBufferLockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);

    // Y plane of the YUV buffer is already grayscale
    uint8_t *baseAddress = (uint8_t *)CVPixelBufferGetBaseAddressOfPlane(pixelBuffer, 0);
    int width  = (int)CVPixelBufferGetWidthOfPlane(pixelBuffer, 0);
    int height = (int)CVPixelBufferGetHeightOfPlane(pixelBuffer, 0);
    int stride = (int)CVPixelBufferGetBytesPerRowOfPlane(pixelBuffer, 0);

    // Wrap buffer — no copy
    image_u8_t im = {
        .width  = width,
        .height = height,
        .stride = stride,
        .buf    = baseAddress
    };

    zarray_t *detections = apriltag_detector_detect(_detector, &im);

    NSMutableArray<AprilTagResult *> *results = [NSMutableArray array];

    for (int i = 0; i < zarray_size(detections); i++) {
        apriltag_detection_t *det;
        zarray_get(detections, i, &det);

        AprilTagResult *result = [[AprilTagResult alloc] init];
        result.tagId = det->id;
        result.centerX = det->c[0];
        result.centerY = det->c[1];
        result.hamming = det->hamming;
        result.decisionMargin = det->decision_margin;

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

        // Build 4x4 column-major transform
        NSMutableArray<NSNumber *> *matrix = [NSMutableArray arrayWithCapacity:16];
        for (int col = 0; col < 4; col++) {
            for (int row = 0; row < 4; row++) {
                double val = 0;
                if (col < 3 && row < 3) {
                    val = matd_get(pose.R, row, col);
                } else if (col == 3 && row < 3) {
                    val = matd_get(pose.t, row, 0);
                } else if (col == 3 && row == 3) {
                    val = 1.0;
                }
                [matrix addObject:@(val)];
            }
        }
        result.poseMatrix = matrix;

        matd_destroy(pose.R);
        matd_destroy(pose.t);

        [results addObject:result];
    }

    apriltag_detections_destroy(detections);
    CVPixelBufferUnlockBaseAddress(pixelBuffer, kCVPixelBufferLock_ReadOnly);

    return results;
}

@end
