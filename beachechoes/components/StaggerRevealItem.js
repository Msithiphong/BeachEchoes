import React, { useEffect, useRef } from 'react'
import { Animated, Easing } from 'react-native'

export default function StaggerRevealItem({ index, total, resetKey, children }) {
  const progress = useRef(new Animated.Value(0)).current

  useEffect(() => {
    progress.setValue(0)
    const center = (total - 1) / 2
    const distanceFromCenter = Math.abs(index - center)
    const delay = Math.round(distanceFromCenter * 45 + index * 10)
    Animated.timing(progress, {
      toValue: 1,
      duration: 430,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start()
  }, [index, progress, resetKey, total])

  return (
    <Animated.View
      style={{
        width: '100%',
        opacity: progress,
        transform: [
          {
            translateY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [14, 0],
            }),
          },
          {
            scale: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0.985, 1],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  )
}
