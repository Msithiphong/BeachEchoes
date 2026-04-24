import React, { useState } from 'react';
import { View, Image, TouchableWithoutFeedback, StyleSheet } from 'react-native';
import { MAP_ASPECT_RATIO } from '../config/campusMap';

const MAP_IMAGE = require('../assets/images/CSULB Map.png');

/**
 * Renders the campus map image and reports tap positions as normalized
 * [0,1] coordinates via onTap({ x, y }).
 *
 * Children are rendered on top of the image (e.g. ClusteredPin overlays).
 */
export default function CampusMap({ onTap, children, style }) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  function handleLayout(e) {
    const { width } = e.nativeEvent.layout;
    setDimensions({ width, height: width / MAP_ASPECT_RATIO });
  }

  function handlePress(e) {
    if (!onTap || dimensions.width === 0) return;
    const { locationX, locationY } = e.nativeEvent;
    onTap({
      x: Math.min(1, Math.max(0, locationX / dimensions.width)),
      y: Math.min(1, Math.max(0, locationY / dimensions.height)),
    });
  }

  return (
    <TouchableWithoutFeedback onPress={handlePress}>
      <View
        style={[styles.container, { height: dimensions.width > 0 ? dimensions.height : undefined }, style]}
        onLayout={handleLayout}
      >
        <Image source={MAP_IMAGE} style={styles.map} resizeMode="contain" />
        {dimensions.width > 0 && children
          ? React.Children.map(children, (child) =>
              child
                ? React.cloneElement(child, {
                    mapWidth: dimensions.width,
                    mapHeight: dimensions.height,
                  })
                : null
            )
          : null}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
});
