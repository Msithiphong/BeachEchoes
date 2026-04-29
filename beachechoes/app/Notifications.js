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

const POLLING_INTERVAL_MS = 30000 // 30 seconds

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
    fetchNotifications()

    // Poll for new notifications every 30 seconds
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
      // Navigate to accept/decline screen or show inline actions
      // For now, we'll handle friend requests inline
    } else if (notification.type === 'post_liked') {
      // Navigate to the post detail or user profile
      router.push(`/PostDetail?ids=${notification.data.post_id}`)
    } else if (notification.type === 'post_expired') {
      // Just mark as read, no navigation
    } else if (notification.type === 'new_follower') {
      // Navigate to the follower's profile
      if (notification.data.from_firebase_uid) {
        router.push(`/profile/${notification.data.from_firebase_uid}`)
      }
    }
  }



  const renderNotification = ({ item }) => {
    const isUnread = !item.read

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
              <Text style={styles.userName}>{item.data.from_name}</Text>
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
                  item.data.liker_avatar_url ||
                  'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png',
              }}
              style={styles.avatar}
            />
            <View style={styles.nameContainer}>
              <Text style={styles.userName}>{item.data.liker_name}</Text>
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

    return null
  }

  // Only count unread notifications of supported types
  const unreadCount = notifications.filter((n) => ['new_follower', 'post_liked', 'post_expired'].includes(n.type) && !n.read).length

  return (
    <Background>
      <Header>
        Notifications {unreadCount > 0 && `(${unreadCount})`}
      </Header>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} />
      ) : notifications.filter((n) => ['new_follower', 'post_liked', 'post_expired'].includes(n.type)).length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No notifications</Text>
        </View>
      ) : (
        <FlatList
          data={notifications.filter((n) => ['new_follower', 'post_liked', 'post_expired'].includes(n.type))}
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
