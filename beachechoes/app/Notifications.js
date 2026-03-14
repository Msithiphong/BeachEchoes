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

export default function Notifications() {
  const router = useRouter()
  const { user } = useContext(AuthContext)

  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchPendingRequests = useCallback(async () => {
    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch(`${API_BASE}/friendships/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data?.success) {
        setRequests(data.requests ?? [])
      }
    } catch (err) {
      console.error('Fetch pending requests error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPendingRequests()
  }, [fetchPendingRequests])

  const handleAccept = async (friendUid) => {
    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch(`${API_BASE}/friendships/accept`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ friendUid }),
      })
      const data = await res.json()
      if (data?.success) {
        setRequests((prev) => prev.filter((r) => r.firebase_uid !== friendUid))
      }
    } catch (err) {
      console.error('Accept error:', err)
      Alert.alert('Error', 'Could not accept request. Try again.')
    }
  }

  const handleDecline = async (friendUid) => {
    try {
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch(`${API_BASE}/friendships/unfollow`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ friendUid }),
      })
      const data = await res.json()
      if (data?.success) {
        setRequests((prev) => prev.filter((r) => r.firebase_uid !== friendUid))
      }
    } catch (err) {
      console.error('Decline error:', err)
      Alert.alert('Error', 'Could not decline request. Try again.')
    }
  }

  const renderRequest = ({ item }) => (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.userInfo}
        onPress={() => router.push(`/profile/${item.firebase_uid}`)}
      >
        <Image
          source={{
            uri:
              item.avatar_url ||
              'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png',
          }}
          style={styles.avatar}
        />
        <View style={styles.nameContainer}>
          <Text style={styles.userName}>{item.name || 'Unknown User'}</Text>
          <Text style={styles.subtitle}>Wants to follow you</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAccept(item.firebase_uid)}
        >
          <Text style={styles.acceptText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.declineButton}
          onPress={() => handleDecline(item.firebase_uid)}
        >
          <Text style={styles.declineText}>Decline</Text>
        </TouchableOpacity>
      </View>
    </View>
  )

  return (
    <Background>
      <Header>Notifications</Header>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} />
      ) : requests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No pending requests</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item.firebase_uid}
          renderItem={renderRequest}
          style={styles.list}
          contentContainerStyle={styles.listContent}
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
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  acceptText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  declineText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 14,
  },
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
