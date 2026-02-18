/**
 * ResetPasswordScreen Component
 * 
 * Password recovery screen that allows users to reset their password via email.
 * Uses Firebase's password reset functionality to send a recovery link to the
 * user's registered email address.
 * 
 * Features:
 * - Email input with validation
 * - Firebase password reset email
 * - Success confirmation message
 * - Automatic redirect to login after success
 * - Comprehensive error handling
 * - Loading state during operation
 * 
 * @component
 */

import React, { useState } from 'react'
import { useRouter } from 'expo-router'
import { StyleSheet } from 'react-native'
import { Text } from 'react-native-paper'
import Background from '../components/Background'
import BackButton from '../components/BackButton'
import Logo from '../components/Logo'
import Header from '../components/Header'
import TextInput from '../components/TextInput'
import Button from '../components/Button'
import { emailValidator } from '../helpers/emailValidator'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../config/firebase'
import { theme } from '../core/theme'

export default function ResetPasswordScreen() {
  // Navigation hook
  const router = useRouter()
  
  // Form state with validation error
  const [email, setEmail] = useState({ value: '', error: '' })
  
  // Loading state for reset operation
  const [loading, setLoading] = useState(false)
  
  // Success state to show confirmation message
  const [success, setSuccess] = useState(false)

  /**
   * Handle password reset request
   * 
   * Flow:
   * 1. Validate email address
   * 2. Send password reset email via Firebase
   * 3. Show success message
   * 4. Clear form and redirect to login after 2 seconds
   * 
   * @async
   */
  const sendResetPasswordEmail = async () => {
    // Validate email
    const emailError = emailValidator(email.value)
    if (emailError) {
      setEmail({ ...email, error: emailError })
      return
    }

    setLoading(true)
    setSuccess(false)

    try {
      // Send password reset email via Firebase
      await sendPasswordResetEmail(auth, email.value)
      
      // Show success message
      setSuccess(true)
      setEmail({ value: '', error: '' })
      
      // Navigate back to login after 2 seconds
      setTimeout(() => {
        router.replace('/LoginScreen')
      }, 2000)
    } catch (error) {
      console.error('Password reset error:', error)
      
      // Handle specific Firebase errors with user-friendly messages
      switch (error.code) {
        case 'auth/user-not-found':
          setEmail({ ...email, error: 'No account found with this email' })
          break
        case 'auth/invalid-email':
          setEmail({ ...email, error: 'Invalid email address' })
          break
        case 'auth/too-many-requests':
          setEmail({ ...email, error: 'Too many requests. Try again later.' })
          break
        case 'auth/network-request-failed':
          setEmail({ ...email, error: 'Network error. Check your connection.' })
          break
        default:
          setEmail({ ...email, error: 'Failed to send reset email. Please try again.' })
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
      <Header>Restore Password</Header>
      
      {/* Success message - shown after email is sent */}
      {success && (
        <Text style={styles.successText}>
          Password reset email sent! Check your inbox.
        </Text>
      )}
      
      {/* Email input with validation and help text */}
      <TextInput
        label="E-mail address"
        returnKeyType="done"
        value={email.value}
        onChangeText={(text) => setEmail({ value: text, error: '' })}
        error={!!email.error}
        errorText={email.error}
        autoCapitalize="none"
        autoCompleteType="email"
        textContentType="emailAddress"
        keyboardType="email-address"
        description="You will receive email with password reset link."
      />
      
      {/* Send reset email button with loading state */}
      <Button
        mode="contained"
        onPress={sendResetPasswordEmail}
        loading={loading}
        disabled={loading}
        style={{ marginTop: 16 }}
      >
        Send Instructions
      </Button>
    </Background>
  )
}

const styles = StyleSheet.create({
  successText: {
    fontSize: 14,
    color: theme.colors.primary,
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
  },
})
