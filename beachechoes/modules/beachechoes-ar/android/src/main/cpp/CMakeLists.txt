cmake_minimum_required(VERSION 3.22.1)
project(apriltag_jni C CXX)

set(APRILTAG_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../../../vendor/apriltag")

file(GLOB APRILTAG_CORE_SRCS
  "${APRILTAG_DIR}/apriltag.c"
  "${APRILTAG_DIR}/apriltag_pose.c"
  "${APRILTAG_DIR}/apriltag_quad_thresh.c"
  "${APRILTAG_DIR}/tag36h11.c"
)

file(GLOB APRILTAG_COMMON_SRCS
  "${APRILTAG_DIR}/common/g2d.c"
  "${APRILTAG_DIR}/common/getopt.c"
  "${APRILTAG_DIR}/common/homography.c"
  "${APRILTAG_DIR}/common/image_u8.c"
  "${APRILTAG_DIR}/common/image_u8x3.c"
  "${APRILTAG_DIR}/common/image_u8x4.c"
  "${APRILTAG_DIR}/common/matd.c"
  "${APRILTAG_DIR}/common/pam.c"
  "${APRILTAG_DIR}/common/pjpeg.c"
  "${APRILTAG_DIR}/common/pjpeg-idct.c"
  "${APRILTAG_DIR}/common/pnm.c"
  "${APRILTAG_DIR}/common/string_util.c"
  "${APRILTAG_DIR}/common/svd22.c"
  "${APRILTAG_DIR}/common/time_util.c"
  "${APRILTAG_DIR}/common/unionfind.c"
  "${APRILTAG_DIR}/common/workerpool.c"
  "${APRILTAG_DIR}/common/zarray.c"
  "${APRILTAG_DIR}/common/zhash.c"
  "${APRILTAG_DIR}/common/zmaxheap.c"
  "${APRILTAG_DIR}/common/image_u8_parallel.c"
  "${APRILTAG_DIR}/common/pthreads_cross.c"
)

add_library(apriltag_jni SHARED
  apriltag_jni.cpp
  ${APRILTAG_CORE_SRCS}
  ${APRILTAG_COMMON_SRCS}
)

target_include_directories(apriltag_jni PRIVATE
  "${APRILTAG_DIR}"
  "${APRILTAG_DIR}/common"
)

find_library(log-lib log)
target_link_libraries(apriltag_jni ${log-lib})
