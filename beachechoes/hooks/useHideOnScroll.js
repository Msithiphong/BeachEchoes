import { useRef } from 'react'
import { Animated } from 'react-native'

/**
 * Build a native-driven scroll handler plus translateY value for collapsible chrome.
 *
 * @param {number} height
 * @returns {{ scrollHandler: Function, navbarTranslateY: Animated.AnimatedInterpolation<number> }}
 */
export default function useHideOnScroll(height) {
  const scrollY = useRef(new Animated.Value(0)).current
  // Clamp movement so the bar never translates farther than its own height.
  const clampedScroll = Animated.diffClamp(scrollY, 0, height)

  const navbarTranslateY = clampedScroll.interpolate({
    inputRange: [0, height],
    outputRange: [0, -height],
    extrapolate: 'clamp',
  })

  const scrollHandler = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  )

  return { scrollHandler, navbarTranslateY }
}
