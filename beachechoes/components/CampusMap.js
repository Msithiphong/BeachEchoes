import React, { useState } from 'react'
import {
  View,
  Image,
  TouchableWithoutFeedback,
  StyleSheet,
  ScrollView,
  Pressable,
  Text,
} from 'react-native'

import { MAP_ASPECT_RATIO } from '../config/campusMap'

const MAP_IMAGE = require('../assets/images/CSULB Map.png')

export default function CampusMap({ onTap, children, style }) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [zoom, setZoom] = useState(1)

  function handleLayout(e) {
    const { width } = e.nativeEvent.layout

    setDimensions({
      width,
      height: width / MAP_ASPECT_RATIO,
    })
  }

  const zoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3))
  }

  const zoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 1))
  }

  const scaledWidth = dimensions.width * zoom
  const scaledHeight = dimensions.height * zoom

  function handlePress(e) {
    if (!onTap || dimensions.width === 0) return

    const { locationX, locationY } = e.nativeEvent

    onTap({
      x: Math.min(1, Math.max(0, locationX / scaledWidth)),
      y: Math.min(1, Math.max(0, locationY / scaledHeight)),
    })
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
        <>
          <ScrollView
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
          >
            <ScrollView
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
            >
              <TouchableWithoutFeedback onPress={handlePress}>
                <View
                  style={[
                    styles.mapContent,
                    {
                      width: scaledWidth,
                      height: scaledHeight,
                    },
                  ]}
                >
                  <Image
                    source={MAP_IMAGE}
                    style={{
                      width: scaledWidth,
                      height: scaledHeight,
                    }}
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
                </View>
              </TouchableWithoutFeedback>
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
        </>
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
})