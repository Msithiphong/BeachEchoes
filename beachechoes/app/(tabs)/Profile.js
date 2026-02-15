import React, { useContext, useEffect, useState } from 'react'
import { View, Text, StyleSheet, Image, TextInput, Alert,
  TouchableOpacity, ActivityIndicator, Switch, ScrollView,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import Background from '../../components/Background'
import Header from '../../components/Header'
import Button from '../../components/Button'
import { AuthContext } from '../../context/AuthContext'
import { uploadAvatar } from '../../helpers/avatarUpload'
import { auth } from '../../config/firebase'
import { API_BASE } from '../../config/api'

// Card watermark logo
import logo from '../../assets/images/logo.png'

export default function Profile() {
  const { user } = useContext(AuthContext)

  const [name, setName] = useState(user?.name || '')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)

  const [anonymousEchoes, setAnonymousEchoes] = useState(false)

  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_BASE}/profile/${user.uid}`)
      const data = await res.json()

      if (data?.success && data?.profile) {
        setName(data.profile.name ?? '')
        setBio(data.profile.bio ?? '')
        setAvatarUrl(data.profile.avatar_url ?? data.profile.avatarUrl ?? null)

        const pref =
          data.profile.anonymous_echoes ??
          data.profile.anonymousEchoes ??
          data.profile.anonymous_echoes_enabled ??
          false

        setAnonymousEchoes(!!pref)
      }
    } catch (error) {
      console.log('Profile not found yet, using defaults')
    } finally {
      setLoading(false)
    }
  }

  const saveProfile = async () => {
    try {
      setSaving(true)
      const token = await auth.currentUser?.getIdToken()

      const payload = {
        // legacy keys (keep for compatibility)
        name,
        bio,
        avatarUrl,

        // recommended keys
        avatar_url: avatarUrl,
        anonymous_echoes: anonymousEchoes,
      }

      const res = await fetch(`${API_BASE}/profile/${user.uid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!data?.success) throw new Error(data?.error || 'Unknown error')

      setEditing(false)
      Alert.alert('Success', 'Profile updated')
    } catch (error) {
      console.error('Save profile error:', error)
      Alert.alert('Error', 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  // Back/Cancel edit: restores saved values
  const cancelEditing = async () => {
    if (saving) return
    setEditing(false)
    await fetchProfile()
  }

  const pickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: false,
      })

      if (!result.canceled) {
        setUploadingAvatar(true)
        try {
          const uploadedUrl = await uploadAvatar(user.uid, result.assets[0].uri)
          setAvatarUrl(uploadedUrl)
          Alert.alert('Success', "Avatar uploaded! Don't forget to save your profile.")
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

  const avatarSize = editing ? 150 : 180

  return (
    <Background>
      <Header>{editing ? 'Edit Profile' : 'Profile'}</Header>

      {/* Make the whole screen scrollable so edit mode never hides controls */}
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back button only on edit screen (now always reachable) */}
        {editing && (
          <TouchableOpacity style={styles.backButton} onPress={cancelEditing} disabled={saving}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        )}

        {/* Profile Card */}
        <View style={styles.card}>
          {/* Watermark behind everything */}
          <Image
            source={logo}
            style={styles.cardWatermark}
            resizeMode="contain"
            pointerEvents="none"
          />

          {/* Avatar */}
          <TouchableOpacity onPress={pickAvatar} disabled={uploadingAvatar || saving}>
            <View>
              <Image
                source={{
                  uri:
                    avatarUrl ||
                    'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png',
                }}
                style={[
                  styles.avatar,
                  { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
                ]}
              />
              {uploadingAvatar && (
                <View style={[styles.avatarOverlay, { borderRadius: avatarSize / 2 }]}>
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
              editable={!saving}
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
              editable={!saving}
            />
          ) : (
            <Text style={styles.bioText}>{bio || 'No bio yet'}</Text>
          )}

          {/* Toggle only in edit mode */}
          {editing && (
            <View style={styles.toggleRow}>
              <View style={styles.toggleTextCol}>
                <Text style={styles.toggleTitle}>Post Echoes anonymously</Text>
                <Text style={styles.toggleSubtitle}>
                  When enabled, your username won’t show on new Echoes.
                </Text>
              </View>

              <Switch value={anonymousEchoes} onValueChange={setAnonymousEchoes} disabled={saving} />
            </View>
          )}
        </View>

        {/* Stats (FORCED same width as card) */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Echoes</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Upvotes</Text>
          </View>
        </View>

        {/* Action */}
        {editing ? (
          <Button onPress={saveProfile} disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        ) : (
          <Button onPress={() => setEditing(true)} disabled={saving}>
            Edit Profile
          </Button>
        )}
      </ScrollView>
    </Background>
  )
}

const styles = StyleSheet.create({
  // Scroll container
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },

  card: {
    width: '100%',
    alignSelf: 'stretch',
    alignItems: 'center',
    padding: 28,
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
    marginBottom: 18,
    backgroundColor: '#eee',
  },

  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  avatarBadge: {
    position: 'absolute',
    bottom: 18,
    right: 8,
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
    marginBottom: 10,
  },

  bioText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },

  bioInput: {
    marginTop: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    width: '100%',
    textAlignVertical: 'top',
    fontSize: 16,
  },

  toggleRow: {
    marginTop: 16,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#f6f6fb',
  },

  toggleTextCol: {
    flex: 1,
    paddingRight: 12,
  },

  toggleTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },

  toggleSubtitle: {
    fontSize: 13,
    color: '#666',
  },

  // Stats: same width as card + centered content
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

  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#f0f0f5',
  },

  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  center: {
    textAlign: 'center',
    marginTop: 24,
  },
})











