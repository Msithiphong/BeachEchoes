import React, { forwardRef, useImperativeHandle, useRef } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'

const GRID_POINTS = [
  { x: 10, y: 15 }, { x: 30, y: 15 }, { x: 50, y: 15 }, { x: 70, y: 15 }, { x: 90, y: 15 },
  { x: 10, y: 35 }, { x: 30, y: 35 }, { x: 50, y: 35 }, { x: 70, y: 35 }, { x: 90, y: 35 },
  { x: 10, y: 55 }, { x: 30, y: 55 }, { x: 50, y: 55 }, { x: 70, y: 55 }, { x: 90, y: 55 },
  { x: 10, y: 75 }, { x: 30, y: 75 }, { x: 50, y: 75 }, { x: 70, y: 75 }, { x: 90, y: 75 },
]

const REFRESH_CENTER = { x: 86, y: 12 }

function distanceFromRefresh(point) {
  const dx = point.x - REFRESH_CENTER.x
  const dy = point.y - REFRESH_CENTER.y
  return Math.sqrt(dx * dx + dy * dy)
}

const orderedIndices = GRID_POINTS
  .map((point, index) => ({ index, dist: distanceFromRefresh(point) }))
  .sort((a, b) => a.dist - b.dist)
  .map(item => item.index)

const RefreshGridRippleOverlay = forwardRef(function RefreshGridRippleOverlay(_, ref) {
  const nodeValues = useRef(GRID_POINTS.map(() => new Animated.Value(0))).current
  const running = useRef(false)

  useImperativeHandle(ref, () => ({
    trigger: () => {
      if (running.current) return
      running.current = true
      nodeValues.forEach(v => v.setValue(0))
      const waveAnimations = orderedIndices.map((pointIndex, order) =>
        Animated.sequence([
          Animated.delay(order * 22),
          Animated.timing(nodeValues[pointIndex], {
            toValue: 1,
            duration: 180,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
          }),
          Animated.timing(nodeValues[pointIndex], {
            toValue: 0,
            duration: 220,
            easing: Easing.in(Easing.quad),
            useNativeDriver: false,
          }),
        ])
      )

      Animated.parallel(waveAnimations).start(() => {
        running.current = false
      })
    },
  }))

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {GRID_POINTS.map((point, idx) => (
        <Animated.View
          key={`${point.x}-${point.y}-${idx}`}
          style={[
            styles.node,
            {
              left: `${point.x}%`,
              top: `${point.y}%`,
              opacity: nodeValues[idx].interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.75],
              }),
              transform: [
                {
                  scale: nodeValues[idx].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.45, 1.4],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  )
})

const styles = StyleSheet.create({
  node: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(199, 246, 255, 0.95)',
    marginLeft: -5,
    marginTop: -5,
  },
})

export default RefreshGridRippleOverlay
