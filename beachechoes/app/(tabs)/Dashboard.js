import React, { useContext, useEffect } from 'react'
import { View, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import Background from '../../components/Background'
import Logo from '../../components/Logo'
import Header from '../../components/Header'
import Paragraph from '../../components/Paragraph'
import Button from '../../components/Button'
import { AuthContext } from '../../context/AuthContext'
import { signOut } from 'firebase/auth'
import { auth } from '../../config/firebase'

export default function Dashboard() {
  const router = useRouter()
  const { user, logout, loading } = useContext(AuthContext)

  useEffect(() => {
    // Redirect if no user after loading
    if (!loading && !user) {
      router.replace('/StartScreen')
    }
  }, [user, loading])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      logout()
      router.replace('/StartScreen')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Background style={styles.content}>
          <ActivityIndicator size="large" color="#560CCE" />
        </Background>
      </View>
    )
  }

  if (!user) {
    return null // Will redirect in useEffect
  }

  return (
    <View style={styles.container}>
      <Background style={styles.content}>
        <Logo />
        <Header>Welcome, {user.name || 'User'}!</Header>
        <Paragraph>
          Explore California State University Long Beach and Connect with others!
        </Paragraph>
        <Paragraph style={styles.email}>
          Logged in as: {user.email}
        </Paragraph>
        <Button
          mode="outlined"
          onPress={handleLogout}
        >
          Logout
        </Button>
      </Background>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  content: {
    flex: 1,
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  }
})

