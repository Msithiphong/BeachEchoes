import React, { useState, useRef } from 'react'
import { View, ImageBackground, StyleSheet, Text, TouchableOpacity, Animated } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

export default function ImageCard({ image, children, username, likeCount = 0, style }) {
  const [liked, setLiked] = useState(false)
  const [likes, setLikes] = useState(likeCount)
  const heartScale = useRef(new Animated.Value(0)).current
  const lastTap = useRef(0)

  const handleDoubleTap = () => {
    const now = Date.now()
    if (now - lastTap.current < 300) {
      triggerLike()
    }
    lastTap.current = now
  }

  const triggerLike = () => {
    setLiked(true)
    setLikes(prev => prev + 1)
    heartScale.setValue(0)
    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.timing(heartScale, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const toggleLike = () => {
    if (!liked) {
      triggerLike()
    } else {
      setLiked(false)
      setLikes(prev => prev - 1)
    }
  }

  return (
    <View style={[styles.card, style]}>
      <TouchableOpacity activeOpacity={1} onPress={handleDoubleTap} style={styles.touchable}>
        <ImageBackground
          source={image}
          resizeMode="cover"
          style={styles.image}
          imageStyle={styles.imageRounded}
        >
          <View style={styles.overlay}>
            <Text style={styles.text}>{children}</Text>

            {/* Double-tap heart animation */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.bigHeart,
                {
                  opacity: heartScale,
                  transform: [{ scale: heartScale }],
                },
              ]}
            >
              <Ionicons name="heart" size={80} color="red" />
            </Animated.View>

            {username && (
              <Text style={styles.username}>@{username}</Text>
            )}

            {/* Like button */}
            <View style={styles.likeContainer}>
              <TouchableOpacity onPress={toggleLike}>
                <Ionicons
                  name={liked ? 'heart' : 'heart-outline'}
                  size={24}
                  color={liked ? 'red' : '#ffffff'}
                />
              </TouchableOpacity>
              <Text style={styles.likeCount}>{likes}</Text>
            </View>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  image: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageRounded: {
    borderRadius: 16,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    padding: 16,
    width: '100%',
  },
  text: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  username: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    position: 'absolute',
    bottom: 10,
    left: 12,
  },
  bigHeart: {
    position: 'absolute',
    alignSelf: 'center',
  },
  heartButton: {
    position: 'absolute',
    bottom: 10,
    right: 12,
  },
  likeContainer: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  likeCount: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  touchable: {
    flex: 1,
  },
})
