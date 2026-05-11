// Feed card with image-first presentation, optimistic likes, and tap/double-tap actions.
import React, { useState, useRef, useEffect } from 'react'
import { View, ImageBackground, StyleSheet, Text, TouchableOpacity, Animated, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { auth } from '../config/firebase'
import { API_BASE } from '../config/api'

// Debug mode for ImageCard layout
const DEBUG_IMAGECARD = process.env.EXPO_PUBLIC_DEBUG_IMAGECARD === 'true'

export default function ImageCard({ 
  image, 
  children, 
  username, 
  avatarUrl = null,
  ownerFirebaseUid = null,
  onUsernamePress,
  likeCount = 0, 
  postId, 
  initialLiked = false,
  onLikeToggle,
  commentCount = 0,
  onCommentPress,
  onImagePress,
  style 
}) {
  const [liked, setLiked] = useState(initialLiked)
  const [likes, setLikes] = useState(likeCount)
  const [pending, setPending] = useState(false)
  const heartScale = useRef(new Animated.Value(0)).current
  const cardScale = useRef(new Animated.Value(1)).current
  const cardGlow = useRef(new Animated.Value(0)).current
  const lastTap = useRef(0)
  const singleTapTimer = useRef(null)

  // Sync with prop changes (when parent updates state)
  useEffect(() => {
    setLiked(initialLiked)
  }, [initialLiked])

  useEffect(() => {
    setLikes(likeCount)
  }, [likeCount])

  // Cleanup single tap timer on unmount
  useEffect(() => {
    return () => {
      if (singleTapTimer.current) {
        clearTimeout(singleTapTimer.current)
      }
    }
  }, [])

  const handleDoubleTap = () => {
    const now = Date.now()
    const DOUBLE_TAP_DELAY = 300
    const SINGLE_TAP_DELAY = 200

    // Clear any pending single tap navigation
    if (singleTapTimer.current) {
      clearTimeout(singleTapTimer.current)
      singleTapTimer.current = null
    }

    // Debounce single-tap navigation so a second tap can still convert into a like gesture.
    if (now - lastTap.current < DOUBLE_TAP_DELAY) {
      // Double tap - trigger like
      triggerLike()
      lastTap.current = 0 // Reset to prevent triple-tap issues
    } else {
      // Single tap - schedule navigation after debounce delay
      lastTap.current = now
      if (onImagePress && postId) {
        Animated.parallel([
          Animated.spring(cardScale, {
            toValue: 0.97,
            speed: 25,
            bounciness: 6,
            useNativeDriver: false,
          }),
          Animated.timing(cardGlow, {
            toValue: 1,
            duration: 120,
            useNativeDriver: false,
          }),
        ]).start()

        singleTapTimer.current = setTimeout(() => {
          Animated.parallel([
            Animated.spring(cardScale, {
              toValue: 1,
              speed: 16,
              bounciness: 9,
              useNativeDriver: false,
            }),
            Animated.timing(cardGlow, {
              toValue: 0,
              duration: 180,
              useNativeDriver: false,
            }),
          ]).start()
          onImagePress(postId)
          singleTapTimer.current = null
        }, SINGLE_TAP_DELAY)
      }
    }
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

      // Let the backend stay authoritative in case another device changed the count.
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

    // Single-press likes share the same optimistic pattern as the double-tap gesture.
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
    <Animated.View
      style={[
        styles.card,
        DEBUG_IMAGECARD && styles.debugCard,
        style,
        {
          transform: [{ scale: cardScale }],
          borderColor: cardGlow.interpolate({
            inputRange: [0, 1],
            outputRange: ['rgba(255,255,255,0.10)', 'rgba(121,245,255,0.75)'],
          }),
          shadowOpacity: cardGlow.interpolate({
            inputRange: [0, 1],
            outputRange: [0.2, 0.4],
          }),
        },
      ]}
    >
      <TouchableOpacity activeOpacity={1} onPress={handleDoubleTap} style={[styles.touchable, DEBUG_IMAGECARD && styles.debugTouchable]}>
        <ImageBackground
          source={image}
          resizeMode="cover"
          style={[styles.image, DEBUG_IMAGECARD && styles.debugImage]}
          imageStyle={styles.imageRounded}
        >
          <View style={[styles.overlay, DEBUG_IMAGECARD && styles.debugOverlay]}>
            <Text style={[styles.text, DEBUG_IMAGECARD && styles.debugText]}>{children}</Text>

            {/* Double-tap heart animation */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.bigHeart,
                DEBUG_IMAGECARD && styles.debugBigHeart,
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
                style={[styles.avatarTouchable, DEBUG_IMAGECARD && styles.debugUsernameTouchable]}
                onPress={() => {
                  if (ownerFirebaseUid && onUsernamePress) onUsernamePress(ownerFirebaseUid)
                }}
                disabled={!ownerFirebaseUid || !onUsernamePress}
              >
                <Image
                  source={{
                    uri: avatarUrl || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png'
                  }}
                  style={[styles.avatarImage, DEBUG_IMAGECARD && styles.debugAvatar]}
                />
                <Text style={[styles.usernameText, DEBUG_IMAGECARD && styles.debugUsernameText]}>
                  {username}
                </Text>
              </TouchableOpacity>
            )}

            {/* Like button */}
            <View style={[styles.likeContainer, DEBUG_IMAGECARD && styles.debugLikeContainer]}>
              <TouchableOpacity onPress={toggleLike} style={DEBUG_IMAGECARD && styles.debugIconButton}>
                <Ionicons
                  name={liked ? 'heart' : 'heart-outline'}
                  size={24}
                  color={liked ? 'red' : '#ffffff'}
                />
              </TouchableOpacity>
              <Text style={[styles.likeCount, DEBUG_IMAGECARD && styles.debugCount]}>{likes}</Text>
              
              {/* Comment button */}
              {onCommentPress && (
                <>
                  <TouchableOpacity onPress={() => onCommentPress(postId)} style={[styles.commentBtn, DEBUG_IMAGECARD && styles.debugIconButton]}>
                    <Ionicons name="chatbubble-outline" size={22} color="#ffffff" />
                  </TouchableOpacity>
                  <Text style={[styles.commentCount, DEBUG_IMAGECARD && styles.debugCount]}>{commentCount}</Text>
                </>
              )}
            </View>
          </View>
        </ImageBackground>
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 7,
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
  avatarTouchable: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.92)',
    backgroundColor: '#eee',
  },
  bigHeart: {
    position: 'absolute',
    alignSelf: 'center',
  },
  heartButton: {
    gap: 4,
  },
  likeContainer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    bottom: 10,
    right: 12,
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.24)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  commentBtn: {
    marginLeft: 4,
  },
  commentCount: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
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
  // Debug styles
  debugCard: {
    borderWidth: 3,
    borderColor: '#ff00ff', // Magenta for main card
  },
  debugTouchable: {
    borderWidth: 2,
    borderColor: '#00ffff', // Cyan for touchable area
  },
  debugImage: {
    borderWidth: 2,
    borderColor: '#ffff00', // Yellow for image background
  },
  debugOverlay: {
    borderWidth: 2,
    borderColor: '#00ff00', // Green for overlay
  },
  debugText: {
    borderWidth: 1,
    borderColor: '#ff6600', // Orange for text
  },
  debugBigHeart: {
    borderWidth: 2,
    borderColor: '#ff0000', // Red for big heart animation
  },
  debugUsernameTouchable: {
    borderWidth: 2,
    borderColor: '#0000ff', // Blue for username touchable
  },
  debugUsernameText: {
    borderWidth: 1,
    borderColor: '#ffffff', // White for username text
  },
  debugAvatar: {
    borderWidth: 2,
    borderColor: '#00ff00', // Green for avatar image
  },
  debugLikeContainer: {
    borderWidth: 2,
    borderColor: '#ff00ff', // Magenta for like container
    backgroundColor: 'rgba(255, 0, 255, 0.2)', // Slight background for visibility
  },
  debugIconButton: {
    borderWidth: 1,
    borderColor: '#ffff00', // Yellow for icon buttons
  },
  debugCount: {
    borderWidth: 1,
    borderColor: '#00ffff', // Cyan for count text
  },
})
