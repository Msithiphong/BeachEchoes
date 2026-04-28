import React, { useContext, useEffect, useRef, useState } from 'react'
import {
  View, Text, Image, StyleSheet,
  ScrollView, Alert, TouchableOpacity,
  Switch,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import Background from '../../components/Background'
import Header from '../../components/Header'
import Button from '../../components/Button'
import ImageCard from '../../components/ImageCard'
import { AuthContext } from '../../context/AuthContext'
import { auth } from '../../config/firebase'
import { API_BASE } from '../../config/api'
import { theme } from '../../core/theme'

import logo from '../../assets/images/logo.png'

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

  useEffect(() => {
    if (!userId) return
    fetchProfile()
    fetchFriendshipStatus()
    fetchMuteStatus()
  }, [userId])

  const getToken = async () => {
    return await auth.currentUser?.getIdToken()
  }

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/profile/${encodeURIComponent(userId)}`)
      const data = await res.json()

      if (data?.success && data?.profile) {
        setName(data.profile.name ?? '')
        setBio(data.profile.bio ?? '')
        setAvatarUrl(data.profile.avatar_url ?? data.profile.avatarUrl ?? null)

        setEchoesCount(data.profile.echoes_count ?? 0)
        setFollowingCount(data.profile.following_count ?? 0)
        setFollowersCount(data.profile.followers_count ?? 0)

        if (data.profile.id) {
          await fetchPosts(data.profile.id)
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
  }

  const fetchPosts = async (neonUserId) => {
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
  }

  const handleLikeToggle = (postId, liked, likeCount) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, liked, like_count: likeCount }
          : post
      )
    )
  }

  const fetchFriendshipStatus = async () => {
    try {
      const token = await getToken()
      if (!token) return

      const res = await fetch(`${API_BASE}/friendships/status/${encodeURIComponent(userId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()

      if (data?.success) {
        // Backend returns: self, none, following, requested, incoming_request, declined
        setRelationship(data.relationship || 'none')
      }
    } catch (err) {
      console.log('Failed to fetch friendship status:', err)
    }
  }

  const fetchMuteStatus = async () => {
    try {
      if (!currentUser?.uid || currentUser.uid === userId) {
        setMuted(false)
        return
      }
      const token = await getToken()
      if (!token) return

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
        // Backend returns status: 'accepted' (public profile) or 'pending' (private profile)
        if (data.status === 'accepted') {
          setRelationship('following')
        } else {
          setRelationship('requested')
        }
        await fetchProfile()
      } else {
        Alert.alert('Error', data?.error || 'Failed to follow')
      }
    } catch (err) {
      console.error('Follow error:', err)
      Alert.alert('Error', 'Failed to send follow request')
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
        setRelationship('none')
        await fetchProfile()
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

  const handleCancelRequest = () => {
    Alert.alert(
      'Cancel Request',
      `Cancel your follow request to ${name}?`,
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes', style: 'destructive', onPress: confirmCancelRequest },
      ]
    )
  }

  const confirmCancelRequest = async () => {
    try {
      setFriendshipLoading(true)
      const token = await getToken()

      const res = await fetch(`${API_BASE}/friendships/cancel`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ friendUid: userId }),
      })
      const data = await res.json()

      if (data?.success) {
        setRelationship('none')
        await fetchProfile()
      } else {
        Alert.alert('Error', data?.error || 'Failed to cancel request')
      }
    } catch (err) {
      console.error('Cancel request error:', err)
      Alert.alert('Error', 'Failed to cancel request')
    } finally {
      setFriendshipLoading(false)
    }
  }

  const handleAccept = async () => {
    try {
      setFriendshipLoading(true)
      const token = await getToken()

      const res = await fetch(`${API_BASE}/friendships/accept`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ friendUid: userId }),
      })
      const data = await res.json()

      if (data?.success) {
        setRelationship('following')
        await fetchProfile()
      } else {
        Alert.alert('Error', data?.error || 'Failed to accept request')
      }
    } catch (err) {
      console.error('Accept error:', err)
      Alert.alert('Error', 'Failed to accept request')
    } finally {
      setFriendshipLoading(false)
    }
  }

  // Determine follow button label, action, and disabled state based on relationship
  const getFollowButton = () => {
    switch (relationship) {
      case 'following':
        return { label: 'Following', onPress: handleUnfollow, disabled: false, mode: 'outlined' }
      case 'requested':
        return { label: 'Requested', onPress: handleCancelRequest, disabled: false, mode: 'outlined' }
      case 'incoming_request':
        return { label: 'Accept Request', onPress: handleAccept, disabled: false, mode: 'contained' }
      case 'declined':
      case 'none':
      default:
        return { label: 'Follow', onPress: handleFollow, disabled: false, mode: 'contained' }
    }
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

        {/* Follow / Requested / Following / Accept Request button */}
        {currentUser?.uid !== userId && relationship !== 'self' && (
          <Button
            mode={followBtn.mode}
            onPress={followBtn.onPress}
            disabled={followBtn.disabled || friendshipLoading}
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
})
