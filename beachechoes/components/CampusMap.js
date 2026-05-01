import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react'
import {
  View,
  Image,
  TouchableWithoutFeedback,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
  Text,
  Alert,
} from 'react-native'
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated'

import { MAP_ASPECT_RATIO } from '../config/campusMap'
import DebugCampusPolygon from './DebugCampusPolygon'

const MAP_IMAGE = require('../assets/images/CSULB Map.png')

// DEBUG: Set EXPO_PUBLIC_DEBUG_SHOW_CAMPUS_POLYGON="true" in .env to show polygon overlay
const SHOW_DEBUG_POLYGON = process.env.EXPO_PUBLIC_DEBUG_SHOW_CAMPUS_POLYGON === 'true'

// DEBUG: Set EXPO_PUBLIC_DEBUG_SHOW_COORDINATES="true" in .env to show tap coordinates
const SHOW_DEBUG_COORDINATES = process.env.EXPO_PUBLIC_DEBUG_SHOW_COORDINATES === 'true'

function CampusMap({ onTap, children, style }, ref) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [zoom, setZoom] = useState(1) // For children props
  const [lastTapCoords, setLastTapCoords] = useState(null) // For debug coordinate display
  
  const horizontalScrollRef = useRef(null)
  const verticalScrollRef = useRef(null)
  
  // Use shared values for pinch-to-zoom
  const scale = useSharedValue(1)
  const baseScale = useSharedValue(1)

  // Sync scale to zoom state for children
  useAnimatedReaction(
    () => scale.value,
    (currentScale) => {
      runOnJS(setZoom)(currentScale)
    }
  )

  function handleLayout(e) {
    const { width } = e.nativeEvent.layout

    setDimensions({
      width,
      height: width / MAP_ASPECT_RATIO,
    })
  }

  const zoomIn = () => {
    const newScale = Math.min(scale.value + 0.25, 3)
    scale.value = withTiming(newScale, { duration: 200 })
    baseScale.value = newScale
  }

  const zoomOut = () => {
    const newScale = Math.max(scale.value - 0.25, 1)
    scale.value = withTiming(newScale, { duration: 200 })
    baseScale.value = newScale
  }

  // Expose centerTo method to parent via ref
  useImperativeHandle(ref, () => ({
    centerTo: ({ x, y, zoom: targetZoom = 2 }) => {
      // First, set the zoom level
      const newScale = Math.min(Math.max(targetZoom, 1), 3)
      scale.value = withTiming(newScale, { duration: 300 })
      baseScale.value = newScale

      // Wait for zoom animation, then scroll to center the coordinates
      setTimeout(() => {
        const scaledWidth = dimensions.width * newScale
        const scaledHeight = dimensions.height * newScale
        
        // Calculate pixel position of the normalized coordinates
        const pixelX = x * scaledWidth
        const pixelY = y * scaledHeight
        
        // Calculate scroll offset to center the point
        // Center means: pixel position - (viewport size / 2)
        const centerOffsetX = pixelX - (dimensions.width / 2)
        const centerOffsetY = pixelY - (dimensions.height / 2)
        
        // Clamp to valid scroll range
        const maxScrollX = Math.max(0, scaledWidth - dimensions.width)
        const maxScrollY = Math.max(0, scaledHeight - dimensions.height)
        
        const scrollX = Math.max(0, Math.min(centerOffsetX, maxScrollX))
        const scrollY = Math.max(0, Math.min(centerOffsetY, maxScrollY))
        
        // Scroll to calculated positions
        horizontalScrollRef.current?.scrollTo({ x: scrollX, animated: true })
        verticalScrollRef.current?.scrollTo({ y: scrollY, animated: true })
      }, 350) // Slightly longer than zoom animation to ensure it's complete
    },
  }))

  // Pinch gesture using modern Gesture API
  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      baseScale.value = scale.value
    })
    .onUpdate((event) => {
      const newScale = Math.min(Math.max(baseScale.value * event.scale, 1), 3)
      scale.value = newScale
    })
    .onEnd(() => {
      baseScale.value = scale.value
    })

  // Animated style for the map content
  const animatedStyle = useAnimatedStyle(() => {
    const scaledWidth = dimensions.width * scale.value
    const scaledHeight = dimensions.height * scale.value
    
    return {
      width: scaledWidth,
      height: scaledHeight,
    }
  })

  const scaledWidth = dimensions.width * zoom
  const scaledHeight = dimensions.height * zoom

  function handlePress(e) {
    if (dimensions.width === 0) return

    const { locationX, locationY } = e.nativeEvent

    const normalizedCoords = {
      x: Math.min(1, Math.max(0, locationX / scaledWidth)),
      y: Math.min(1, Math.max(0, locationY / scaledHeight)),
    }

    // Store coordinates for debug display
    if (SHOW_DEBUG_COORDINATES) {
      setLastTapCoords(normalizedCoords)
    }

    // Call parent callback if provided
    if (onTap) {
      onTap(normalizedCoords)
    }
  }

  return (
    <View
      style={[
        styles.container,
        {
          height: dimensions.height > 0 ? dimensions.height : undefined,
        },
        style,
      ]}
      onLayout={handleLayout}
    >
      {dimensions.width > 0 ? (
        <GestureHandlerRootView style={{ flex: 1 }}>
          <ScrollView
            ref={horizontalScrollRef}
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
          >
            <ScrollView
              ref={verticalScrollRef}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              <GestureDetector gesture={pinchGesture}>
                <Animated.View>
                  <TouchableWithoutFeedback onPress={handlePress}>
                    <Animated.View
                      style={[
                        styles.mapContent,
                        animatedStyle,
                      ]}
                    >
                      <Animated.Image
                        source={MAP_IMAGE}
                        style={animatedStyle}
                        resizeMode="stretch"
                      />

                      {children
                        ? React.Children.map(children, child =>
                            child
                              ? React.cloneElement(child, {
                                  mapWidth: scaledWidth,
                                  mapHeight: scaledHeight,
                                })
                              : null
                          )
                        : null}

                      {SHOW_DEBUG_POLYGON && (
                        <DebugCampusPolygon
                          mapWidth={scaledWidth}
                          mapHeight={scaledHeight}
                        />
                      )}
                    </Animated.View>
                  </TouchableWithoutFeedback>
                </Animated.View>
              </GestureDetector>
            </ScrollView>
          </ScrollView>

          <View style={styles.zoomControlOverlay}>
            <Pressable style={styles.zoomButtonTop} onPress={zoomIn}>
              <Text style={styles.zoomButtonText}>+</Text>
            </Pressable>

            <View style={styles.divider} />

            <Pressable style={styles.zoomButtonBottom} onPress={zoomOut}>
              <Text style={styles.zoomButtonText}>−</Text>
            </Pressable>
          </View>

          {SHOW_DEBUG_COORDINATES && lastTapCoords && (
            <View style={styles.coordinateOverlay}>
              <Text style={styles.coordinateLabel}>Last Tap:</Text>
              <Text style={styles.coordinateValue}>
                x: {lastTapCoords.x.toFixed(5)}
              </Text>
              <Text style={styles.coordinateValue}>
                y: {lastTapCoords.y.toFixed(5)}
              </Text>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() => {
                  const coordString = `{ x: ${lastTapCoords.x.toFixed(5)}, y: ${lastTapCoords.y.toFixed(5)} },`
                  console.log('Coordinate for VALID_CAMPUS_POLYGON:', coordString)
                  Alert?.alert?.('Copied to Console', coordString) ||
                    alert?.(coordString)
                }}
              >
                <Text style={styles.copyButtonText}>Log</Text>
              </TouchableOpacity>
            </View>
          )}
        </GestureHandlerRootView>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#fff',
  },

  mapContent: {
    position: 'relative',
  },

  zoomControlOverlay: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: 24,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#050505',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 50,
  },

  zoomButtonTop: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#050505',
  },

  zoomButtonBottom: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#050505',
  },

  zoomButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 24,
  },

  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  coordinateOverlay: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 12,
    padding: 12,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 50,
  },

  coordinateLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    opacity: 0.7,
  },

  coordinateValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'monospace',
    marginBottom: 2,
  },

  copyButton: {
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },

  copyButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
})

export default forwardRef(CampusMap)