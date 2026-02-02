import React, { useContext, useEffect, useState } from 'react'
import { View, Text, StyleSheet, Image, TextInput, Alert } from 'react-native'
import Background from '../../components/Background'
import Header from '../../components/Header'
import Button from '../../components/Button'
import { AuthContext } from '../../context/AuthContext'



const API_BASE = 'http://localhost:3000/api'

export default function Profile() {
  const { user, updateUser } = useContext(AuthContext)

  const [name, setName] = useState(user?.name || '')
  const [bio, setBio] = useState('')
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/profile/${user.id}`)
      const data = await res.json()

      if (data.success) {
        setName(data.profile.name)
        setBio(data.profile.bio || '')
      }
    } catch (error) {
      console.log('Profile not found yet, using defaults')
    } finally {
      setLoading(false)
    }
  }

  const saveProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/profile/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, bio }),
      })

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error)
      }

      updateUser({ ...user, name })
      setEditing(false)
      Alert.alert('Success', 'Profile updated')
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile')
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

  return (
    <Background>
      <Header>Profile</Header>

      <View style={styles.container}>
  {/* Profile Card */}
  <View style={styles.card}>
    {/* Avatar */}
    <Image
      source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png' }}
      style={styles.avatar}
    />

    {/* Name */}
    {editing ? (
      <TextInput
        style={styles.nameInput}
        value={name}
        onChangeText={setName}
      />
    ) : (
      <Text style={styles.username}>{name}</Text>
    )}

    {/* Bio */}
    {editing ? (
      <TextInput
        style={styles.bioInput}
        value={bio}
        onChangeText={setBio}
        placeholder="Write a short bio..."
        multiline
      />
    ) : (
      <Text style={styles.bioText}>
        {bio || 'No bio yet'}
      </Text>
    )}
  </View>

  {/* Stats */}
  <View style={styles.statsCard}>
    <View style={styles.statItem}>
      <Text style={styles.statNumber}>0</Text>
      <Text style={styles.statLabel}>Echoes</Text>
    </View>
    <View style={styles.statItem}>
      <Text style={styles.statNumber}>0</Text>
      <Text style={styles.statLabel}>Upvotes</Text>
    </View>
  </View>

  {/* Action */}
  {editing ? (
    <Button onPress={saveProfile}>Save Profile</Button>
  ) : (
    <Button onPress={() => setEditing(true)}>Edit Profile</Button>
  )}
</View>

    </Background>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 30, 
  },

  card: {
    alignItems: 'center',
    padding: 32, 
    borderRadius: 20,
    backgroundColor: '#fff',
    marginBottom: 30, 
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },

  avatar: {
    width: 180, 
    height: 180,
    borderRadius: 90,
    marginBottom: 20,
    backgroundColor: '#eee',
  },

  username: {
    fontSize: 28, 
    fontWeight: '700',
  },

  nameInput: {
    fontSize: 24, 
    borderBottomWidth: 2,
    width: '100%',
    textAlign: 'center',
    marginBottom: 12,
  },

  bioText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16, 
    textAlign: 'center',
  },

  bioInput: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    width: '100%',
    textAlignVertical: 'top',
    fontSize: 16,
  },

  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    borderRadius: 18,
    backgroundColor: '#fff',
    marginBottom: 30,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },

  statItem: {
    alignItems: 'center',
  },

  statNumber: {
    fontSize: 22,
    fontWeight: '700',
  },

  statLabel: {
    color: '#777',
    fontSize: 14,
  },

  center: {
    textAlign: 'center',
    marginTop: 24,
  },

  editProfileButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#6e5ef6', 
    alignItems: 'center',
  },

  editProfileButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});







