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
        {/* Profile Image */}
        <Image
          source={{ uri: 'https://via.placeholder.com/120' }}
          style={styles.avatar}
        />

        {/* Username */}
        {editing ? (
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
          />
        ) : (
          <Text style={styles.username}>{name}</Text>
        )}

        {/* Bio */}
        {editing ? (
          <TextInput
            style={[styles.input, styles.bio]}
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

        {/* Stats (placeholder for now) */}
        <View style={styles.stats}>
          <Text>🌊 Echoes: 0</Text>
          <Text>⬆️ Upvotes: 0</Text>
        </View>

        {/* Buttons */}
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
    alignItems: 'center',
    padding: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 15,
  },
  username: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  bioText: {
    marginTop: 8,
    color: 'gray',
    textAlign: 'center',
  },
  stats: {
    flexDirection: 'row',
    gap: 20,
    marginVertical: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    width: '100%',
    padding: 10,
    marginTop: 10,
    textAlign: 'center',
  },
  bio: {
    height: 80,
  },
  center: {
    textAlign: 'center',
    marginTop: 20,
  },
})


