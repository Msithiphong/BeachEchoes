import React, { useEffect, useRef } from 'react'
import { View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useDraftPost } from '../context/DraftPostContext'
import { publishPost } from '../helpers/postUpload'

export default function PostPublish() {
  const router = useRouter()

  const {
    localImageUri,
    overlayText,
    category,
    isAnonymous,
    mapX,
    mapY,
    latitude,
    longitude,
    clearDraft,
  } = useDraftPost()

  const didSubmit = useRef(false)

  useEffect(() => {
    if (didSubmit.current) return

    didSubmit.current = true

    if (!localImageUri || mapX == null || mapY == null) {
      router.replace('/(tabs)/Camera')
      return
    }

    publishPost({
      localImageUri,
      overlayText,
      category,
      isAnonymous,
      mapX,
      mapY,
      latitude,
      longitude,
    })
      .then(() => {
        clearDraft()
        router.replace('/(tabs)/Map')
      })
      .catch((err) => {
        console.error('Publish error:', err)

        Alert.alert(
          'Publish failed',
          err.message || 'Something went wrong. Please try again.',
          [{ text: 'OK', onPress: () => router.back() }]
        )
      })
  }, [])

  return (
    <LinearGradient colors={['#9ed4df', '#ffe000']} style={styles.container}>
      <View style={styles.card}>
        <ActivityIndicator size="large" />

        <Text style={styles.title}>Publishing Your Echo</Text>

        <Text style={styles.label}>
          Sending your post to the map...
        </Text>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.86)',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  title: {
    marginTop: 14,
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  label: {
    marginTop: 8,
    fontSize: 14,
    color: '#334155',
    textAlign: 'center',
  },
})