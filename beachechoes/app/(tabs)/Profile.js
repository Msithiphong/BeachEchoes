import React, { useContext, useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, Image, TextInput, Alert,
  TouchableOpacity, ActivityIndicator, Switch, ScrollView,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { Menu } from 'react-native-paper'
import Background from '../../components/Background'
import Header from '../../components/Header'
import Button from '../../components/Button'
import ImageCard from '../../components/ImageCard'
import UserAutocomplete from '../../components/UserAutocomplete'
import { AuthContext } from '../../context/AuthContext'
import { uploadAvatar } from '../../helpers/avatarUpload'
import { auth } from '../../config/firebase'
import { API_BASE } from '../../config/api'
import { useAppTheme } from '../../context/AppThemeContext'

// Card watermark logo
import logo from '../../assets/images/logo.png'

export default function Profile() {
  const { isDark, toggleTheme } = useAppTheme()
  const { user, logout, loading: authLoading } = useContext(AuthContext)
  const router = useRouter()
  const scrollRef = useRef(null)
  const echoesYRef = useRef(0)

  const [dropdownVisible, setDropdownVisible] = useState(false)

  const [name, setName] = useState(user?.name || '')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(null)

  const [anonymousEchoes, setAnonymousEchoes] = useState(false)


  const [neonUserId, setNeonUserId] = useState(null)
  const [posts, setPosts] = useState([])

  const [echoesCount, setEchoesCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [followersCount, setFollowersCount] = useState(0)

  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [saving, setSaving] = useState(false)

  // Redirect unauthenticated users to StartScreen
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/StartScreen')
    }
  }, [user, authLoading, router])

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

        setEchoesCount(data.profile.echoes_count ?? 0)
        setFollowingCount(data.profile.following_count ?? 0)
        setFollowersCount(data.profile.followers_count ?? 0)

        const pref =
          data.profile.anonymous_echoes ??
          data.profile.anonymousEchoes ??
          data.profile.anonymous_echoes_enabled ??
          false

        setAnonymousEchoes(!!pref)



        // Store neon user_id and fetch posts
        if (data.profile.id) {
          setNeonUserId(data.profile.id)
          await fetchPosts(data.profile.id)
        }
      }
    } catch (error) {
      console.log('Profile not found yet, using defaults')
    } finally {
      setLoading(false)
    }
  }

  const fetchPosts = async (userId) => {
    try {
      // Include auth token to get liked status
      const token = await auth.currentUser?.getIdToken()
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      
      const res = await fetch(`${API_BASE}/posts/user/${userId}`, { headers })
      const data = await res.json()
      if (data?.success) {
        setPosts(data.posts ?? [])
      }
    } catch (error) {
      console.log('Failed to fetch posts:', error)
    }
  }

  const handleLikeToggle = (postId, liked, likeCount) => {
    setPosts(prevPosts => 
      prevPosts.map(post => 
        post.id === postId 
          ? { ...post, liked, like_count: likeCount }
          : post
      )
    )
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

  // Navigate to the selected user's profile (or stay on Profile tab if it's the current user)
  const handleSelectUser = (item) => {
    if (item.id === user?.uid) {
      // Already on own profile, do nothing or scroll to top
      scrollRef.current?.scrollTo({ y: 0, animated: true })
    } else {
      router.push(`/profile/${item.id}`)
    }
  }

  const toggleDropdown = () => {
    setDropdownVisible((prev) => !prev)
  }

  const closeDropdown = () => {
    setDropdownVisible(false)
  }

  const handleLogout = async () => {
    try {
      closeDropdown()
      await logout()
      router.replace('/StartScreen')
    } catch (error) {
      console.error('Logout error:', error)
      Alert.alert('Error', 'Failed to log out')
    }
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
    <View style={styles.screen}>
      <Background>

        {/* Make the whole screen scrollable so edit mode never hides controls */}
        <ScrollView
        ref={scrollRef}
        style={styles.ScrollView}
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
        <View style={[styles.card, isDark ? styles.surfaceDark : styles.surfaceLight]}>
          {/* Watermark behind everything */}
          <Image
            source={logo}
            style={styles.cardWatermark}
            resizeMode="contain"
            pointerEvents="none"
          />

          <View style={styles.cardHeader}>
            {/* Settings Cogwheel - only show when not editing */}
            {!editing && (
              <Menu
                visible={dropdownVisible}
                onDismiss={closeDropdown}
                anchor={
                  <TouchableOpacity
                    testID="profile-settings-button"
                    accessibilityLabel="Profile settings"
                    style={styles.settingsButton}
                    onPress={toggleDropdown}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name="settings" size={28} color="#666" />
                  </TouchableOpacity>
                }
                anchorPosition="bottom"
                contentStyle={styles.dropdown}
                testID="profile-settings-menu"
              >
                <View style={styles.dropdownContent}>
                  <Menu.Item
                    onPress={() => {
                      closeDropdown()
                      setEditing(true)
                    }}
                    title="Edit Profile"
                    titleStyle={[styles.dropdownText, styles.dropdownTextNeutral]}
                    style={styles.dropdownItem}
                    leadingIcon={({ size }) => (
                      <MaterialIcons name="edit" size={size} color="#333" />
                    )}
                  />
                  <Menu.Item
                    onPress={() => {
                      closeDropdown()
                      toggleTheme()
                    }}
                    title={isDark ? 'Light Mode' : 'Dark Mode'}
                    titleStyle={[styles.dropdownText, styles.dropdownTextTheme]}
                    style={styles.dropdownItem}
                    leadingIcon={({ size }) => (
                      <MaterialIcons
                        name={isDark ? 'light-mode' : 'dark-mode'}
                        size={size}
                        color="#0b3954"
                      />
                    )}
                  />
                  <Menu.Item
                    onPress={handleLogout}
                    title="Log Out"
                    titleStyle={styles.dropdownText}
                    style={styles.dropdownItem}
                    leadingIcon={({ size }) => (
                      <MaterialIcons name="logout" size={size} color="#d32f2f" />
                    )}
                  />
                </View>
              </Menu>
            )}
          </View>

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
            <Text style={[styles.username, isDark ? styles.textWhite : styles.textDark]}>{name}</Text>
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
            <Text style={[styles.bioText, isDark ? styles.textSoftWhite : styles.textSoftDark]}>{bio || 'No bio yet'}</Text>
          )}

          {/* Toggles only in edit mode */}
          {editing && (
            <>
              <View style={styles.toggleRow}>
                <View style={styles.toggleTextCol}>
                  <Text style={styles.toggleTitle}>Post Echoes anonymously</Text>
                  <Text style={styles.toggleSubtitle}>
                    When enabled, your username will not show on new Echoes.
                  </Text>
                </View>

                <Switch value={anonymousEchoes} onValueChange={setAnonymousEchoes} disabled={saving} />
              </View>


            </>
          )}
        </View>

        {/* Stats (FORCED same width as card) */}
        <View style={[styles.statsCard, isDark ? styles.surfaceDark : styles.surfaceLight]}>
          <TouchableOpacity style={styles.statItem} onPress={() => scrollRef.current?.scrollTo({ y: echoesYRef.current, animated: true })}>
            <Text style={[styles.statNumber, isDark ? styles.textWhite : styles.textDark]}>{echoesCount}</Text>
            <Text style={[styles.statLabel, isDark ? styles.textSoftWhite : styles.textSoftDark]}>Echoes</Text>
          </TouchableOpacity>

          <View style={styles.statDivider} />

          <TouchableOpacity style={styles.statItem} onPress={() => router.push(`/profile/connections?userId=${user.uid}&type=following&name=${encodeURIComponent(name)}`)}>
            <Text style={[styles.statNumber, isDark ? styles.textWhite : styles.textDark]}>{followingCount}</Text>
            <Text style={[styles.statLabel, isDark ? styles.textSoftWhite : styles.textSoftDark]}>Following</Text>
          </TouchableOpacity>

          <View style={styles.statDivider} />

          <TouchableOpacity style={styles.statItem} onPress={() => router.push(`/profile/connections?userId=${user.uid}&type=followers&name=${encodeURIComponent(name)}`)}>
            <Text style={[styles.statNumber, isDark ? styles.textWhite : styles.textDark]}>{followersCount}</Text>
            <Text style={[styles.statLabel, isDark ? styles.textSoftWhite : styles.textSoftDark]}>Followers</Text>
          </TouchableOpacity>
        </View>

        

        {/* Action: Only show Save Profile button when editing */}
        {editing && (
          <Button onPress={saveProfile} disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        )}

        {/* User Search */}
        <View style={styles.searchSection}>
          <Text style={[styles.searchTitle, isDark ? styles.textWhite : styles.textDark]}>Discover Users</Text>
          <View style={styles.searchContainer}>
            <UserAutocomplete
              onSelectUser={handleSelectUser}
              placeholder="Search users..."
            />
          </View>
        </View>

        {/* User's Posts */}
        <View style={styles.messagesSection} onLayout={(e) => { echoesYRef.current = e.nativeEvent.layout.y }}>
          <Text style={[styles.sectionTitle, isDark ? styles.textWhite : styles.textDark]}>My Echoes</Text>
          {posts.length > 0 ? (
            posts.map((post) => (
              <ImageCard
                key={post.id}
                postId={post.id}
                image={{ uri: post.image_url }}
                username={post.is_anonymous ? 'Anonymous' : (name || user?.email)}
                likeCount={post.like_count}
                initialLiked={post.liked}
                onLikeToggle={handleLikeToggle}
                commentCount={post.comment_count || 0}
                onCommentPress={(postId) => router.push(`/PostWithComments?postId=${postId}`)}
                onImagePress={(postId) => router.push(`/PostWithComments?postId=${postId}`)}
              >
                {post.overlay_text}
              </ImageCard>
            ))
          ) : (
            <View style={styles.emptyEchoCard}>
              <Text style={styles.emptyEchoText}>No Echoes Created</Text>
            </View>
          )}
        </View>

      </ScrollView>
      </Background>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  // Scroll container
  container: {
    marginTop: 40,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },

  ScrollView: {
    width: '115%'
  },

  card: {
    width: '100%',
    alignSelf: 'stretch',
    alignItems: 'center',
    padding: 40,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
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

  cardHeader: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    minHeight: 44,
    marginTop: -24,
    marginHorizontal: -24,
    marginBottom: 12,
  },

  avatar: {
    marginBottom: 18,
    backgroundColor: '#eee',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.88)',
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
    backgroundColor: '#1e88a7',
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
    color: '#04253a',
    letterSpacing: 0.3,
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
    color: '#17384c',
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
    backgroundColor: 'rgba(255,255,255,0.52)',
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
    color: '#254a62',
  },

  // Stats: same width as card + centered content
  statsCard: {
    width: '100%',
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.24)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingVertical: 18,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 5,
  },

  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },

  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#052f47',
  },

  statLabel: {
    color: '#20495f',
    fontSize: 14,
    marginTop: 4,
  },

  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },

  searchSection: {
    width: '100%',
    marginTop: 20,
    marginBottom: 10,
  },

  searchTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    color: '#f5fbff',
    textShadowColor: 'rgba(0,0,0,0.22)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },

  searchContainer: {
    width: '100%',
    zIndex: 1,
  },

  messagesSection: {
    width: '100%',
    marginTop: 10,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    color: '#f5fbff',
    textShadowColor: 'rgba(0,0,0,0.22)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },

  center: {
    textAlign: 'center',
    marginTop: 24,
  },

  emptyEchoCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.26)',
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyEchoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },

  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  dropdown: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    minWidth: 160,
    zIndex: 20,
  },

  dropdownContent: {
    borderRadius: 14,
    overflow: 'hidden',
  },

  dropdownItem: {
    minWidth: 180,
  },

  dropdownText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#d32f2f',
  },
  dropdownTextNeutral: {
    color: '#333',
  },
  dropdownTextTheme: {
    color: '#0b3954',
  },
  surfaceDark: {
    backgroundColor: 'rgba(2, 30, 49, 0.38)',
    borderColor: 'rgba(125, 233, 255, 0.28)',
  },
  surfaceLight: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderColor: 'rgba(8, 48, 75, 0.2)',
  },
  textWhite: {
    color: '#f7fbff',
  },
  textSoftWhite: {
    color: 'rgba(247, 251, 255, 0.86)',
  },
  textDark: {
    color: '#08304b',
  },
  textSoftDark: {
    color: 'rgba(8, 48, 75, 0.82)',
  },
})

