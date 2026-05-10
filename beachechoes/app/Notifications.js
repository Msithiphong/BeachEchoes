import React, { useEffect, useState, useContext, useCallback } from 'react'
import {
  View, Text, Image, StyleSheet,
  FlatList, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import Background from '../components/Background'
import Header from '../components/Header'
import Button from '../components/Button'
import { API_BASE } from '../config/api'
import { auth } from '../config/firebase'
import { AuthContext } from '../context/AuthContext'
import { theme } from '../core/theme'

// Use shorter polling interval for tests, longer for production
const POLLING_INTERVAL_MS = process.env.NODE_ENV === 'test' ? 200 : 5000

export default function Notifications() {
  const router = useRouter()
  const { user } = useContext(AuthContext)

  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true)
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch(`${API_BASE}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data?.success) {
        setNotifications(data.notifications ?? [])
      }
    } catch (err) {
      console.error('Fetch notifications error:', err)
    } finally {
      setLoading(false)
      if (isRefresh) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    // Fetch notifications on mount
    fetchNotifications()

    // Poll for new notifications
    const interval = setInterval(() => {
      fetchNotifications(true)
    }, POLLING_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [fetchNotifications])

  const markAsRead = async (notificationIds) => {
    try {
      const token = await auth.currentUser?.getIdToken()
      await fetch(`${API_BASE}/notifications/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notificationIds }),
      })
      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          notificationIds.includes(n.id) ? { ...n, read: true } : n
        )
      )
    } catch (err) {
      console.error('Mark as read error:', err)
    }
  }

  const handleNotificationPress = async (notification) => {
    // Mark as read
    if (!notification.read) {
      await markAsRead([notification.id])
    }

    // Navigate based on type
    if (notification.type === 'friend_request') {
      // Don't navigate for friend requests - handle inline with buttons
      return
    } else if (notification.type === 'post_liked') {
      // Navigate to the post detail or user profile
      router.push(`/PostWithComments?postId=${notification.data.post_id}`)
    } else if (notification.type === 'post_expired') {
      // Just mark as read, no navigation
    } else if (notification.type === 'new_follower') {
      // Navigate to the follower's profile
      if (notification.data.from_firebase_uid) {
        router.push(`/profile/${notification.data.from_firebase_uid}`)
      }
    } else if (notification.type === 'comment_on_post' || notification.type === 'comment_reply') {
      // Navigate to the post with comments
      router.push(`/PostWithComments?postId=${notification.data.post_id}`)
    }
  }

  const handleAcceptFriendRequest = async (notification) => {
    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch(`${API_BASE}/friendships/accept`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ friend_firebase_uid: notification.data.from_firebase_uid }),
      })
      
      if (res.ok) {
        // Remove the notification from the list
        setNotifications((prev) => prev.filter((n) => n.id !== notification.id))
      } else {
        Alert.alert('Error', 'Failed to accept friend request')
      }
    } catch (err) {
      console.error('Accept friend request error:', err)
      Alert.alert('Error', 'Failed to accept friend request')
    }
  }

  const handleDeclineFriendRequest = async (notification) => {
    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch(`${API_BASE}/friendships/decline`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ friend_firebase_uid: notification.data.from_firebase_uid }),
      })
      
      if (res.ok) {
        // Remove the notification from the list
        setNotifications((prev) => prev.filter((n) => n.id !== notification.id))
      } else {
        Alert.alert('Error', 'Failed to decline friend request')
      }
    } catch (err) {
      console.error('Decline friend request error:', err)
      Alert.alert('Error', 'Failed to decline friend request')
    }
  }



  const renderNotification = ({ item }) => {
    const isUnread = !item.read

    // Render friend request notifications
    if (item.type === 'friend_request') {
      // Check if this is an accepted notification
      if (item.data.accepted) {
        return (
          <TouchableOpacity
            style={[styles.card, isUnread && styles.unreadCard]}
            onPress={() => handleNotificationPress(item)}
          >
            <View style={styles.userInfo}>
              <Image
                source={{
                  uri:
                    item.data.from_avatar_url ||
                    'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png',
                }}
                style={styles.avatar}
              />
              <View style={styles.nameContainer}>
                <Text style={styles.userName}>{item.data.from_user_name}</Text>
                <Text style={styles.subtitle}>Accepted your friend request</Text>
                <Text style={styles.timeText}>
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
            </View>
            {isUnread && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        )
      }

      // Render pending friend request with Accept/Decline buttons
      return (
        <View style={[styles.card, isUnread && styles.unreadCard]}>
          <View style={styles.userInfo}>
            <Image
              source={{
                uri:
                  item.data.from_avatar_url ||
                  'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png',
              }}
              style={styles.avatar}
            />
            <View style={styles.nameContainer}>
              <Text style={styles.userName}>{item.data.from_user_name}</Text>
              <Text style={styles.subtitle}>Sent you a friend request</Text>
              <Text style={styles.timeText}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleAcceptFriendRequest(item)}
            >
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.declineButton]}
              onPress={() => handleDeclineFriendRequest(item)}
            >
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>
          </View>
          {isUnread && <View style={styles.unreadDot} />}
        </View>
      )
    }

    // Only render 'new_follower', 'post_liked', and 'post_expired' notifications
    if (item.type === 'new_follower') {
      return (
        <TouchableOpacity
          style={[styles.card, isUnread && styles.unreadCard]}
          onPress={() => handleNotificationPress(item)}
        >
          <View style={styles.userInfo}>
            <Image
              source={{
                uri:
                  item.data.from_avatar_url ||
                  'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png',
              }}
              style={styles.avatar}
            />
            <View style={styles.nameContainer}>
              <Text style={styles.userName}>{item.data.from_user_name || item.data.from_name}</Text>
              <Text style={styles.subtitle}>Started following you</Text>
              <Text style={styles.timeText}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
          {isUnread && <View style={styles.unreadDot} />}
        </TouchableOpacity>
      )
    }

    if (item.type === 'post_liked') {
      return (
        <TouchableOpacity
          style={[styles.card, isUnread && styles.unreadCard]}
          onPress={() => handleNotificationPress(item)}
        >
          <View style={styles.userInfo}>
            <Image
              source={{
                uri:
                  item.data.from_avatar_url || item.data.liker_avatar_url ||
                  'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png',
              }}
              style={styles.avatar}
            />
            <View style={styles.nameContainer}>
              <Text style={styles.userName}>{item.data.from_user_name || item.data.liker_name}</Text>
              <Text style={styles.subtitle}>Liked your post</Text>
              <Text style={styles.timeText}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
          {isUnread && <View style={styles.unreadDot} />}
        </TouchableOpacity>
      )
    }

    if (item.type === 'post_expired') {
      return (
        <TouchableOpacity
          style={[styles.card, isUnread && styles.unreadCard]}
          onPress={() => handleNotificationPress(item)}
        >
          <View style={styles.userInfo}>
            <View style={[styles.avatar, styles.expiredIcon]}>
              <Text style={styles.expiredEmoji}>⏱️</Text>
            </View>
            <View style={styles.nameContainer}>
              <Text style={styles.userName}>Post Expired</Text>
              <Text style={styles.subtitle}>{item.data.overlay_text}</Text>
              <Text style={styles.timeText}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
          {isUnread && <View style={styles.unreadDot} />}
        </TouchableOpacity>
      )
    }

    if (item.type === 'comment_on_post') {
      return (
        <TouchableOpacity
          style={[styles.card, isUnread && styles.unreadCard]}
          onPress={() => handleNotificationPress(item)}
        >
          <View style={styles.userInfo}>
            <Image
              source={{
                uri:
                  item.data.from_avatar_url ||
                  'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png',
              }}
              style={styles.avatar}
            />
            <View style={styles.nameContainer}>
              <Text style={styles.userName}>{item.data.from_user_name}</Text>
              <Text style={styles.subtitle}>
                Commented on your post: "{item.data.content_preview}"
              </Text>
              <Text style={styles.timeText}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
          {isUnread && <View style={styles.unreadDot} />}
        </TouchableOpacity>
      )
    }

    if (item.type === 'comment_reply') {
      return (
        <TouchableOpacity
          style={[styles.card, isUnread && styles.unreadCard]}
          onPress={() => handleNotificationPress(item)}
        >
          <View style={styles.userInfo}>
            <Image
              source={{
                uri:
                  item.data.from_avatar_url ||
                  'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png',
              }}
              style={styles.avatar}
            />
            <View style={styles.nameContainer}>
              <Text style={styles.userName}>{item.data.from_user_name}</Text>
              <Text style={styles.subtitle}>
                Replied to your comment: "{item.data.content_preview}"
              </Text>
              <Text style={styles.timeText}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
          {isUnread && <View style={styles.unreadDot} />}
        </TouchableOpacity>
      )
    }

    return null
  }

  // Filter to only show unread notifications of supported types
  const unreadNotifications = notifications.filter(
    (n) => ['new_follower', 'post_liked', 'post_expired', 'comment_on_post', 'comment_reply', 'friend_request'].includes(n.type) && !n.read
  )
  const unreadCount = unreadNotifications.length

  return (
    <Background>
      <Header>
        Notifications {unreadCount > 0 && `(${unreadCount})`}
      </Header>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} />
      ) : unreadNotifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No unread notifications</Text>
        </View>
      ) : (
        <FlatList
          data={unreadNotifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderNotification}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true)
            fetchNotifications(true)
          }}
        />
      )}

      <Button mode="outlined" onPress={() => router.back()}>
        Go Back
      </Button>
    </Background>
  )
}

const styles = StyleSheet.create({
  list: {
    width: '100%',
  },
  listContent: {
    paddingBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  unreadCard: {
    backgroundColor: '#fffaed',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  unreadDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    backgroundColor: '#eee',
  },
  expiredIcon: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  expiredEmoji: {
    fontSize: 24,
  },
  nameContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  subtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  timeText: {
    fontSize: 11,
    color: '#aaa',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    backgroundColor: theme.colors.primary,
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  declineButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  declineButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
  // ...existing code...
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
})
