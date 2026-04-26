import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native'

import Background from '../../components/Background'
import { auth } from '../../config/firebase'
import { API_URL } from '../../config/api'

const MAP_IMAGE = require('../../assets/images/csulb-map.png')
const screenWidth = Dimensions.get('window').width

const MAP_BOUNDS = {
  north: 33.7905,
  south: 33.775,
  west: -118.125,
  east: -118.105,
}

function coordinateToPercent(latitude, longitude) {
  const lat = Number(latitude)
  const lng = Number(longitude)

  const x =
    ((lng - MAP_BOUNDS.west) / (MAP_BOUNDS.east - MAP_BOUNDS.west)) * 100

  const y =
    ((MAP_BOUNDS.north - lat) / (MAP_BOUNDS.north - MAP_BOUNDS.south)) * 100

  return { x, y }
}

export default function Map() {
  const [zoom, setZoom] = useState(1)
  const [posts, setPosts] = useState([])
  const [selectedPost, setSelectedPost] = useState(null)
  const [loading, setLoading] = useState(true)

  const imageSource = Image.resolveAssetSource(MAP_IMAGE)
  const imageRatio = imageSource.height / imageSource.width

  const frameWidth = screenWidth - 72
  const baseWidth = frameWidth
  const baseHeight = baseWidth * imageRatio
  const frameHeight = Math.min(baseHeight, 520)

  const mapWidth = baseWidth * zoom
  const mapHeight = baseHeight * zoom

  const fetchMapPosts = useCallback(async () => {
    try {
      const token = await auth.currentUser?.getIdToken()

      const response = await fetch(`${API_URL}/api/messages/map`, {
        method: 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      const data = await response.json()

      if (data.success) {
        setPosts(data.messages || [])
      } else {
        console.log('Map fetch error:', data.error)
      }
    } catch (error) {
      console.log('Map network error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMapPosts()
  }, [fetchMapPosts])

  const zoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3))
  }

  const zoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 1))
  }

  return (
    <Background>
      <View style={styles.container}>
        <Text style={styles.title}>Campus Map</Text>

        <View style={styles.controls}>
          <Pressable style={styles.controlButton} onPress={zoomOut}>
            <Text style={styles.controlText}>−</Text>
          </Pressable>

          <Text style={styles.zoomText}>{Math.round(zoom * 100)}%</Text>

          <Pressable style={styles.controlButton} onPress={zoomIn}>
            <Text style={styles.controlText}>+</Text>
          </Pressable>
        </View>

        <View style={[styles.mapFrame, { width: frameWidth, height: frameHeight }]}>
          {loading ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="small" />
            </View>
          ) : null}

          <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled>
            <ScrollView showsVerticalScrollIndicator nestedScrollEnabled>
              <View style={{ width: mapWidth, height: mapHeight }}>
                <Image
                  source={MAP_IMAGE}
                  style={{ width: mapWidth, height: mapHeight }}
                  resizeMode="stretch"
                />

                {posts.map(post => {
                  const { x, y } = coordinateToPercent(
                    post.latitude,
                    post.longitude
                  )

                  if (x < 0 || x > 100 || y < 0 || y > 100) {
                    return null
                  }

                  const isSelected = selectedPost?.id === post.id

                  return (
                    <View
                      key={post.id}
                      style={[
                        styles.pinWrapper,
                        {
                          left: `${x}%`,
                          top: `${y}%`,
                        },
                      ]}
                    >
                      {isSelected ? (
                        <View style={styles.pinPreviewWrapper}>
                          <View style={styles.pinPreviewCard}>
                            <View style={styles.previewHeader}>
                              <Text style={styles.previewTitle}>
                                {post.author_name || 'Unknown User'}
                              </Text>

                              <Pressable onPress={() => setSelectedPost(null)}>
                                <Text style={styles.closeText}>✕</Text>
                              </Pressable>
                            </View>

                            {post.image_url ? (
                              <Image
                                source={{ uri: post.image_url }}
                                style={styles.previewImage}
                                resizeMode="cover"
                              />
                            ) : null}

                            <Text style={styles.previewMessage}>{post.message}</Text>

                            <View style={styles.previewMetaRow}>
                              <Text style={styles.previewMeta}>
                                ▲ {post.upvote || 0}
                              </Text>

                              <Text style={styles.previewMeta}>
                                {post.expires_at
                                  ? `Expires ${new Date(
                                      post.expires_at
                                    ).toLocaleTimeString()}`
                                  : 'No expiration'}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.bubbleTail} />
                        </View>
                      ) : null}

                      <Pressable onPress={() => setSelectedPost(post)}>
                        <Text style={styles.pinText}>📍</Text>
                      </Pressable>
                    </View>
                  )
                })}
              </View>
            </ScrollView>
          </ScrollView>
        </View>

        <View style={styles.hintBubble}>
          <Text style={styles.hintText}>Tap on a pin to view an echo!</Text>
        </View>
      </View>
    </Background>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 14,
    paddingTop: 78,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
    color: '#000',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6f50b5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlText: {
    color: 'white',
    fontSize: 28,
    fontWeight: '700',
  },
  zoomText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  mapFrame: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  loadingOverlay: {
    position: 'absolute',
    zIndex: 20,
    top: 10,
    left: 10,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 8,
  },
  pinWrapper: {
    position: 'absolute',
    alignItems: 'center',
    transform: [{ translateX: -14 }, { translateY: -28 }],
    zIndex: 10,
  },
  pinText: {
    fontSize: 30,
  },
  pinPreviewWrapper: {
    position: 'absolute',
    bottom: 36,
    alignItems: 'center',
    zIndex: 30,
  },
  pinPreviewCard: {
    width: 220,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
    alignItems: 'stretch',
  },
  bubbleTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'white',
    marginTop: -1,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
    flex: 1,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6f50b5',
    paddingLeft: 8,
  },
  previewImage: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#ddd',
  },
  previewMessage: {
    fontSize: 13,
    color: '#111',
    lineHeight: 18,
    marginBottom: 8,
  },
  previewMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewMeta: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  hintBubble: {
    marginTop: 14,
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  hintText: {
    fontSize: 14,
    color: '#444',
    textAlign: 'center',
    fontWeight: '500',
  },
})