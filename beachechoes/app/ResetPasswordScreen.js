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
  const router = useRouter()
  const [email, setEmail] = useState({ value: '', error: '' })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const sendResetPasswordEmail = async () => {
    const emailError = emailValidator(email.value)
    if (emailError) {
      setEmail({ ...email, error: emailError })
      return
    }

    setLoading(true)
    setSuccess(false)

    try {
      await sendPasswordResetEmail(auth, email.value)
      setSuccess(true)
      setEmail({ value: '', error: '' })
      
      // Navigate back after 2 seconds
      setTimeout(() => {
        router.replace('/LoginScreen')
      }, 2000)
    } catch (error) {
      console.error('Password reset error:', error)
      
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
      <BackButton goBack={() => router.back()} />
      <Logo />
      <Header>Restore Password</Header>
      {success && (
        <Text style={styles.successText}>
          Password reset email sent! Check your inbox.
        </Text>
      )}
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
