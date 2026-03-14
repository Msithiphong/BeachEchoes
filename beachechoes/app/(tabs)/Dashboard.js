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
import { View, Animated, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import Background from '../../components/Background'
import Logo from '../../components/Logo'
import Header from '../../components/Header'
import Paragraph from '../../components/Paragraph'
import ImageCard from '../../components/ImageCard'
import { AuthContext } from '../../context/AuthContext'
import { ScrollContext } from '../../context/ScrollContext'

export default function Dashboard() {
  // Navigation hook
  const router = useRouter()
  
  // Access user state and scroll handler from context
  const { user, loading } = useContext(AuthContext)
  const { scrollHandler, navbarHeight } = useContext(ScrollContext)

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
      <Background>
        <Animated.ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingTop: navbarHeight }]}
          showsVerticalScrollIndicator={false}
          horizontal={false}
          scrollEventThrottle={1}
          onScroll={scrollHandler}
        >
            {/* App logo */}
            <Logo />
            
            {/* Personalized welcome header */}
            <Header>Welcome, {user.name || 'User'}!</Header>
            
            {/* App tagline */}
            <Paragraph>
              Explore California State University Long Beach and Connect with others!
            </Paragraph>

            {/* Image card */}
            <ImageCard
              image={require('../../assets/mockImages/Pyramid.jpeg')}
              username={user.name || user.email}
              likeCount={42}
            >
              Discover campus landmarks and hidden gems around CSULB!
            </ImageCard>

            <ImageCard
              image={require('../../assets/mockImages/1.jpeg')}
              username="BeachBot"
              likeCount={128}
            >
              The sun sets beautifully over the Liberal Arts building!
            </ImageCard>

            <ImageCard
              image={require('../../assets/mockImages/2.jpeg')}
              username="CampusExplorer"
              likeCount={87}
            >
              Found a quiet study spot near the Japanese Garden.
            </ImageCard>

            <ImageCard
              image={require('../../assets/mockImages/3.jpeg')}
              username="LBStateLife"
              likeCount={256}
            >
              Game day at the Pyramid was electric!
            </ImageCard>

            <ImageCard
              image={require('../../assets/mockImages/4.jpeg')}
              username="SharkFin49"
              likeCount={64}
            >
              Morning coffee at the Nugget is a must.
            </ImageCard>

            <ImageCard
              image={require('../../assets/mockImages/5.jpeg')}
              username="GoBeach"
              likeCount={193}
            >
              Check out the new mural near the Student Union!
            </ImageCard>

            <ImageCard
              image={require('../../assets/mockImages/6.jpeg')}
              username="WaveCatcher"
              likeCount={31}
            >
              Skating through campus on a Friday afternoon.
            </ImageCard>

            <ImageCard
              image={require('../../assets/mockImages/7.jpeg')}
              username="DirtyBirds"
              likeCount={112}
            >
              Late night study sessions at the library hit different.
            </ImageCard>

            <ImageCard
              image={require('../../assets/mockImages/8.jpeg')}
              username="SunsetChaser"
              likeCount={75}
            >
              Nothing beats the view from Brotman Hall at golden hour.
            </ImageCard>
            
            {/* Display logged-in user email 
            <Paragraph style={styles.email}>
              Logged in as: {user.email}
            </Paragraph>
            */}

        </Animated.ScrollView>
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
  scrollView: {
    width: '100%',
  },
  scrollContent: {
    alignItems: 'center',
    paddingVertical: 0,
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  }
})

