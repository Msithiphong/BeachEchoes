#import <Foundation/Foundation.h>
#import <CoreVideo/CoreVideo.h>

NS_ASSUME_NONNULL_BEGIN

@interface AprilTagResult : NSObject
@property (nonatomic) int tagId;
@property (nonatomic) double centerX;
@property (nonatomic) double centerY;
@property (nonatomic) int hamming;
@property (nonatomic) float decisionMargin;
/// 4x4 column-major transform matrix (camera-to-tag pose)
@property (nonatomic, strong) NSArray<NSNumber *> *poseMatrix;
@end

@interface AprilTagBridge : NSObject
- (instancetype)init;
/// Detect AprilTags in a YUV pixel buffer (uses Y plane as grayscale).
- (NSArray<AprilTagResult *> *)detectTags:(CVPixelBufferRef)pixelBuffer
                                       fx:(double)fx
                                       fy:(double)fy
                                       cx:(double)cx
                                       cy:(double)cy
                                  tagSize:(double)tagSize;
@end

NS_ASSUME_NONNULL_END
