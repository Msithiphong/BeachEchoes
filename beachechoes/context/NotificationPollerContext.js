/**
 * Notification Poller Context Module
 * 
 * Provides global notification polling across the BeachEchoes app.
 * This context wraps the entire app and polls for new notifications every 5 seconds,
 * triggering local notifications for unread items.
 * 
 * Features:
 * - Automatic polling for authenticated users only
 * - Local notification triggering for new notifications
 * - AsyncStorage tracking to prevent duplicate notifications
 * - Stops polling when user logs out
 * - Designed for future push notification integration
 * 
 * Usage:
 * ```javascript
 * // Simply wrap your app with this provider - polling is automatic
 * <NotificationPollerProvider>
 *   <App />
 * </NotificationPollerProvider>
 * ```
 * 
 * @module context/NotificationPollerContext
 */

import React, { createContext, useEffect, useRef, useContext, useCallback } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AuthContext } from './AuthContext'
import { requestPermissions, scheduleCustomNotification } from '../components/LocalNotifications'
import { API_BASE } from '../config/api'
import { auth } from '../config/firebase'

const POLLING_INTERVAL_MS = 5000 // 5 seconds
const SENT_NOTIFICATIONS_KEY = '@beachechoes:sent_notifications'

/**
 * Notification Poller Context
 * 
 * Currently provides no exposed values - polling happens automatically.
 * Future: May expose notification state, unread count, or push notification methods.
 * 
 * @type {React.Context}
 */
export const NotificationPollerContext = createContext()

/**
 * Maps a notification object to a local notification title and body
 * @param {Object} notification - Notification object from backend
 * @returns {Object} Object with title and body strings
 */
function getNotificationContent(notification) {
  const { type, data } = notification

  switch (type) {
    case 'post_liked':
      return {
        title: data.liker_name || 'Someone',
        body: 'liked your post',
      }
    case 'post_expired':
      return {
        title: 'beachechoes',
        body: 'post expired',
      }
    case 'new_follower':
      return {
        title: data.from_name || 'Someone',
        body: 'started following you',
      }
    case 'friend_request':
      return {
        title: data.from_name || 'Someone',
        body: 'sent you a friend request',
      }
    case 'comment_on_post':
      return {
        title: data.from_user_name || 'Someone',
        body: 'commented on your post',
      }
    case 'comment_reply':
      return {
        title: data.from_user_name || 'Someone',
        body: 'replied to your comment',
      }
    default:
      return {
        title: 'beachechoes',
        body: 'You have a new notification',
      }
  }
}

/**
 * Notification Poller Provider Component
 * 
 * Wraps the app and provides automatic notification polling for authenticated users.
 * Polls backend every 5 seconds, triggers local notifications for new/unread items,
 * and tracks sent notification IDs in AsyncStorage to prevent duplicates.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to wrap
 * @returns {JSX.Element} Provider component
 */
export function NotificationPollerProvider({ children }) {
  const { user } = useContext(AuthContext)
  
  // Track IDs locally so polling can stay idempotent across rerenders and restarts.
  const sentNotificationIds = useRef(new Set())

  /**
   * Load sent notification IDs from AsyncStorage
   */
  const loadSentNotificationIds = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(SENT_NOTIFICATIONS_KEY)
      if (stored) {
        const ids = JSON.parse(stored)
        sentNotificationIds.current = new Set(ids)
      }
    } catch (err) {
      console.error('Failed to load sent notification IDs:', err)
    }
  }, [])

  /**
   * Save sent notification IDs to AsyncStorage
   */
  const saveSentNotificationIds = useCallback(async () => {
    try {
      const ids = Array.from(sentNotificationIds.current)
      await AsyncStorage.setItem(SENT_NOTIFICATIONS_KEY, JSON.stringify(ids))
    } catch (err) {
      console.error('Failed to save sent notification IDs:', err)
    }
  }, [])

  /**
   * Fetch notifications from backend and trigger local notifications for new ones
   */
  const pollNotifications = useCallback(async () => {
    try {
      const token = await auth.currentUser?.getIdToken()
      if (!token) return // User not authenticated

      const res = await fetch(`${API_BASE}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      
      if (data?.success) {
        const fetchedNotifications = data.notifications ?? []
        
        // Trigger local notification for each unread notification that hasn't been sent yet
        for (const notification of fetchedNotifications) {
          // Only send if unread and not already sent
          if (!notification.read && !sentNotificationIds.current.has(notification.id)) {
            const { title, body } = getNotificationContent(notification)
            
            try {
              await scheduleCustomNotification(
                title,
                body,
                { notificationId: notification.id, type: notification.type }
              )
              
              // Mark after scheduling succeeds so failed sends can retry on a later poll.
              sentNotificationIds.current.add(notification.id)
            } catch (err) {
              console.error('Failed to send local notification:', err)
            }
          }
        }
        
        // Persist sent notification IDs to AsyncStorage
        await saveSentNotificationIds()
      }
    } catch (err) {
      console.error('Notification polling error:', err)
    }
  }, [saveSentNotificationIds])

  /**
   * Effect: Set up notification polling when user is authenticated
   * 
   * - Requests notification permissions on mount
   * - Loads sent notification IDs from AsyncStorage
   * - Starts polling every 5 seconds
   * - Cleans up interval when user logs out or component unmounts
   */
  useEffect(() => {
    // Only poll if user is authenticated
    if (!user) {
      return
    }

    // Request notification permissions
    const requestNotificationPermissions = async () => {
      try {
        await requestPermissions()
      } catch (err) {
        console.error('Failed to request notification permissions:', err)
      }
    }
    
    // Initialize and start polling
    const initialize = async () => {
      await loadSentNotificationIds()
      await requestNotificationPermissions()
      await pollNotifications() // Initial poll
    }
    
    initialize()

    // Poll for new notifications every 5 seconds
    const interval = setInterval(() => {
      pollNotifications()
    }, POLLING_INTERVAL_MS)

    // Cleanup: Stop polling when user logs out or component unmounts
    return () => clearInterval(interval)
  }, [user, loadSentNotificationIds, pollNotifications])

  return (
    <NotificationPollerContext.Provider value={{}}>
      {children}
    </NotificationPollerContext.Provider>
  )
}
