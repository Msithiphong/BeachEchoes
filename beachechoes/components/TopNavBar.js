import React, { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { theme } from '../core/theme'
import { API_BASE } from '../config/api'
import { auth } from '../config/firebase'

export const NAVBAR_HEIGHT = 38

const NOTIFICATION_POLL_INTERVAL_MS = 5000 // 5 seconds

export default function TopNavBar({ translateY }) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchUnreadCount = useCallback(async () => {
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) return

      const res = await fetch(`${API_BASE}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data?.success) {
        const count = data.notifications.filter((n) => !n.read).length
        setUnreadCount(count)
      }
    } catch (err) {
      // Silently fail - this is background polling
      console.log('Fetch unread count error:', err)
    }
  }, [])

  useEffect(() => {
    fetchUnreadCount()

    // Poll for unread notifications
    const interval = setInterval(() => {
      fetchUnreadCount()
    }, NOTIFICATION_POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: insets.top / 6,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={[styles.content, { height: NAVBAR_HEIGHT }]}>
        <Text style={styles.title}></Text>
        <TouchableOpacity onPress={() => router.push('/Notifications')} hitSlop={8}>
          <View>
            <MaterialIcons name="notifications-none" size={26} color={theme.colors.primary} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: '#96c7e3',
    opacity: .95,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
})
