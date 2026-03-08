/**
 * LoginScreen Component
 * 
 * User authentication screen that handles email/password login via Firebase Auth.
 * Upon successful authentication, syncs user data to the Neon database and
 * navigates to the Dashboard.
 * 
 * Features:
 * - Email and password input with validation
 * - Firebase authentication
 * - User data sync with backend database
 * - Comprehensive error handling with specific messages
 * - Loading state during authentication
 * - Navigation to password reset
 * - Navigation to registration screen
 * 
 * @component
 */

import React, { useState, useContext } from 'react'
import { useRouter } from 'expo-router'
import { TouchableOpacity, StyleSheet, View } from 'react-native'
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
import { AuthContext } from '../context/AuthContext'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../config/firebase'
import { API_URL } from '../config/api'
import { getExpoPushToken } from '../components/Notifications'

export default function LoginScreen() {
  // Navigation and authentication context
  const router = useRouter()
  const { login } = useContext(AuthContext)
  
  // Form state with validation errors
  const [email, setEmail] = useState({ value: '', error: '' })
  const [password, setPassword] = useState({ value: '', error: '' })
  
  // Loading state for login operation
  const [loading, setLoading] = useState(false)

  /**
   * Handle login form submission
   * 
   * Flow:
   * 1. Validate email and password
   * 2. Authenticate with Firebase
   * 3. Get authentication token
   * 4. Sync user data to Neon database
   * 5. Update local auth context
   * 6. Navigate to Dashboard
   * 
   * @async
   */
  const onLoginPressed = async () => {
    // Validate inputs
    const emailError = emailValidator(email.value)
    const passwordError = passwordValidator(password.value)
    if (emailError || passwordError) {
      setEmail({ ...email, error: emailError })
      setPassword({ ...password, error: passwordError })
      return
    }

    setLoading(true)

    try {
      // Authenticate with Firebase
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.value,
        password.value
      )

      // Get Firebase ID token for authenticated API calls
      const idToken = await userCredential.user.getIdToken()

      // ---> NEW: Fetch the push token from the device <---
      const pushToken = await getExpoPushToken()

      // Sync user data to Neon DB (creates or updates user record)
      const syncResponse = await fetch(`${API_URL}/api/users/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          display_name: userCredential.user.displayName,
          push_token: pushToken // ---> NEW: Send token to backend <---
        })
      })

      const syncData = await syncResponse.json()
      if (!syncData.success) {
        console.error('Failed to sync user to database:', syncData.error)
        // Continue anyway - user is authenticated in Firebase
      }

      // Update local auth context with user data
      login({
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        name: userCredential.user.displayName
      })

      // Navigate to Dashboard
      router.replace('/Dashboard')
    } catch (error) {
      console.error('Login error:', error)
      
      // Handle specific Firebase auth errors with user-friendly messages
      switch (error.code) {
        case 'auth/invalid-credential':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          setPassword({ ...password, error: 'Invalid email or password' })
          break
        case 'auth/invalid-email':
          setEmail({ ...email, error: 'Invalid email address' })
          break
        case 'auth/user-disabled':
          setEmail({ ...email, error: 'Account has been disabled' })
          break
        case 'auth/too-many-requests':
          setPassword({ ...password, error: 'Too many failed attempts. Try again later.' })
          break
        case 'auth/network-request-failed':
          setPassword({ ...password, error: 'Network error. Check your connection.' })
          break
        default:
          setPassword({ ...password, error: 'Login failed. Please try again.' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Background>
      <BackButton goBack={() => router.back()} />
      <Logo />
      <Header>Welcome back.</Header>
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
      <TextInput
        label="Password"
        returnKeyType="done"
        value={password.value}
        onChangeText={(text) => setPassword({ value: text, error: '' })}
        error={!!password.error}
        errorText={password.error}
        secureTextEntry
      />
      <View style={styles.forgotPassword}>
        <TouchableOpacity
          onPress={() => router.push('/ResetPasswordScreen')}
        >
          <Text style={styles.forgot}>Forgot your password?</Text>
        </TouchableOpacity>
      </View>
      <Button 
        mode="contained" 
        onPress={onLoginPressed}
        loading={loading}
        disabled={loading}
      >
        Login
      </Button>
      <View style={styles.row}>
        <Text>Don’t have an account? </Text>
        <TouchableOpacity onPress={() => router.replace('/RegisterScreen')}>
          <Text style={styles.link}>Sign up</Text>
        </TouchableOpacity>
      </View>
    </Background>
  )
}

const styles = StyleSheet.create({
  forgotPassword: {
    width: '100%',
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    marginTop: 4,
  },
  forgot: {
    fontSize: 13,
    color: theme.colors.secondary,
  },
  link: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
})
