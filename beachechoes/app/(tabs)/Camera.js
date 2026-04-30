/**
 * CameraScreen Component
 * 
 * Provides camera functionality for capturing photos within the BeachEchoes app.
 * This screen handles camera permissions, displays the camera preview, and manages
 * photo capture with quality optimization.
 * 
 * Features:
 * - Request and manage camera permissions
 * - Live camera preview
 * - Photo capture with quality settings
 * - Loading state during capture
 * - Navigation back to previous screen
 * 
 * @component
 */

import React, { useRef, useState, useEffect } from 'react'
import { View, TouchableOpacity, StyleSheet, Text, ActivityIndicator, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Location from 'expo-location'
import BackButton from '../../components/BackButton'
import { theme } from '../../core/theme'
import { useDraftPost } from '../../context/DraftPostContext'
import { latLngToNormalized, pointInPolygon, snapToPolygonBoundary } from '../../helpers/mapUtils'

function parseExifDate(value) {
  if (!value || typeof value !== 'string') return null
  const normalized = value.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')
  const ms = Date.parse(normalized)
  return Number.isFinite(ms) ? ms : null
}

export default function CameraScreen() {
  // Navigation hook for routing
  const router = useRouter()
  
  // Camera permission state and request function from expo-camera
  const [permission, requestPermission] = useCameraPermissions()
  
  // Reference to the camera component for taking pictures
  const cameraRef = useRef(null)
  
  // State to prevent multiple simultaneous photo captures
  const [isTakingPicture, setIsTakingPicture] = useState(false)
  const [cameraError, setCameraError] = useState(null)

  const { 
    setLocalImageUri, 
    setCapturedAt, 
    clearDraft, 
    setUserLat, 
    setUserLng, 
    setUserMapX, 
    setUserMapY,
    locationPermissionGranted,
    setLocationPermissionGranted,
  } = useDraftPost()

  // Request location permission and fetch user's location on mount
  useEffect(() => {
    async function requestLocationPermission() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        
        if (status === 'granted') {
          setLocationPermissionGranted(true)
          
          // Fetch current location
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          })
          
          const { latitude, longitude } = location.coords
          
          // Store raw lat/lng
          setUserLat(latitude)
          setUserLng(longitude)
          
          // Convert to normalized map coordinates
          const normalized = latLngToNormalized(latitude, longitude)
          
          // Check if within campus polygon, if not snap to boundary
          let mapCoords = normalized
          if (!pointInPolygon(normalized)) {
            mapCoords = snapToPolygonBoundary(normalized)
          }
          
          setUserMapX(mapCoords.x)
          setUserMapY(mapCoords.y)
        } else {
          setLocationPermissionGranted(false)
        }
      } catch (error) {
        console.error('Location permission error:', error)
        setLocationPermissionGranted(false)
      }
    }

    requestLocationPermission()
  }, [])

  // Loading state: permissions are being checked
  if (!permission) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.helperText}>Loading camera permissions...</Text>
      </View>
    )
  }

  // Permission not granted: show permission request button
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

  /**
   * Captures a photo using the camera
   * 
   * Prevents multiple simultaneous captures and handles photo quality settings.
   * Currently logs the photo URI for debugging. Future implementation will
   * save or upload the photo to the backend.
   * 
   * @async
   */
  const takePicture = async () => {
    // Prevent multiple captures at once
    if (isTakingPicture) return
    setIsTakingPicture(true)
    
    try {
      // Capture photo with 80% quality for optimal size/quality balance
      const photo = await cameraRef.current?.takePictureAsync({
        quality: 0.8,
        // Keep Android capture path stable on emulators/devices that return black processed frames.
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
      const timestampMs = Number.isFinite(photo?.timestamp)
        ? photo.timestamp
        : exifMs || Date.now()

      clearDraft()
      setLocalImageUri(photo.uri)
      setCapturedAt(new Date(timestampMs).toISOString())
      router.push('/EditPost')
    } catch (error) {
      console.error('Camera error:', error)
    } finally {
      // Re-enable capture button
      setIsTakingPicture(false)
    }
  }

  // Main camera view with preview and controls
  return (
    <View style={styles.container}>
      {/* Camera preview container with back button overlay */}
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          ref={cameraRef}
          onMountError={(event) => {
            const message = event?.nativeEvent?.message || 'Unknown camera error.'
            setCameraError(message)
            console.error('Camera mount error:', message)
          }}
        />
        <BackButton goBack={() => router.back()} />
      </View>
      
      {/* Capture button - styled as circular shutter button */}
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

/**
 * Styles for the camera screen
 */
const styles = StyleSheet.create({
  // Main container - full screen with black background
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
  // Container for camera preview with absolute positioning support
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  // Camera preview fills its container
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
})
