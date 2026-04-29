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

import React, { useRef, useState } from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { CameraView, useCameraPermissions } from 'expo-camera'
<<<<<<< Updated upstream
import * as Location from 'expo-location'
=======
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
>>>>>>> Stashed changes
import BackButton from '../../components/BackButton'
import { theme } from '../../core/theme'
import { useDraftPost } from '../../context/DraftPostContext'

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
  
  // State to manage camera facing (front or back)
  const [facing, setFacing] = useState('back')

  const {
    setLocalImageUri,
    setCapturedAt,
    setLatitude,
    setLongitude,
    clearDraft,
  } = useDraftPost()

  if (!permission) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" />
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

        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
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

<<<<<<< Updated upstream
=======
  /**
   * Toggles between front and back camera
   */
  const flipCamera = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'))
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
>>>>>>> Stashed changes
  const takePicture = async () => {
    if (isTakingPicture) return

    setIsTakingPicture(true)

    try {
      const locationPermission =
        await Location.requestForegroundPermissionsAsync()

      if (locationPermission.status !== 'granted') {
        Alert.alert(
          'Location Required',
          'Location permission is needed so your echo can be placed on the campus map.'
        )
        return
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })

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
      const timestampMs = Number.isFinite(photo?.timestamp)
        ? photo.timestamp
        : exifMs || Date.now()

      clearDraft()
      setLocalImageUri(photo.uri)
      setCapturedAt(new Date(timestampMs).toISOString())
      setLatitude(currentLocation.coords.latitude)
      setLongitude(currentLocation.coords.longitude)

      router.push('/EditPost')
    } catch (error) {
      console.error('Camera/location error:', error)
      Alert.alert(
        'Capture Failed',
        error.message || 'Could not capture your photo and location.'
      )
    } finally {
      setIsTakingPicture(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
<<<<<<< Updated upstream
          style={styles.camera}
          facing="back"
=======
          facing={facing}
>>>>>>> Stashed changes
          onMountError={(event) => {
            const message = event?.nativeEvent?.message || 'Unknown camera error.'
            setCameraError(message)
            console.error('Camera mount error:', message)
          }}
        />
<<<<<<< Updated upstream

        <BackButton goBack={() => router.back()} />

        <TouchableOpacity
          style={styles.captureButton}
          onPress={takePicture}
          disabled={isTakingPicture}
        >
          <View style={styles.buttonInner} />
=======
        
        {/* Camera flip button - top right corner */}
        <TouchableOpacity
          style={styles.flipButton}
          onPress={flipCamera}
        >
          <MaterialIcons name="flip-camera-ios" size={32} color="#fff" />
>>>>>>> Stashed changes
        </TouchableOpacity>
      </View>
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
<<<<<<< Updated upstream
})
=======
  flipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
})
>>>>>>> Stashed changes
