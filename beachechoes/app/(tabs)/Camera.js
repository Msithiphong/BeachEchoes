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

import React, { useEffect, useRef, useState } from 'react'
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native'
import { useRouter } from 'expo-router'
import { CameraView, useCameraPermissions } from 'expo-camera'
import BackButton from '../../components/BackButton'
import { theme } from '../../core/theme'

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
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [permissionCheckTimedOut, setPermissionCheckTimedOut] = useState(false)
  const [cameraReadyTimedOut, setCameraReadyTimedOut] = useState(false)

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!permission) {
        setPermissionCheckTimedOut(true)
      }
    }, 2500)

    return () => clearTimeout(timeoutId)
  }, [permission])

  useEffect(() => {
    // Trigger Android permission prompt once when status is undetermined.
    if (permission?.status === 'undetermined' && permission.canAskAgain) {
      requestPermission()
    }
  }, [permission, requestPermission])

  useEffect(() => {
    if (!permission?.granted || isCameraReady || cameraError) {
      setCameraReadyTimedOut(false)
      return
    }

    const timeoutId = setTimeout(() => {
      if (!isCameraReady) {
        setCameraReadyTimedOut(true)
      }
    }, 5000)

    return () => clearTimeout(timeoutId)
  }, [permission, isCameraReady, cameraError])

  // Loading state: permissions are being checked
  if (!permission) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.infoText}>
          {permissionCheckTimedOut
            ? 'Camera permission check is taking longer than expected.'
            : 'Checking camera permission...'}
        </Text>
      </View>
    )
  }

  // Permission not granted: show permission request button
  if (!permission.granted) {
    return (
      <View style={styles.container}>
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
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorTitle}>Camera failed to start</Text>
        <Text style={styles.errorText}>
          {cameraError}
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={() => {
            setCameraError(null)
            setIsCameraReady(false)
          }}
        >
          <Text style={styles.buttonText}>Retry Camera</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (cameraReadyTimedOut) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorTitle}>Camera preview is not available</Text>
        <Text style={styles.errorText}>
          The Android emulator often shows a black camera feed unless Front/Back camera is mapped
          to Webcam or Virtual Scene in emulator settings.
        </Text>
        <Text style={styles.errorText}>
          AR features usually require a physical Android device for reliable testing.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={() => {
            setCameraReadyTimedOut(false)
            setIsCameraReady(false)
            setCameraError(null)
          }}
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
        quality: 0.8, // 0-1 scale, 0.8 provides good balance
        skipProcessing: true, // Skip post-processing for faster capture
      })
      console.log('Photo saved:', photo.uri)
      // TODO: Save or upload photo to Firebase Storage via backend API
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
          onCameraReady={() => setIsCameraReady(true)}
          onMountError={(event) => {
            const message =
              event?.nativeEvent?.message ||
              'Unable to access camera. If you are on an emulator, enable a virtual scene camera.'
            setCameraError(message)
          }}
        />
        <BackButton goBack={() => router.back()} />
      </View>
      
      {/* Capture button - styled as circular shutter button */}
      <TouchableOpacity
        style={styles.captureButton}
        onPress={takePicture}
        disabled={isTakingPicture || !isCameraReady}
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
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
  infoText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
  },
  errorTitle: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 8,
  },
  errorText: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 14,
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
