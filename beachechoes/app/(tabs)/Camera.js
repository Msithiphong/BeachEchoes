import React, { useRef, useState } from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Text,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as Location from 'expo-location'
import * as FileSystem from 'expo-file-system/legacy'
import { auth } from '../../config/firebase'
import { API_URL } from '../../config/api'
import BackButton from '../../components/BackButton'
import Button from '../../components/Button'
import { theme } from '../../core/theme'

export default function CameraScreen() {
  const cameraRef = useRef(null)

  const [permission, requestPermission] = useCameraPermissions()
  const [isTakingPicture, setIsTakingPicture] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  const [photoUri, setPhotoUri] = useState(null)
  const [echoText, setEchoText] = useState('')

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionText}>
          Camera permission is required to create an echo.
        </Text>

        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Camera Permission</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const takePicture = async () => {
    if (isTakingPicture) return

    setIsTakingPicture(true)

    try {
      const photo = await cameraRef.current?.takePictureAsync({
        quality: 0.7,
        skipProcessing: true,
      })

      if (photo?.uri) {
        setPhotoUri(photo.uri)
      }
    } catch (error) {
      console.error('Camera error:', error)
      Alert.alert('Camera Error', 'Could not take photo.')
    } finally {
      setIsTakingPicture(false)
    }
  }

  const retakePhoto = () => {
    setPhotoUri(null)
    setEchoText('')
  }

  const submitPost = async () => {
    if (!photoUri) {
      Alert.alert('Missing Photo', 'Please take a photo first.')
      return
    }

    if (!echoText.trim()) {
      Alert.alert('Missing Echo', 'Please enter a message for your echo.')
      return
    }

    setIsPosting(true)

    try {
      const locationPermission =
        await Location.requestForegroundPermissionsAsync()

      if (locationPermission.status !== 'granted') {
        Alert.alert(
          'Location Required',
          'Location permission is needed so this echo can be placed on the map.'
        )
        return
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      })

      const imageBase64 = await FileSystem.readAsStringAsync(photoUri, {
        encoding: 'base64',
      })

      const token = await auth.currentUser?.getIdToken()

      const response = await fetch(`${API_URL}/api/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: echoText,
          imageBase64,
          contentType: 'image/jpeg',

          // Use this for real device location:
          //latitude: currentLocation.coords.latitude,
         // longitude: currentLocation.coords.longitude,

          // Use this for CSULB testing if your emulator location is not CSULB:
          latitude: 33.7838,
          longitude: -118.1141,

          durationHours: 24,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        Alert.alert('Post Failed', data.error || 'Could not create echo.')
        return
      }

      Alert.alert('Echo Created', 'Your echo has been posted to the map.')
      setPhotoUri(null)
      setEchoText('')
    } catch (error) {
      console.error('Post error:', error)
      Alert.alert('Network Error', 'Could not submit your echo.')
    } finally {
      setIsPosting(false)
    }
  }

  if (photoUri) {
    return (
      <View style={styles.previewContainer}>
        <Image source={{ uri: photoUri }} style={styles.previewImage} />

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Attach an Echo</Text>

          <TextInput
            style={styles.echoInput}
            placeholder="Write your echo..."
            value={echoText}
            onChangeText={setEchoText}
            multiline
          />

          <Button mode="contained" onPress={submitPost} disabled={isPosting}>
            {isPosting ? 'Posting...' : 'Post Echo'}
          </Button>

          <TouchableOpacity onPress={retakePhoto}>
            <Text style={styles.retakeText}>Retake Photo</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back" />

        <BackButton goBack={() => {}} />

        <TouchableOpacity
          style={styles.captureButton}
          onPress={takePicture}
          disabled={isTakingPicture}
        >
          <View style={styles.buttonInner} />
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
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
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
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewImage: {
    flex: 1,
    width: '100%',
  },
  formCard: {
    backgroundColor: '#fff',
    padding: 18,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  echoInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    textAlignVertical: 'top',
  },
  retakeText: {
    marginTop: 12,
    textAlign: 'center',
    color: theme.colors.primary,
    fontWeight: '700',
  },
})