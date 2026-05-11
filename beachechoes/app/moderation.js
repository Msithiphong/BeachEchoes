// Internal moderation surface for filtering feed posts and inspecting attached reports.
import React, { useEffect, useMemo, useState } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  TextInput,
} from 'react-native'
import { Text, Surface, Avatar } from 'react-native-paper'
import Background from '../components/Background'
import Header from '../components/Header'
import Button from '../components/Button'
import { getAuth } from 'firebase/auth'
import { API_BASE } from '../config/api'

export default function Moderation() {
  const auth = getAuth()

  const [posts, setPosts] = useState([])
  const [searchUser, setSearchUser] = useState('')
  const [searchPost, setSearchPost] = useState('')
  const [expandedReportId, setExpandedReportId] = useState(null)
  const [errorText, setErrorText] = useState('')
  const [loading, setLoading] = useState(false)

  const { width: screenW } = useWindowDimensions()

  const BG_MAX_WIDTH = 340
  const leftOffset = Math.max(0, (screenW - BG_MAX_WIDTH) / 2)

  useEffect(() => {
    fetchPosts()
  }, [])

  async function fetchPosts() {
    try {
      setLoading(true)
      setErrorText('')

      const token = await auth.currentUser?.getIdToken()
      const headers = token ? { Authorization: `Bearer ${token}` } : {}

      const response = await fetch(`${API_BASE}/posts/feed`, { headers })
      const text = await response.text()

      let data
      try {
        data = JSON.parse(text)
      } catch {
        console.error('Moderation feed returned non-JSON:', text)
        setErrorText('Moderation failed. Backend did not return JSON.')
        return
      }

      if (!response.ok || !data.success) {
        setErrorText(data.error || 'Failed to load posts.')
        return
      }

      setPosts(Array.isArray(data.posts) ? data.posts : [])
    } catch (error) {
      console.error('Fetch moderation posts error:', error)
      setErrorText('Network error. Could not load posts.')
    } finally {
      setLoading(false)
    }
  }

  const filteredPosts = useMemo(() => {
    const userSearchLower = searchUser.trim().toLowerCase()
    const postSearchLower = searchPost.trim().toLowerCase()

    return posts.filter((post) => {
      const userName = String(getName(post)).toLowerCase()
      const postText = String(getPostText(post)).toLowerCase()
      const category = String(post.category || '').toLowerCase()
      const reports = getReports(post)

      // Fold report metadata into search so moderators can find posts by complaint content too.
      const reportText = reports
        .map((report) => `${report.reason || ''} ${report.details || ''}`)
        .join(' ')
        .toLowerCase()

      const matchesUser =
        userSearchLower === '' || userName.includes(userSearchLower)

      const matchesPost =
        postSearchLower === '' ||
        postText.includes(postSearchLower) ||
        category.includes(postSearchLower) ||
        reportText.includes(postSearchLower)

      return matchesUser && matchesPost
    })
  }, [posts, searchUser, searchPost])

  function getReports(post) {
    if (Array.isArray(post.reports)) return post.reports
    if (Array.isArray(post.post_reports)) return post.post_reports
    return []
  }

  function getInitial(name) {
    return name ? name[0].toUpperCase() : 'U'
  }

  function formatDate(value) {
    if (!value) return ''
    return String(value).replace('T', ' ').slice(0, 19)
  }

  function getPostText(post) {
    return post.overlay_text || post.message || '(No text overlay)'
  }

  function getName(post) {
    return post.username || post.name || post.author?.name || 'Unknown User'
  }

  function getAvatarUrl(post) {
    return post.user_avatar_url || post.avatar_url || post.author?.avatar_url || null
  }

  function getLikeCount(post) {
    return post.like_count ?? post.likes ?? 0
  }

  return (
    <Background>
      <Header>Content Moderation</Header>

      <View
        style={[
          styles.shiftWrap,
          {
            width: screenW,
            transform: [{ translateX: -leftOffset }],
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

          <Surface style={styles.headerBar} elevation={0}>
            <Text style={styles.headerTitle}>Moderation</Text>

            <View style={styles.headerSpacer} />

            <Button
              mode="contained"
              onPress={fetchPosts}
              disabled={loading}
              style={styles.refreshBtn}
              buttonColor="#ffffff"
              textColor="#000000"
            >
              Refresh
            </Button>
          </Surface>

          <Surface style={styles.searchWrap} elevation={0}>
            <TextInput
              value={searchUser}
              onChangeText={setSearchUser}
              placeholder="Search by user..."
              placeholderTextColor="#666"
              style={styles.searchInput}
            />
          </Surface>

          <Surface style={styles.searchWrap} elevation={0}>
            <TextInput
              value={searchPost}
              onChangeText={setSearchPost}
              placeholder="Search post, category, reason, or details..."
              placeholderTextColor="#666"
              style={styles.searchInput}
            />
          </Surface>

          {filteredPosts.length === 0 && (
            <Text style={styles.empty}>No posts found</Text>
          )}

          {filteredPosts.map((post) => {
            const userName = getName(post)
            const avatarUrl = getAvatarUrl(post)
            const likeCount = getLikeCount(post)
            const reports = getReports(post)
            const isExpanded = expandedReportId === post.id

            return (
              <Surface key={post.id} style={styles.card} elevation={0}>
                <View style={styles.row}>
                  {avatarUrl ? (
                    <Avatar.Image size={38} source={{ uri: avatarUrl }} />
                  ) : (
                    <Avatar.Text size={38} label={getInitial(userName)} />
                  )}

                  <View style={styles.textBlock}>
                    <Text style={styles.name}>{userName}</Text>

                    <Text style={styles.message} numberOfLines={2}>
                      {getPostText(post)}
                    </Text>

                    <Text style={styles.meta}>
                      {formatDate(post.created_at)} • Likes: {likeCount}
                    </Text>

                    {post.category ? (
                      <Text style={styles.meta}>
                        Category: {post.category}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View style={styles.reportButtonWrap}>
                  <Button
                    mode="outlined"
                    onPress={() => setExpandedReportId(isExpanded ? null : post.id)}
                  >
                    {isExpanded ? 'Hide Report Info' : 'Show Report Info'}
                  </Button>
                </View>

                {isExpanded && (
                  <View style={styles.dropdownBox}>
                    <Text style={styles.dropdownTitle}>Report Information</Text>

                    {reports.length === 0 ? (
                      <Text style={styles.noReports}>
                        No report details were returned by the current backend feed.
                      </Text>
                    ) : (
                      reports.map((report, index) => (
                        <Surface key={report.id || index} style={styles.reportCard} elevation={0}>
                          <Text style={styles.reportReason}>
                            Reason: {report.reason || 'Unknown'}
                          </Text>

                          <Text style={styles.reportDetails}>
                            Details: {report.details || 'No details'}
                          </Text>

                          <Text style={styles.reportMeta}>
                            {formatDate(report.created_at)}
                          </Text>
                        </Surface>
                      ))
                    )}
                  </View>
                )}
              </Surface>
            )
          })}
        </ScrollView>
      </View>
    </Background>
  )
}

const styles = StyleSheet.create({
  shiftWrap: {
    alignSelf: 'flex-start',
    flex: 1,
  },
  container: {
    paddingHorizontal: 6,
    paddingBottom: 18,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
    marginBottom: 10,
    marginLeft: -6,
    marginRight: -6,
  },
  headerTitle: {
    color: '#000',
    fontSize: 30,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  headerSpacer: {
    width: 20,
  },
  refreshBtn: {
    width: 120,
  },
  searchWrap: {
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 8,
  },
  searchInput: {
    fontSize: 15,
    color: '#000',
    paddingVertical: 6,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 14,
  },
  card: {
    width: '92%',
    alignSelf: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,1)',
    padding: 6,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  textBlock: {
    flex: 1,
    marginLeft: 6,
    minWidth: 0,
  },
  name: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 1,
  },
  message: {
    color: '#fff',
    fontSize: 12,
    marginTop: 1,
    lineHeight: 15,
    flexShrink: 1,
  },
  meta: {
    color: '#ccc',
    fontSize: 10,
    marginTop: 3,
  },
  reportButtonWrap: {
    marginTop: 6,
    width: '100%',
  },
  dropdownBox: {
    width: '100%',
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 8,
    marginTop: 6,
  },
  dropdownTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 6,
  },
  reportCard: {
    backgroundColor: '#222',
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
  },
  reportReason: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  reportDetails: {
    color: '#ddd',
    fontSize: 12,
    marginTop: 4,
  },
  reportMeta: {
    color: '#aaa',
    fontSize: 11,
    marginTop: 6,
  },
  noReports: {
    color: '#aaa',
    fontSize: 13,
  },
  empty: {
    textAlign: 'center',
    marginTop: 20,
    color: '#000',
    fontSize: 16,
  },
})
