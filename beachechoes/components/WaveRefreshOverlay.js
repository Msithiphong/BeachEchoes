import React, { forwardRef, useImperativeHandle, useRef } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

const WaveRefreshOverlay = forwardRef(function WaveRefreshOverlay(_, ref) {
  const travel = useRef(new Animated.Value(0)).current
  const opacity = useRef(new Animated.Value(0)).current
  const running = useRef(false)

  useImperativeHandle(ref, () => ({
    trigger: () => {
      if (running.current) return
      running.current = true
      travel.setValue(0)
      opacity.setValue(0)

      Animated.sequence([
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 180,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(travel, {
            toValue: 1,
            duration: 580,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 460,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(travel, {
            toValue: 0,
            duration: 460,
            easing: Easing.inOut(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        running.current = false
      })
    },
  }))

  const waveOneTranslateY = travel.interpolate({
    inputRange: [0, 1],
    outputRange: [-380, 240],
  })
  const waveTwoTranslateY = travel.interpolate({
    inputRange: [0, 1],
    outputRange: [-440, 170],
  })

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.waveWrap,
          { opacity: opacity.interpolate({ inputRange: [0, 1], outputRange: [0, 0.68] }) },
        ]}
      >
        <Animated.View style={[styles.wave, { transform: [{ translateY: waveOneTranslateY }] }]}>
          <LinearGradient
            colors={['rgba(214,247,255,0.0)', 'rgba(155,237,255,0.7)', 'rgba(10,125,161,0.3)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.waveGradient}
          />
        </Animated.View>
        <Animated.View style={[styles.waveSecondary, { transform: [{ translateY: waveTwoTranslateY }] }]}>
          <LinearGradient
            colors={['rgba(250,253,255,0)', 'rgba(173,236,255,0.62)', 'rgba(10,88,129,0.25)']}
            start={{ x: 0.2, y: 0 }}
            end={{ x: 0.8, y: 1 }}
            style={styles.waveGradient}
          />
        </Animated.View>
      </Animated.View>
    </View>
  )
})

const styles = StyleSheet.create({
  waveWrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  wave: {
    position: 'absolute',
    top: -330,
    left: -80,
    right: -80,
    height: 520,
    borderBottomLeftRadius: 280,
    borderBottomRightRadius: 280,
    overflow: 'hidden',
  },
  waveSecondary: {
    position: 'absolute',
    top: -360,
    left: -40,
    right: -40,
    height: 470,
    borderBottomLeftRadius: 240,
    borderBottomRightRadius: 240,
    overflow: 'hidden',
  },
  waveGradient: {
    flex: 1,
  },
})

export default WaveRefreshOverlay
