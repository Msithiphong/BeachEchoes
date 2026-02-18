/**
 * Dashboard Component
 * 
 * Main landing screen after user authentication. Displays a personalized welcome
 * message and provides access to app features. This is a protected route that
 * redirects to StartScreen if no authenticated user is found.
 * 
 * Features:
 * - Authentication check with auto-redirect
 * - Loading state during auth verification
 * - Personalized welcome message
 * - User email display
 * - Logout functionality
 * 
 * @component
 */

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
  // Navigation hook
  const router = useRouter()
  
  // Access user state and authentication methods from context
  const { user, logout, loading } = useContext(AuthContext)

  /**
   * Authentication Guard Effect
   * 
   * Redirects unauthenticated users to the start screen.
   * Runs whenever user or loading state changes.
   */
  useEffect(() => {
    // Redirect if no user after loading completes
    if (!loading && !user) {
      router.replace('/StartScreen')
    }
  }, [user, loading])

  /**
   * Handle user logout
   * 
   * Signs out from Firebase auth, clears local auth context,
   * and redirects to the start screen.
   * 
   * @async
   */
  const handleLogout = async () => {
    try {
      // Sign out from Firebase
      await signOut(auth)
      
      // Clear local authentication state
      logout()
      
      // Navigate to start screen
      router.replace('/StartScreen')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Loading state: show spinner while checking authentication
  if (loading) {
    return (
      <View style={styles.container}>
        <Background style={styles.content}>
          <ActivityIndicator size="large" color="#560CCE" />
        </Background>
      </View>
    )
  }

  // No user: return null while useEffect handles redirect
  if (!user) {
    return null // Will redirect in useEffect
  }

  // Main dashboard view
  return (
    <View style={styles.container}>
      <Background style={styles.content}>
        {/* App logo */}
        <Logo />
        
        {/* Personalized welcome header */}
        <Header>Welcome, {user.name || 'User'}!</Header>
        
        {/* App tagline */}
        <Paragraph>
          Explore California State University Long Beach and Connect with others!
        </Paragraph>
        
        {/* Display logged-in user email */}
        <Paragraph style={styles.email}>
          Logged in as: {user.email}
        </Paragraph>
        
        {/* Logout button */}
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

