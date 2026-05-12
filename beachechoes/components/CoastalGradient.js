// Shared animated background that gives screens subtle ambient coastal motion.
import React, { useEffect, useRef } from 'react'
import { Animated, Easing, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useAppTheme } from '../context/AppThemeContext'

export const COASTAL_GRADIENT_COLORS = {
  dark: ['#032b44', '#0f5f7a', '#1ea0a9', '#f2d184'],
  light: ['#78c7f6', '#67d2cb', '#9fe5cb', '#ffe8a2'],
}

export default function CoastalGradient({ children, style }) {
  const { isDark } = useAppTheme()
  const topDrift = useRef(new Animated.Value(0)).current
  const midDrift = useRef(new Animated.Value(0)).current
  const bottomDrift = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const makeLoop = (value, duration, toValue = 1) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      )

    // Independent drift timings keep the background from moving like a single rigid layer.
    const topAnim = makeLoop(topDrift, 7000, 1)
    const midAnim = makeLoop(midDrift, 9000, 1)
    const bottomAnim = makeLoop(bottomDrift, 7800, 1)

    topAnim.start()
    midAnim.start()
    bottomAnim.start()

    return () => {
      topAnim.stop()
      midAnim.stop()
      bottomAnim.stop()
    }
  }, [bottomDrift, midDrift, topDrift])

  return (
    <LinearGradient
      colors={isDark ? COASTAL_GRADIENT_COLORS.dark : COASTAL_GRADIENT_COLORS.light}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[styles.container, style]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ambientBlob,
          styles.blobTop,
          !isDark && styles.blobTopLight,
          {
            transform: [
              {
                translateX: topDrift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -12],
                }),
              },
              {
                translateY: topDrift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 14],
                }),
              },
              {
                scale: topDrift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.05],
                }),
              },
            ],
            opacity: topDrift.interpolate({
              inputRange: [0, 1],
              outputRange: [0.24, 0.34],
            }),
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ambientBlob,
          styles.blobMiddle,
          !isDark && styles.blobMiddleLight,
          {
            transform: [
              {
                translateX: midDrift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 18],
                }),
              },
              {
                translateY: midDrift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -10],
                }),
              },
              {
                scale: midDrift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.04],
                }),
              },
            ],
            opacity: midDrift.interpolate({
              inputRange: [0, 1],
              outputRange: [0.24, 0.31],
            }),
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ambientBlob,
          styles.blobBottom,
          !isDark && styles.blobBottomLight,
          {
            transform: [
              {
                translateX: bottomDrift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -10],
                }),
              },
              {
                translateY: bottomDrift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -14],
                }),
              },
              {
                scale: bottomDrift.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.06],
                }),
              },
            ],
            opacity: bottomDrift.interpolate({
              inputRange: [0, 1],
              outputRange: [0.22, 0.3],
            }),
          },
        ]}
      />
      {children}
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  ambientBlob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blobTop: {
    width: 260,
    height: 260,
    top: -60,
    right: -90,
    backgroundColor: '#7be5ff',
  },
  blobMiddle: {
    width: 300,
    height: 300,
    bottom: 120,
    left: -120,
    backgroundColor: '#0a3a68',
  },
  blobBottom: {
    width: 240,
    height: 240,
    bottom: -70,
    right: -40,
    backgroundColor: '#ffd992',
  },
  blobTopLight: {
    backgroundColor: '#d7f7ff',
  },
  blobMiddleLight: {
    backgroundColor: '#8ad9f4',
  },
  blobBottomLight: {
    backgroundColor: '#fff1c5',
  },
})
