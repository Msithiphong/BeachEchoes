/**
 * StartScreen Component
 * 
 * Landing page for unauthenticated users. Provides navigation to login,
 * registration, and development/testing screens.
 * 
 * Features:
 * - App branding (logo and title)
 * - Navigation to Login screen
 * - Navigation to Registration screen
 * - Quick access to Dashboard (development)
 * - Notification testing button (development)
 * 
 * @component
 */

import React from 'react'
import { useRouter } from 'expo-router'
import Background from '../components/Background'
import Logo from '../components/Logo'
import Header from '../components/Header'
import Button from '../components/Button'
import Paragraph from '../components/Paragraph'
import Notifications from '../components/LocalNotifications'


export default function StartScreen() {
  // Navigation hook for routing between screens
  const router = useRouter()
  
  return (
    <Background>
      {/* App logo */}
      <Logo />
      
      {/* App title/header */}
      <Header>Beach Echoes</Header>
      
      {/* App tagline/description */}
      <Paragraph>
        Connect with your fellow CSULB peers
      </Paragraph>
      
      {/* Primary action: Navigate to login */}
      <Button
        mode="outlined"
        onPress={() => router.push('/LoginScreen')}
      >
        Login
      </Button>
      
      {/* Secondary action: Navigate to registration */}
      <Button
        mode="outlined"
        onPress={() => router.push('/RegisterScreen')}
      >
        Sign Up
      </Button>
      
      {/* Development: Quick access to Dashboard */}
      <Button
        mode="outlined"
        onPress={() => router.push('/Dashboard')}
      >
        Dashboard
      </Button>
      
      

      <Button
        mode="contained"
        onPress={() => router.push('/AdminDashboard')}
        >
          Admin Dashboard
        </Button>

      
        
    </Background>
  )
}
