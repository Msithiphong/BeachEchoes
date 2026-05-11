/**
 * Firebase Configuration Module
 * 
 * Initializes and exports Firebase services for the BeachEchoes app:
 * - Authentication (with persistent login via AsyncStorage)
 * - Cloud Storage (for avatar images and media)
 * 
 * Environment variables are loaded from .env file and accessed via
 * process.env with the EXPO_PUBLIC_ prefix for client-side variables.
 * 
 * Security Note: API keys in client apps are not secret - they identify
 * the Firebase project but don't grant access without proper auth.
 * 
 * @module config/firebase
 */

import { initializeApp } from 'firebase/app'
import { initializeAuth, getReactNativePersistence } from 'firebase/auth'
import { getStorage } from 'firebase/storage'
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Firebase project configuration
 * Values are pulled from environment variables (.env file)
 */
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: "beachechoes.firebaseapp.com",
  projectId: "beachechoes",
  storageBucket: "beachechoes.appspot.com",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
}

/**
 * Initialize Firebase app instance
 */
const app = initializeApp(firebaseConfig)

/**
 * Firebase Authentication instance with AsyncStorage persistence.
 * This allows users to stay logged in even after closing the app and keeps
 * auth state consistent with AuthContext across cold starts.
 * 
 * @constant {Auth}
 */
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
})

/**
 * Firebase Cloud Storage instance for storing user-uploaded files
 * (avatars, images, etc.)
 * 
 * @constant {FirebaseStorage}
 */
export const storage = getStorage(app)
