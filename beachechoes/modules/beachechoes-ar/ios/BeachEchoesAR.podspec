require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'BeachEchoesAR'
  s.version        = package['version']
  s.summary        = 'AR module for BeachEchoes'
  s.description    = 'Custom Expo native module for AR and AprilTag functionality'
  s.author         = package['author'] || 'BeachEchoes'
  s.homepage       = 'https://github.com/csithiphong/beachechoes'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = [
    '*.{h,m,mm,swift}',
    'apriltag/*.{c,h}',
    'apriltag/common/*.{c,h}'
  ]

  s.private_header_files = [
    'apriltag/*.h',
    'apriltag/common/*.h'
  ]

  s.header_mappings_dir = '.'

  s.exclude_files = [
    'apriltag/apriltag_pywrap.c'
  ]

  s.pod_target_xcconfig = {
    'HEADER_SEARCH_PATHS' => '"${PODS_TARGET_SRCROOT}/apriltag" "${PODS_TARGET_SRCROOT}/apriltag/common"',
    'GCC_WARN_INHIBIT_ALL_WARNINGS' => 'YES',
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++17'
  }
end
