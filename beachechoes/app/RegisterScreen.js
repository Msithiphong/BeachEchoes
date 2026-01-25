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

export default function RegisterScreen() {
  const router = useRouter()
  const { login } = useContext(AuthContext)
  const [name, setName] = useState({ value: '', error: '' })
  const [email, setEmail] = useState({ value: '', error: '' })
  const [password, setPassword] = useState({ value: '', error: '' })
  const [loading, setLoading] = useState(false)

  const onSignUpPressed = async () => {
    const nameError = nameValidator(name.value)
    const emailError = emailValidator(email.value)
    const passwordError = passwordValidator(password.value)
    
    // Edge case: empty fields
    if (!name.value.trim()) {
      setName({ ...name, error: 'Name is required' })
    }
    if (!email.value.trim()) {
      setEmail({ ...email, error: 'Email is required' })
    }
    if (!password.value.trim()) {
      setPassword({ ...password, error: 'Password is required' })
    }

    if (emailError || passwordError || nameError) {
      setName({ ...name, error: nameError })
      setEmail({ ...email, error: emailError })
      setPassword({ ...password, error: passwordError })
      return
    }

    setLoading(true)

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

      const response = await fetch('http://localhost:3000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.value,
          email: email.value,
          password: password.value,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        login(data.user)
        router.replace('/Dashboard')
      } else {
        // Edge case: email already exists
        if (data.error?.includes('unique') || data.error?.includes('already')) {
          setEmail({ ...email, error: 'Email already registered' })
        }
        // Edge case: weak password
        else if (data.error?.includes('password')) {
          setPassword({ ...password, error: data.error })
        }
        // Generic error
        else {
          setEmail({ ...email, error: data.error || 'Registration failed' })
        }
      }
    } catch (error) {
      console.error('Registration error:', error)
      
      // Edge case: network timeout
      if (error.name === 'AbortError') {
        setEmail({ ...email, error: 'Request timeout. Check your connection.' })
      }
      // Edge case: network unavailable
      else if (error.message.includes('Failed to fetch')) {
        setEmail({ ...email, error: 'Network error. Server may be offline.' })
      }
      // Other network errors
      else {
        setEmail({ ...email, error: error.message || 'Network error. Please try again.' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Background>
      <BackButton goBack={() => router.back()} />
      <Logo />
      <Header>Create Account</Header>
      <TextInput
        label="Name"
        returnKeyType="next"
        value={name.value}
        onChangeText={(text) => setName({ value: text, error: '' })}
        error={!!name.error}
        errorText={name.error}
      />
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
      <Button
        mode="contained"
        onPress={onSignUpPressed}
        loading={loading}
        disabled={loading}
        style={{ marginTop: 24 }}
      >
        Sign Up
      </Button>
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
