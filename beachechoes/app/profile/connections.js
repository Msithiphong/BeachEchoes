import React, { useEffect, useState } from 'react'
import {
  View, Text, Image, StyleSheet,
  FlatList, TouchableOpacity,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import Background from '../../components/Background'
import Header from '../../components/Header'
import Button from '../../components/Button'
import { API_BASE } from '../../config/api'
import { theme } from '../../core/theme'

/**
 * Connections list screen — shows Following or Followers.
 * Route: /profile/connections?userId=<firebase_uid>&type=following|followers&name=<display name>
 */
export default function Connections() {
  const { userId, type, name } = useLocalSearchParams()
  const router = useRouter()

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  const title = type === 'followers' ? `${name || 'User'}'s Followers` : `${name || 'User'} Following`

  useEffect(() => {
    if (!userId || !type) return
    fetchConnections()
  }, [userId, type])

  const fetchConnections = async () => {
    try {
      const endpoint = type === 'followers' ? 'followers' : 'following'
      const res = await fetch(`${API_BASE}/friendships/${endpoint}/${encodeURIComponent(userId)}`)
      const data = await res.json()
      if (data?.success) {
        setUsers(data.users ?? [])
      }
    } catch (err) {
      console.error('Connections fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const renderUser = ({ item }) => (
    <TouchableOpacity
      style={styles.userRow}
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
      <Text style={styles.userName}>{item.name}</Text>
    </TouchableOpacity>
  )

  return (
    <Background>
      <Header>{title}</Header>

      {loading ? (
        <Text style={styles.center}>Loading...</Text>
      ) : users.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {type === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.firebase_uid}
          renderItem={renderUser}
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
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eee',
    marginRight: 14,
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
  },
  center: {
    textAlign: 'center',
    marginTop: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
  },
})
