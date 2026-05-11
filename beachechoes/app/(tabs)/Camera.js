/**
 * Camera capture screen for starting the post creation flow.
 */

import React, { useRef, useState, useEffect } from 'react'
import { View, TouchableOpacity, StyleSheet, Text, ActivityIndicator, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Location from 'expo-location'
import { MaterialIcons } from '@expo/vector-icons'
import BackButton from '../../components/BackButton'
import { theme } from '../../core/theme'
import { useDraftPost } from '../../context/DraftPostContext'
import { latLngToNormalized, pointInPolygon, snapToPolygonBoundary } from '../../helpers/mapUtils'

const CSULB_FALLBACK_LOCATION = {
  coords: {
    latitude: 33.7838,
    longitude: -118.1141,
  },
}

function parseExifDate(value) {
  if (!value || typeof value !== 'string') return null
  const normalized = value.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')
  const ms = Date.parse(normalized)
  return Number.isFinite(ms) ? ms : null
}

export default function CameraScreen() {
  const router = useRouter()
  const [permission, requestPermission] = useCameraPermissions()
  const cameraRef = useRef(null)

  const [isTakingPicture, setIsTakingPicture] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [facing, setFacing] = useState('back')

  const {
    setLocalImageUri,
    setCapturedAt,
    clearDraft,
    setUserLat,
    setUserLng,
    setUserMapX,
    setUserMapY,
    setLocationPermissionGranted,
  } = useDraftPost()

  useEffect(() => {
    async function requestLocationPermission() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()

        if (status !== 'granted') {
          // Preserve "You Are Here" behavior even when real GPS is unavailable.
          console.log('Location permission not granted, using CSULB fallback location')
          setLocationPermissionGranted(false)
          applyLocationToDraft(CSULB_FALLBACK_LOCATION)
          return
        }

        setLocationPermissionGranted(true)

        let location = null

        try {
          location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          })
        } catch (currentPosError) {
          console.log(
            'getCurrentPosition failed, trying last known position:',
            currentPosError.message
          )

          try {
            location = await Location.getLastKnownPositionAsync({})
          } catch (lastKnownError) {
            console.log('Last known location also failed:', lastKnownError.message)
          }
        }

        if (!location) {
          console.log('No location available, using CSULB fallback location')
          location = CSULB_FALLBACK_LOCATION
        }

        applyLocationToDraft(location)
      } catch (error) {
        console.log('Location unavailable, using CSULB fallback:', error.message)
        setLocationPermissionGranted(false)
        applyLocationToDraft(CSULB_FALLBACK_LOCATION)
      }
    }

    function applyLocationToDraft(location) {
      const { latitude, longitude } = location.coords

      if (process.env.EXPO_PUBLIC_DEBUG_GPS === 'true') {
        console.log('📱 Camera: location set')
        console.log(`Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
      }

      setUserLat(latitude)
      setUserLng(longitude)

      const normalized = latLngToNormalized(latitude, longitude)

      let mapCoords = normalized
      if (!pointInPolygon(normalized)) {
        if (process.env.EXPO_PUBLIC_DEBUG_GPS === 'true') {
          console.log('Camera: GPS outside campus polygon, snapping to boundary')
        }

        mapCoords = snapToPolygonBoundary(normalized)
      }

      if (process.env.EXPO_PUBLIC_DEBUG_GPS === 'true') {
        console.log(`Final map coords: (${mapCoords.x.toFixed(4)}, ${mapCoords.y.toFixed(4)})`)
      }

      setUserMapX(mapCoords.x)
      setUserMapY(mapCoords.y)
    }

    requestLocationPermission()
  }, [])

  if (!permission) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.helperText}>Loading camera permissions...</Text>
      </View>
    )
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.helperText}>
          Camera access is required to create a post.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <Text style={styles.buttonText}>Grant Camera Permission</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (cameraError) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.helperText}>Camera preview failed to load.</Text>
        <Text style={styles.subHelperText}>
          {Platform.OS === 'android'
            ? 'Android emulators may show a black preview without a configured virtual camera.'
            : 'Please try re-opening this screen.'}
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={() => setCameraError(null)}
        >
          <Text style={styles.buttonText}>Retry Camera</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const takePicture = async () => {
    if (isTakingPicture) return
    setIsTakingPicture(true)

    try {
      const photo = await cameraRef.current?.takePictureAsync({
        quality: 0.8,
        skipProcessing: Platform.OS === 'android',
        exif: true,
      })

      if (!photo?.uri) {
        throw new Error('Camera returned an empty photo result.')
      }

      const exifDate =
        photo?.exif?.DateTimeOriginal ||
        photo?.exif?.DateTimeDigitized ||
        photo?.exif?.DateTime

      const exifMs = parseExifDate(exifDate)

      // Prefer camera metadata so the post reflects when the photo was actually taken.
      const timestampMs = Number.isFinite(photo?.timestamp)
        ? photo.timestamp
        : exifMs || Date.now()

      clearDraft()
      setLocalImageUri(photo.uri)
      setCapturedAt(new Date(timestampMs).toISOString())
      router.push('/EditPost')
    } catch (error) {
      console.log('Camera error:', error.message)
    } finally {
      setIsTakingPicture(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          ref={cameraRef}
          facing={facing}
          onMountError={(event) => {
            const message = event?.nativeEvent?.message || 'Unknown camera error.'
            setCameraError(message)
            console.log('Camera mount error:', message)
          }}
        />
        <BackButton goBack={() => router.back()} />
        
        {/* Flip Camera Button */}
        <TouchableOpacity
          style={styles.flipButton}
          onPress={() => setFacing(current => current === 'back' ? 'front' : 'back')}
        >
          <MaterialIcons name="flip-camera-ios" size={32} color="#fff" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.captureButton}
        onPress={takePicture}
        disabled={isTakingPicture}
      >
        <View style={styles.buttonInner} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 14,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  permissionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  helperText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 22,
  },
  subHelperText: {
    color: '#bbb',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
  },
  captureButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  flipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
})
