import React, { useCallback, useContext, useEffect, useRef, useState } from 'react'
import {
  View, Text, Image, StyleSheet,
  ScrollView, Alert, TouchableOpacity,
  Switch,
} from 'react-native'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import Background from '../../components/Background'
import Header from '../../components/Header'
import Button from '../../components/Button'
import ImageCard from '../../components/ImageCard'
import { AuthContext } from '../../context/AuthContext'
import { auth } from '../../config/firebase'
import { API_BASE } from '../../config/api'
import { theme } from '../../core/theme'

import logo from '../../assets/images/logo.png'

const normalizeRelationshipStatus = (status) => {
  if (status === 'accepted' || status === 'following') return 'following'
  if (status === 'pending' || status === 'requested') return 'requested'
  if (['self', 'incoming_request', 'declined', 'none'].includes(status)) return status
  return 'none'
}

/**
 * Public profile screen reached via Discover → user tap.
 * Mirrors Profile.js layout (read-only, no edit button).
 * Route: /profile/[userId]  (userId = firebase_uid)
 */
export default function UserProfile() {
  const { userId } = useLocalSearchParams()
  const router = useRouter()
  const { user: currentUser } = useContext(AuthContext)
  const scrollRef = useRef(null)
  const echoesYRef = useRef(0)
  const skipInitialFocusRefreshRef = useRef(true)

  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [echoesCount, setEchoesCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [followersCount, setFollowersCount] = useState(0)

  // Relationship state: self | none | following | requested | incoming_request | declined
  const [relationship, setRelationship] = useState('none')
  const [friendshipLoading, setFriendshipLoading] = useState(false)
  const [muted, setMuted] = useState(false)
  const [muteLoading, setMuteLoading] = useState(false)

  const getToken = useCallback(async () => {
    return await auth.currentUser?.getIdToken()
  }, [])

  const fetchPosts = useCallback(async (neonUserId) => {
    try {
      // Include auth token to get liked status
      const token = await getToken()
      const headers = token ? { Authorization: `Bearer ${token}` } : {}

      const res = await fetch(`${API_BASE}/posts/user/${neonUserId}`, { headers })
      const data = await res.json()
      if (data?.success) {
        setPosts(data.posts ?? [])
      }
    } catch (err) {
      console.log('Failed to fetch posts:', err)
    }
  }, [getToken])

  const fetchProfile = useCallback(async ({ refreshPosts = true } = {}) => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`${API_BASE}/profile/${encodeURIComponent(userId)}`)
      const data = await res.json()

      if (data?.success && data?.profile) {
        setError(null)
        setName(data.profile.name ?? '')
        setBio(data.profile.bio ?? '')
        setAvatarUrl(data.profile.avatar_url ?? data.profile.avatarUrl ?? null)

        setEchoesCount(data.profile.echoes_count ?? 0)
        setFollowingCount(data.profile.following_count ?? 0)
        setFollowersCount(data.profile.followers_count ?? 0)

        if (data.profile.id) {
          if (refreshPosts) {
            await fetchPosts(data.profile.id)
          }
        }
      } else {
        setError(data?.error || 'Profile not found')
      }
    } catch (err) {
      console.error('Profile fetch error:', err)
      setError('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }, [fetchPosts, userId])

  const fetchFriendshipStatus = useCallback(async () => {
    try {
      const token = await getToken()
      if (!token || !userId) return

      const res = await fetch(`${API_BASE}/friendships/status/${encodeURIComponent(userId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()

      if (data?.success) {
        // Mirror the backend's one-way relationship model instead of inferring it client-side.
        setRelationship(normalizeRelationshipStatus(data.status || data.relationship))
      }
    } catch (err) {
      console.log('Failed to fetch friendship status:', err)
    }
  }, [getToken, userId])

  const fetchMuteStatus = useCallback(async () => {
    try {
      if (!currentUser?.uid || currentUser.uid === userId) {
        setMuted(false)
        return
      }
      const token = await getToken()
      if (!token || !userId) return

      const res = await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}/mute-status`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data?.success) {
        setMuted(!!data.muted)
      }
    } catch (err) {
      console.log('Failed to fetch mute status:', err)
    }
  }, [currentUser?.uid, getToken, userId])

  useEffect(() => {
    if (!userId) return
    skipInitialFocusRefreshRef.current = true
    fetchProfile({ refreshPosts: true })
  }, [fetchProfile, userId])

  useEffect(() => {
    if (!userId) return
    fetchFriendshipStatus()
    fetchMuteStatus()
  }, [fetchFriendshipStatus, fetchMuteStatus, userId])

  useFocusEffect(
    useCallback(() => {
      if (!userId) return undefined
      if (skipInitialFocusRefreshRef.current) {
        skipInitialFocusRefreshRef.current = false
        return undefined
      }
      fetchProfile({ refreshPosts: false })
      fetchFriendshipStatus()
      return undefined
    }, [fetchFriendshipStatus, fetchProfile, userId])
  )

  const handleLikeToggle = (postId, liked, likeCount) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, liked, like_count: likeCount }
          : post
      )
    )
  }

  const handleMuteToggle = async (nextMuted) => {
    try {
      setMuteLoading(true)
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')

      const res = await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}/mute`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ muted: nextMuted }),
      })
      const data = await res.json()
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to update mute status')
      }
      setMuted(!!data.muted)
    } catch (err) {
      console.error('Mute toggle error:', err)
      Alert.alert('Error', 'Could not update mute setting')
    } finally {
      setMuteLoading(false)
    }
  }

  const handleFollow = async () => {
    try {
      setFriendshipLoading(true)
      const token = await getToken()

      const res = await fetch(`${API_BASE}/friendships/follow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ friendUid: userId }),
      })
      const data = await res.json()

      if (data?.success) {
        const nextRelationship = normalizeRelationshipStatus(data.status || data.relationship || 'requested')
        const wasFollowing = relationship === 'following'
        setRelationship(nextRelationship)
        if (!wasFollowing && nextRelationship === 'following') {
          setFollowersCount((count) => count + 1)
        }
        await fetchProfile({ refreshPosts: false })
      } else {
        Alert.alert('Error', data?.error || 'Failed to follow')
      }
    } catch (err) {
      console.error('Follow error:', err)
      Alert.alert('Error', 'Failed to follow')
    } finally {
      setFriendshipLoading(false)
    }
  }

  const handleUnfollow = () => {
    Alert.alert(
      'Unfollow',
      `Are you sure you want to unfollow ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unfollow', style: 'destructive', onPress: confirmUnfollow },
      ]
    )
  }

  const confirmUnfollow = async () => {
    try {
      setFriendshipLoading(true)
      const token = await getToken()

      const res = await fetch(`${API_BASE}/friendships/unfollow`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ friendUid: userId }),
      })
      const data = await res.json()

      if (data?.success) {
        const wasFollowing = relationship === 'following'
        setRelationship('none')
        if (wasFollowing) {
          setFollowersCount((count) => Math.max(0, count - 1))
        }
        await fetchProfile({ refreshPosts: false })
      } else {
        Alert.alert('Error', data?.error || 'Failed to unfollow')
      }
    } catch (err) {
      console.error('Unfollow error:', err)
      Alert.alert('Error', 'Failed to unfollow')
    } finally {
      setFriendshipLoading(false)
    }
  }

  const handleAcceptIncomingRequest = async () => {
    try {
      setFriendshipLoading(true)
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')

      const res = await fetch(`${API_BASE}/friendships/accept`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ friend_firebase_uid: userId }),
      })
      const data = await res.json()

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to accept friend request')
      }

      await Promise.all([
        fetchProfile({ refreshPosts: false }),
        fetchFriendshipStatus(),
      ])
    } catch (err) {
      console.error('Accept incoming friend request error:', err)
      Alert.alert('Error', 'Failed to accept friend request')
    } finally {
      setFriendshipLoading(false)
    }
  }

  const handleDeclineIncomingRequest = async () => {
    try {
      setFriendshipLoading(true)
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')

      const res = await fetch(`${API_BASE}/friendships/decline`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ friend_firebase_uid: userId }),
      })
      const data = await res.json()

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to decline friend request')
      }

      await Promise.all([
        fetchProfile({ refreshPosts: false }),
        fetchFriendshipStatus(),
      ])
    } catch (err) {
      console.error('Decline incoming friend request error:', err)
      Alert.alert('Error', 'Failed to decline friend request')
    } finally {
      setFriendshipLoading(false)
    }
  }



  // Determine follow button label, action, and disabled state based on relationship
  const getFollowButton = () => {
    if (relationship === 'following') {
      return { label: 'Following', onPress: handleUnfollow, disabled: false, mode: 'outlined' }
    }
    if (relationship === 'requested') {
      return { label: 'Requested', onPress: undefined, disabled: true, mode: 'outlined', labelStyle: styles.requestedButtonText }
    }
    // Private/public approval rules are handled by the backend follow endpoint.
    return { label: 'Follow', onPress: handleFollow, disabled: false, mode: 'contained' }
  }

  if (loading) {
    return (
      <Background>
        <Header>Profile</Header>
        <Text style={styles.center}>Loading...</Text>
      </Background>
    )
  }

  if (error || !name) {
    return (
      <Background>
        <Header>Profile</Header>
        <Text style={styles.errorText}>{error || 'User not found'}</Text>
        <Button mode="outlined" onPress={() => router.back()}>
          Go Back
        </Button>
      </Background>
    )
  }

  const followBtn = getFollowButton()
  const showFriendshipControls = currentUser?.uid !== userId && relationship !== 'self'

  return (
    <Background>
      <Header>Profile</Header>

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.card}>
          <Image
            source={logo}
            style={styles.cardWatermark}
            resizeMode="contain"
            pointerEvents="none"
          />

          {/* Avatar */}
          <Image
            source={{
              uri:
                avatarUrl ||
                'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png',
            }}
            style={styles.avatar}
          />

          {/* Name */}
          <Text style={styles.username}>{name}</Text>

          {muted && currentUser?.uid !== userId && (
            <View style={styles.mutedBadge}>
              <Text style={styles.mutedBadgeText}>Muted</Text>
            </View>
          )}

          {/* Bio */}
          <Text style={styles.bioText}>{bio || 'No bio yet'}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          <TouchableOpacity style={styles.statItem} onPress={() => scrollRef.current?.scrollTo({ y: echoesYRef.current, animated: true })}>
            <Text style={styles.statNumber}>{echoesCount}</Text>
            <Text style={styles.statLabel}>Echoes</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.statItem} onPress={() => router.push(`/profile/connections?userId=${userId}&type=following&name=${encodeURIComponent(name)}`)}>
            <Text style={styles.statNumber}>{followingCount}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.statItem} onPress={() => router.push(`/profile/connections?userId=${userId}&type=followers&name=${encodeURIComponent(name)}`)}>
            <Text style={styles.statNumber}>{followersCount}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </TouchableOpacity>
        </View>

        {/* Follow / Following button */}
        {showFriendshipControls && relationship === 'incoming_request' ? (
          <View style={styles.incomingRequestActions}>
            <Button
              mode="contained"
              style={styles.incomingRequestButton}
              onPress={handleAcceptIncomingRequest}
              disabled={friendshipLoading}
            >
              {friendshipLoading ? 'Loading...' : 'Accept'}
            </Button>
            <Button
              mode="outlined"
              style={[styles.incomingRequestButton, styles.declineIncomingButton]}
              onPress={handleDeclineIncomingRequest}
              disabled={friendshipLoading}
            >
              Decline
            </Button>
          </View>
        ) : showFriendshipControls && (
          <Button
            mode={followBtn.mode}
            onPress={followBtn.onPress}
            disabled={followBtn.disabled || friendshipLoading}
            labelStyle={followBtn.labelStyle}
          >
            {friendshipLoading ? 'Loading...' : followBtn.label}
          </Button>
        )}

        {currentUser?.uid !== userId && (
          <View style={styles.muteRow}>
            <View style={styles.muteTextCol}>
              <Text style={styles.muteTitle}>Mute this user</Text>
              <Text style={styles.muteSubtitle}>Hide their posts from your feed and map.</Text>
            </View>
            <Switch
              value={muted}
              onValueChange={handleMuteToggle}
              disabled={muteLoading}
            />
          </View>
        )}

        {/* Back button */}
        <Button mode="outlined" onPress={() => router.back()}>
          Go Back
        </Button>

        {/* User's Echoes */}
        <View style={styles.messagesSection} onLayout={(e) => { echoesYRef.current = e.nativeEvent.layout.y }}>
          <Text style={styles.sectionTitle}>{name}'s Echoes</Text>
          {posts.length > 0 ? (
            posts.map((post) => (
              <ImageCard
                key={post.id}
                postId={post.id}
                image={{ uri: post.image_url }}
                username={post.is_anonymous ? 'Anonymous' : name}
                likeCount={post.like_count}
                initialLiked={post.liked}
                onLikeToggle={handleLikeToggle}
                commentCount={post.comment_count || 0}
                onCommentPress={(postId) => router.push(`/PostWithComments?postId=${postId}`)}
                onImagePress={(postId) => router.push(`/PostDetail?ids=${postId}`)}
              >
                {post.overlay_text}
              </ImageCard>
            ))
          ) : (
            <View style={styles.emptyEchoCard}>
              <Text style={styles.emptyEchoText}>No Echoes Created</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </Background>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  scrollView: {
    width: '115%',
  },
  card: {
    width: '100%',
    alignSelf: 'stretch',
    alignItems: 'center',
    padding: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  cardWatermark: {
    position: 'absolute',
    top: -10,
    left: -30,
    right: -30,
    bottom: -10,
    opacity: 0.06,
    transform: [{ rotate: '-10deg' }],
  },
  avatar: {
    width: 180,
    height: 180,
    borderRadius: 90,
    marginBottom: 18,
    backgroundColor: '#eee',
  },
  username: {
    fontSize: 28,
    fontWeight: '700',
  },
  bioText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  statsCard: {
    width: '100%',
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#eee',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    color: '#777',
    fontSize: 14,
    marginTop: 4,
  },
  messagesSection: {
    width: '100%',
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  muteRow: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  muteTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  muteTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
  },
  muteSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  mutedBadge: {
    marginTop: 6,
    marginBottom: 4,
    backgroundColor: '#eef2ff',
    borderColor: '#c7d2fe',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  mutedBadgeText: {
    color: '#3730a3',
    fontSize: 12,
    fontWeight: '700',
  },
  center: {
    textAlign: 'center',
    marginTop: 24,
  },
  emptyEchoCard: {
    width: '100%',
    backgroundColor: '#d1d1d1',
    borderRadius: 16,
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyEchoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error,
    textAlign: 'center',
    marginVertical: 12,
  },
  requestedButtonText: {
    color: '#ffffff',
  },
  incomingRequestActions: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginVertical: 10,
  },
  incomingRequestButton: {
    flex: 1,
    width: 'auto',
    marginVertical: 0,
  },
  declineIncomingButton: {
    backgroundColor: theme.colors.error,
  },
})
