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
    
    if (emailError || passwordError || nameError) {
      setName({ ...name, error: nameError })
      setEmail({ ...email, error: emailError })
      setPassword({ ...password, error: passwordError })
      return
    }

    setLoading(true)

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.value,
        password.value
      )

      // Update user profile with name
      await updateProfile(userCredential.user, {
        displayName: name.value
      })

      // Get fresh ID token
      const idToken = await userCredential.user.getIdToken(true)

      // Sync to Neon DB
      const syncResponse = await fetch(`${API_URL}/api/users/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          display_name: name.value
        })
      })

      const syncData = await syncResponse.json()
      if (!syncData.success) {
        console.error('Failed to sync user to database:', syncData.error)
        // Continue anyway - user is created in Firebase
      }

      // Login user with updated profile
      login({
        uid: userCredential.user.uid,
        email: userCredential.user.email,
        name: name.value
      })

      router.replace('/Dashboard')
    } catch (error) {
      console.error('Registration error:', error)
      
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
