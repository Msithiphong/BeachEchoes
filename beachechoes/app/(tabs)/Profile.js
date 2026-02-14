import React, { useContext, useEffect, useState } from 'react'
import { View, Text, StyleSheet, Image, TextInput, Alert, TouchableOpacity, ActivityIndicator } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import Background from '../../components/Background'
import Header from '../../components/Header'
import Button from '../../components/Button'
import { AuthContext } from '../../context/AuthContext'
import { uploadAvatar } from '../../helpers/avatarUpload'
import { auth } from '../../config/firebase'
import { API_BASE } from '../../config/api'

export default function Profile() {
  const { user } = useContext(AuthContext)

  const [name, setName] = useState(user?.name || '')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/profile/${user.uid}`)
      const data = await res.json()

      if (data.success) {
        setName(data.profile.name)
        setBio(data.profile.bio || '')
        setAvatarUrl(data.profile.avatar_url)
      }
    } catch (error) {
      console.log('Profile not found yet, using defaults')
    } finally {
      setLoading(false)
    }
  }

  const saveProfile = async () => {
    try {
      const token = await auth.currentUser?.getIdToken()
      
      const res = await fetch(`${API_BASE}/profile/${user.uid}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ name, bio, avatarUrl }),
      })

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error)
      }

      setEditing(false)
      Alert.alert('Success', 'Profile updated')
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile')
    }
  }

  const pickAvatar = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library')
        return
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5, // Reduced for smaller file size
        base64: false,
      })

      if (!result.canceled) {
        setUploadingAvatar(true)
        try {
          const uploadedUrl = await uploadAvatar(user.uid, result.assets[0].uri)
          setAvatarUrl(uploadedUrl)
          Alert.alert('Success', 'Avatar uploaded! Don\'t forget to save your profile.')
        } catch (error) {
          console.error('Upload failed:', error)
          Alert.alert('Error', 'Failed to upload avatar')
        } finally {
          setUploadingAvatar(false)
        }
      }
    } catch (error) {
      console.error('Image picker error:', error)
      Alert.alert('Error', 'Failed to pick image')
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
    <TouchableOpacity onPress={pickAvatar} disabled={uploadingAvatar}>
      <View>
        <Image
          source={{ 
            uri: avatarUrl || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png' 
          }}
          style={styles.avatar}
        />
        {uploadingAvatar && (
          <View style={styles.avatarOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
        <View style={styles.avatarBadge}>
          <Text style={styles.avatarBadgeText}>📷</Text>
        </View>
      </View>
    </TouchableOpacity>

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

  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 90,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarBadge: {
    position: 'absolute',
    bottom: 20,
    right: 10,
    backgroundColor: '#6e5ef6',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },

  avatarBadgeText: {
    fontSize: 20,
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







