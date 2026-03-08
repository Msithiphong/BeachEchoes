/**
 * RegisterScreen Component
 * 
 * User registration screen that creates a new Firebase account, syncs user data
 * to the backend database, and navigates to the Dashboard upon success.
 * 
 * Features:
 * - Name, email, and password input with validation
 * - Firebase account creation
 * - User profile setup with display name
 * - Backend database synchronization
 * - Comprehensive error handling
 * - Loading state during registration
 * - Navigation to login screen
 * 
 * @component
 */

import React, { useState, useContext } from 'react'
import { useRouter } from 'expo-router'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import { Text } from 'react-native-paper'
import Background from '../components/Background'
import Logo from '../components/Logo'
import Header from '../components/Header'
import Button from '../components/Button'
import TextInput from '../components/TextInput'
import BackButton from '../components/BackButton'
import { theme } from '../core/theme'
import { emailValidator } from '../helpers/emailValidator'
import { passwordValidator } from '../helpers/passwordValidator'
import { nameValidator } from '../helpers/nameValidator'
import { AuthContext } from '../context/AuthContext'
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { auth } from '../config/firebase'
import { API_URL } from '../config/api'
import { getExpoPushToken } from '../components/Notifications'

export default function RegisterScreen() {
  // Navigation and authentication context
  const router = useRouter()
  const { login } = useContext(AuthContext)
  
  // Form state with validation errors
  const [name, setName] = useState({ value: '', error: '' })
  const [email, setEmail] = useState({ value: '', error: '' })
  const [password, setPassword] = useState({ value: '', error: '' })
  
  // Loading state for registration operation
  const [loading, setLoading] = useState(false)

  /**
   * Handle registration form submission
   * 
   * Flow:
   * 1. Validate name, email, and password
   * 2. Create Firebase account
   * 3. Update Firebase profile with display name
   * 4. Get authentication token
   * 5. Sync user data to Neon database
   * 6. Update local auth context
   * 7. Navigate to Dashboard
   * 
   * @async
   */
  const onSignUpPressed = async () => {
    // Validate all inputs
    const nameError = nameValidator(name.value)
    const emailError = emailValidator(email.value)
    const passwordError = passwordValidator(password.value)
    
    if (emailError || passwordError || nameError) {
      setName({ ...name, error: nameError })
      setEmail({ ...email, error: emailError })
      setPassword({ ...password, error: passwordError })
      return
    }

    setLoading(true)

    try {
      // Create new Firebase account
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.value,
        password.value
      )

      // Set user's display name in Firebase profile
      await updateProfile(userCredential.user, {
        displayName: name.value
      })

      // Get fresh Firebase ID token for authenticated API calls
      const idToken = await userCredential.user.getIdToken(true)

      // ---> NEW: Fetch the push token from the device <---
      const pushToken = await getExpoPushToken()

      // Sync user data to Neon database
      const syncResponse = await fetch(`${API_URL}/api/users/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          display_name: name.value,
          push_token: pushToken // ---> NEW: Send token to backend <---
        })
      })

      const syncData = await syncResponse.json()
      if (!syncData.success) {
        console.error('Failed to sync user to database:', syncData.error)
        // Continue anyway - user is created in Firebase
      }

      // Update local auth context with user data
      login({
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        name: name.value
      })

      // Navigate to Dashboard
      router.replace('/Dashboard')
    } catch (error) {
      console.error('Registration error:', error)
      
      // Handle specific Firebase auth errors with user-friendly messages
      switch (error.code) {
        case 'auth/email-already-in-use':
          setEmail({ ...email, error: 'Email already registered' })
          break
        case 'auth/invalid-email':
          setEmail({ ...email, error: 'Invalid email address' })
          break
        case 'auth/weak-password':
          setPassword({ ...password, error: 'Password should be at least 6 characters' })
          break
        case 'auth/network-request-failed':
          setEmail({ ...email, error: 'Network error. Check your connection.' })
          break
        default:
          setEmail({ ...email, error: 'Registration failed. Please try again.' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Background>
      {/* Navigation back button */}
      <BackButton goBack={() => router.back()} />
      
      {/* App logo */}
      <Logo />
      
      {/* Screen title */}
      <Header>Create Account</Header>
      
      {/* Name input with validation */}
      <TextInput
        label="Name"
        returnKeyType="next"
        value={name.value}
        onChangeText={(text) => setName({ value: text, error: '' })}
        error={!!name.error}
        errorText={name.error}
      />
      
      {/* Email input with validation */}
      <TextInput
        label="Email"
        returnKeyType="next"
        value={email.value}
        onChangeText={(text) => setEmail({ value: text, error: '' })}
        error={!!email.error}
        errorText={email.error}
        autoCapitalize="none"
        autoCompleteType="email"
        textContentType="emailAddress"
        keyboardType="email-address"
      />
      
      {/* Password input with validation */}
      <TextInput
        label="Password"
        returnKeyType="done"
        value={password.value}
        onChangeText={(text) => setPassword({ value: text, error: '' })}
        error={!!password.error}
        errorText={password.error}
        secureTextEntry
      />
      
      {/* Registration button with loading state */}
      <Button
        mode="contained"
        onPress={onSignUpPressed}
        loading={loading}
        disabled={loading}
        style={{ marginTop: 24 }}
      >
        Sign Up
      </Button>
      
      {/* Login navigation link */}
      <View style={styles.row}>
        <Text>Already have an account? </Text>
        <TouchableOpacity onPress={() => router.replace('/LoginScreen')}>
          <Text style={styles.link}>Login</Text>
        </TouchableOpacity>
      </View>
    </Background>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginTop: 4,
  },
  link: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
})
