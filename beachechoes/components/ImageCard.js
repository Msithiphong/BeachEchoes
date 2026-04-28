import React, { useState, useRef, useEffect } from 'react'
import { View, ImageBackground, StyleSheet, Text, TouchableOpacity, Animated } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { auth } from '../config/firebase'
import { API_BASE } from '../config/api'

export default function ImageCard({ 
  image, 
  children, 
  username, 
  ownerFirebaseUid = null,
  onUsernamePress,
  likeCount = 0, 
  postId, 
  initialLiked = false,
  onLikeToggle,
  style 
}) {
  const [liked, setLiked] = useState(initialLiked)
  const [likes, setLikes] = useState(likeCount)
  const [pending, setPending] = useState(false)
  const heartScale = useRef(new Animated.Value(0)).current
  const lastTap = useRef(0)

  // Sync with prop changes (when parent updates state)
  useEffect(() => {
    setLiked(initialLiked)
  }, [initialLiked])

  useEffect(() => {
    setLikes(likeCount)
  }, [likeCount])

  const handleDoubleTap = () => {
    const now = Date.now()
    if (now - lastTap.current < 300) {
      triggerLike()
    }
    lastTap.current = now
  }

  const triggerLike = async () => {
    if (pending || !postId) return

    // Optimistic update
    const wasLiked = liked
    const prevLikes = likes

    if (!wasLiked) {
      setLiked(true)
      setLikes(prev => prev + 1)
      
      // Show heart animation
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
    } else {
      setLiked(false)
      setLikes(prev => prev - 1)
    }

    // Send to backend
    setPending(true)
    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch(`${API_BASE}/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await res.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to toggle like')
      }

      // Sync with backend response
      setLiked(data.liked)
      setLikes(data.likeCount)

      // Notify parent component to update its state
      if (onLikeToggle) {
        onLikeToggle(postId, data.liked, data.likeCount)
      }
    } catch (error) {
      console.error('Failed to toggle like:', error)
      // Revert optimistic update on error
      setLiked(wasLiked)
      setLikes(prevLikes)
    } finally {
      setPending(false)
    }
  }

  const toggleLike = async () => {
    if (pending || !postId) return

    // Optimistic update
    const wasLiked = liked
    const prevLikes = likes

    setLiked(!liked)
    setLikes(prev => liked ? prev - 1 : prev + 1)

    // Send to backend
    setPending(true)
    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch(`${API_BASE}/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await res.json()
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to toggle like')
      }

      // Sync with backend response
      setLiked(data.liked)
      setLikes(data.likeCount)

      // Notify parent component to update its state
      if (onLikeToggle) {
        onLikeToggle(postId, data.liked, data.likeCount)
      }
    } catch (error) {
      console.error('Failed to toggle like:', error)
      // Revert optimistic update on error
      setLiked(wasLiked)
      setLikes(prevLikes)
    } finally {
      setPending(false)
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
              <TouchableOpacity
                style={styles.usernameTouchable}
                onPress={() => {
                  if (ownerFirebaseUid && onUsernamePress) onUsernamePress(ownerFirebaseUid)
                }}
                disabled={!ownerFirebaseUid || !onUsernamePress}
              >
                <Text style={styles.usernameText}>@{username}</Text>
              </TouchableOpacity>
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
    paddingBottom: 44,
    width: '100%',
  },
  text: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  usernameTouchable: {
    position: 'absolute',
    bottom: 10,
    left: 12,
  },
  usernameText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
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
