import React, { useContext, useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  ScrollView,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import Background from '../../components/Background'
import Button from '../../components/Button'
import ImageCard from '../../components/ImageCard'
import { AuthContext } from '../../context/AuthContext'
import { uploadAvatar } from '../../helpers/avatarUpload'
import { auth } from '../../config/firebase'
import { API_BASE } from '../../config/api'
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
        name,
        bio,
        avatarUrl,
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
        quality: 0.6,
        base64: false,
      })

      if (!result.canceled) {
        setUploadingAvatar(true)
        try {
          const uploadedUrl = await uploadAvatar(user.uid, result.assets[0].uri)
          setAvatarUrl(uploadedUrl)
          Alert.alert('Success', "Avatar uploaded! Don’t forget to save your profile.")
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

  // Slightly smaller avatar in edit mode to reduce vertical height (like your mock)
  const avatarSize = editing ? 110 : 120

  // Mock data for "Recent Echoes Posted by you" using the same ImageCard pattern as Dashboard
  const mockRecentEchoes = useMemo(
    () => [
      {
        image: require('../../assets/mockImages/Pyramid.jpeg'),
        username: name || user.email,
        likeCount: 250,
        text: 'A great late night study spot! 🧠📚',
      },
      {
        image: require('../../assets/mockImages/1.jpeg'),
        username: name || user.email,
        likeCount: 33,
        text: 'Go Beach! 🌊',
      },
    ],
    [name, user.email]
  )

  if (loading) {
    return (
      <Background>
        <Text style={styles.loadingText}>Loading...</Text>
      </Background>
    )
  }

  return (
    <Background>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Big page title like the mock */}
        <Text style={styles.pageTitle}>{editing ? 'Edit Profile' : 'My Profile'}</Text>

        {/* Edit screen back button (kept inside scroll so it never gets hidden) */}
        {editing && (
          <TouchableOpacity style={styles.backChip} onPress={cancelEditing} disabled={saving}>
            <Text style={styles.backChipText}>← Back</Text>
          </TouchableOpacity>
        )}

        {/* ===== Main profile card (glassy look) ===== */}
        <View style={styles.profileCard}>
          {/* very subtle watermark */}
          <Image source={logo} style={styles.cardWatermark} resizeMode="contain" pointerEvents="none" />

          {/* Avatar overlaps the card slightly (like mock) */}
          <View style={styles.avatarRow}>
            <TouchableOpacity onPress={pickAvatar} disabled={uploadingAvatar || saving}>
              <View style={styles.avatarWrap}>
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

                {/* Small plus badge / camera badge */}
                <View style={styles.avatarPlus}>
                  <Text style={styles.avatarPlusText}>＋</Text>
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.rightInfo}>
              {/* Username big on the right like mock */}
              {editing ? (
                <TextInput
                  style={styles.nameInput}
                  value={name}
                  onChangeText={setName}
                  editable={!saving}
                  placeholder="Your Name"
                />
              ) : (
                <Text style={styles.displayName}>{name || 'Your Name'}</Text>
              )}

              {/* "Edit Profile  >" row on profile page */}
              {!editing && (
                <TouchableOpacity style={styles.editRow} onPress={() => setEditing(true)}>
                  <Text style={styles.editRowText}>Edit Profile</Text>
                  <Text style={styles.chev}>›</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Bio row like mock */}
          <View style={styles.bioRow}>
            <Text style={styles.bioLabel}>Bio:</Text>

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
              <Text style={styles.bioValue}>{bio || 'No bio yet'}</Text>
            )}
          </View>

          {/* Optional: show email in edit mode (matches mock idea without password stuff) */}
          {editing && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Your Email</Text>
              <Text style={styles.infoValue}>{user.email || '—'}</Text>
            </View>
          )}

          {/* Stats section inside the card (like your mock "Echoes / Friends") */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Echoes</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statBox}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Upvotes</Text>
            </View>
          </View>
        </View>

        {/* ===== Edit-only settings card (toggle area like mock) ===== */}
        {editing && (
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Anonymity</Text>
              <Switch value={anonymousEchoes} onValueChange={setAnonymousEchoes} disabled={saving} />
            </View>

            <Text style={styles.settingHint}>
              When enabled, your username won’t show on new Echoes.
            </Text>
          </View>
        )}

        {/* ===== Recent Echoes section like mock ===== */}
        {!editing && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Echoes Posted by you:</Text>

            {mockRecentEchoes.map((e, idx) => (
              <View key={idx} style={{ marginTop: 12 }}>
                <ImageCard image={e.image} username={e.username} likeCount={e.likeCount}>
                  {e.text}
                </ImageCard>
              </View>
            ))}
          </View>
        )}

        {/* Bottom action button */}
        <View style={{ marginTop: 18 }}>
          {editing ? (
            <Button onPress={saveProfile} disabled={saving}>
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          ) : (
            <Button onPress={() => setEditing(true)} disabled={saving}>
              Edit Profile
            </Button>
          )}
        </View>
      </ScrollView>
    </Background>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 40,
  },

  loadingText: {
    marginTop: 24,
    textAlign: 'center',
  },

  // Big title like your mock
  pageTitle: {
    fontSize: 40,
    fontWeight: '800',
    color: '#111',
    marginBottom: 10,
  },

  backChip: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.65)',
  },

  backChipText: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Main glassy profile card
  profileCard: {
    width: '100%',
    borderRadius: 24,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.70)',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 1,
    overflow: 'hidden',
  },

  cardWatermark: {
    position: 'absolute',
    top: -10,
    left: -20,
    right: -20,
    bottom: -10,
    opacity: 0.05,
    transform: [{ rotate: '-10deg' }],
  },

  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatarWrap: {
    width: 132,
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatar: {
    backgroundColor: '#eee',
  },

  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Small plus badge like mock
  avatarPlus: {
    position: 'absolute',
    bottom: 6,
    right: 18,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },

  avatarPlusText: {
    fontSize: 18,
    fontWeight: '900',
    marginTop: -1,
  },

  rightInfo: {
    flex: 1,
    paddingLeft: 10,
    justifyContent: 'center',
  },

  displayName: {
    fontSize: 34,
    fontWeight: '800',
    color: '#111',
  },

  nameInput: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111',
    borderBottomWidth: 2,
    paddingBottom: 6,
  },

  editRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },

  editRowText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
  },

  chev: {
    fontSize: 22,
    fontWeight: '700',
    marginLeft: 8,
    marginTop: -2,
    color: '#222',
  },

  bioRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  bioLabel: {
    width: 44,
    fontSize: 16,
    fontWeight: '800',
    color: '#222',
    marginTop: 2,
  },

  bioValue: {
    flex: 1,
    fontSize: 16,
    color: '#222',
    paddingRight: 6,
  },

  bioInput: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.18)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },

  infoRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  infoLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#333',
  },

  infoValue: {
    fontSize: 14,
    color: '#333',
    maxWidth: '65%',
    textAlign: 'right',
  },

  statsRow: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.10)',
    flexDirection: 'row',
    alignItems: 'center',
  },

  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },

  statDivider: {
    width: 1,
    height: 34,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },

  statNumber: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111',
  },

  statLabel: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },

  // Separate settings card (edit mode only) like mock toggle area
  settingsCard: {
    marginTop: 14,
    width: '100%',
    borderRadius: 20,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.70)',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 1,
  },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  settingLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
  },

  settingHint: {
    marginTop: 8,
    fontSize: 13,
    color: '#444',
  },

  section: {
    marginTop: 18,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
  },
})










