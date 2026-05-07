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

import React, { useContext, useEffect, useState } from 'react'
import { View, Animated, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import Background from '../../components/Background'
import Logo from '../../components/Logo'
import Header from '../../components/Header'
import Paragraph from '../../components/Paragraph'
import ImageCard from '../../components/ImageCard'
import { AuthContext } from '../../context/AuthContext'
import { ScrollContext } from '../../context/ScrollContext'
import { auth } from '../../config/firebase'
import { API_BASE } from '../../config/api'

export default function Dashboard() {
  // Navigation hook
  const router = useRouter()
  
  // Access user state and scroll handler from context
  const { user, loading } = useContext(AuthContext)
  const { scrollHandler, navbarHeight } = useContext(ScrollContext)

  // Posts state
  const [posts, setPosts] = useState([])
  const [loadingPosts, setLoadingPosts] = useState(true)

  /**
   * Fetch posts from the feed
   */
  const fetchPosts = async () => {
    try {
      setLoadingPosts(true)
      // Include auth token to get liked status
      const token = await auth.currentUser?.getIdToken()
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      
      const res = await fetch(`${API_BASE}/posts/feed`, { headers })
      const data = await res.json()
      if (data?.success) {
        setPosts(data.posts ?? [])
      }
    } catch (error) {
      console.log('Failed to fetch posts:', error)
    } finally {
      setLoadingPosts(false)
    }
  }

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
   * Fetch posts when component mounts and user is authenticated
   */
  useEffect(() => {
    if (user) {
      fetchPosts()
    }
  }, [user])

  /**
   * Handle like toggle from ImageCard
   * Updates the post state with new like count and status
   */
  const handleLikeToggle = (postId, liked, likeCount) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, liked, like_count: likeCount }
          : post
      )
    )
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

            <TouchableOpacity style={styles.refreshBtn} onPress={fetchPosts}>
              <Text style={styles.refreshBtnText}>Refresh Posts</Text>
            </TouchableOpacity>

            {/* Loading state for posts */}
            {loadingPosts ? (
              <ActivityIndicator size="large" color="#560CCE" style={{ marginTop: 20 }} />
            ) : posts.length > 0 ? (
              // Render real posts from the database
              posts.map((post) => (
                <ImageCard
                  key={post.id}
                  postId={post.id}
                  image={{ uri: post.image_url }}
                  username={post.username || 'Anonymous'}
                  ownerFirebaseUid={post.owner_firebase_uid}
                  onUsernamePress={(ownerUid) => router.push(`/profile/${ownerUid}`)}
                  likeCount={post.like_count}
                  initialLiked={post.liked}
                  onLikeToggle={handleLikeToggle}
                  commentCount={post.comment_count || 0}
                  onCommentPress={(postId) => router.push(`/PostWithComments?postId=${postId}`)}
                >
                  {post.overlay_text}
                </ImageCard>
              ))
            ) : (
              // Empty state when no posts exist
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No posts yet. Be the first to share!</Text>
              </View>
            )}
            
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
  },
  emptyState: {
    width: '100%',
    backgroundColor: '#f0f0f5',
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  refreshBtn: {
    marginTop: 12,
    backgroundColor: '#0f172a',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  refreshBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
})
