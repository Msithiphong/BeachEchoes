import React, { useEffect, useState } from 'react'
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
} from 'react-native'
import { Text, Surface, Avatar } from 'react-native-paper'
import Background from '../components/Background'
import Header from '../components/Header'
import Button from '../components/Button'
import { getAuth } from 'firebase/auth'
import { API_BASE } from '../config/api'

const REPORT_REASONS = [
  { label: 'Spam', value: 'spam' },
  { label: 'Offensive', value: 'offensive' },
  { label: 'Other', value: 'other' },
]

export default function MessageDisplay() {
  const auth = getAuth()

  const [posts, setPosts] = useState([])
  const [expandedReportId, setExpandedReportId] = useState(null)
  const [selectedReasonByPost, setSelectedReasonByPost] = useState({})
  const [otherReasonByPost, setOtherReasonByPost] = useState({})
  const [detailsByPost, setDetailsByPost] = useState({})
  const [errorText, setErrorText] = useState('')
  const [successText, setSuccessText] = useState('')
  const [submittingId, setSubmittingId] = useState(null)

  const { width: screenW } = useWindowDimensions()
  const BG_MAX_WIDTH = 340
  const leftOffset = Math.max(0, (screenW - BG_MAX_WIDTH) / 2)

  useEffect(() => {
    fetchPosts()
  }, [])

  async function fetchPosts() {
    try {
      setErrorText('')

      const token = await auth.currentUser?.getIdToken()
      const headers = token ? { Authorization: `Bearer ${token}` } : {}

      const response = await fetch(`${API_BASE}/posts/feed`, { headers })
      const text = await response.text()

      let data
      try {
        data = JSON.parse(text)
      } catch {
        console.error('Fetch posts returned non-JSON:', text)
        setErrorText('Fetch posts failed. Backend did not return JSON.')
        return
      }

      if (!response.ok || !data.success) {
        setErrorText(data.error || 'Failed to load posts.')
        return
      }

      setPosts(Array.isArray(data.posts) ? data.posts : [])
    } catch (error) {
      console.error('Fetch posts error:', error)
      setErrorText('Network error. Could not load posts.')
    }
  }

  async function createReport(postId) {
    try {
      setErrorText('')
      setSuccessText('')
      setSubmittingId(postId)

      const token = await auth.currentUser?.getIdToken()

      if (!token) {
        setErrorText('You must be logged in to report a post.')
        return
      }

      const selectedReason = selectedReasonByPost[postId] || 'spam'
      const otherReason = otherReasonByPost[postId] || ''
      const details = detailsByPost[postId] || ''

      if (selectedReason === 'other' && otherReason.trim() === '') {
        setErrorText('Please write your own reason when selecting Other.')
        return
      }

      const finalDetails =
        selectedReason === 'other'
          ? `Other reason: ${otherReason.trim()}${details.trim() ? `\nDetails: ${details.trim()}` : ''}`
          : details.trim()

      const response = await fetch(`${API_BASE}/posts/${postId}/report`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: selectedReason,
          details: finalDetails,
        }),
      })

      const text = await response.text()

      let data
      try {
        data = JSON.parse(text)
      } catch {
        console.error('Report returned non-JSON:', text)
        setErrorText('Report failed. Backend did not return JSON.')
        return
      }

      if (!response.ok || !data.success) {
        setErrorText(data.error || 'Failed to submit report.')
        return
      }

      setSuccessText('Report submitted.')
      setDetailsByPost((prev) => ({ ...prev, [postId]: '' }))
      setOtherReasonByPost((prev) => ({ ...prev, [postId]: '' }))
      setExpandedReportId(null)

      await fetchPosts()
    } catch (error) {
      console.error('Create report error:', error)
      setErrorText('Network error. Could not submit report.')
    } finally {
      setSubmittingId(null)
    }
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
      <Header>Messages</Header>

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
          style={styles.scroll}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
          {successText ? <Text style={styles.successText}>{successText}</Text> : null}

          <Surface style={styles.headerBar} elevation={0}>
            <Text style={styles.headerTitle}>Posts</Text>

            <View style={styles.headerSpacer} />

            <Button
              mode="contained"
              onPress={fetchPosts}
              style={styles.refreshBtn}
              buttonColor="#ffffff"
              textColor="#000000"
            >
              Refresh
            </Button>
          </Surface>

          {posts.length === 0 && <Text style={styles.empty}>No posts found</Text>}

          <View style={styles.listWrap}>
            {posts.map((post) => {
              const isExpanded = expandedReportId === post.id
              const selectedReason = selectedReasonByPost[post.id] || 'spam'
              const isSubmitting = submittingId === post.id
              const userName = getName(post)
              const avatarUrl = getAvatarUrl(post)
              const likeCount = getLikeCount(post)

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
                    </View>
                  </View>

                  <View style={styles.reportButtonWrap}>
                    <Button
                      mode="outlined"
                      onPress={() => {
                        setErrorText('')
                        setSuccessText('')
                        setExpandedReportId(isExpanded ? null : post.id)
                      }}
                    >
                      {isExpanded ? 'Hide Report Menu' : 'Report'}
                    </Button>
                  </View>

                  {isExpanded && (
                    <View style={styles.dropdownBox}>
                      <Text style={styles.dropdownTitle}>Report Post</Text>

                      <Text style={styles.reportLabel}>Reason</Text>

                      <View style={styles.reasonWrap}>
                        {REPORT_REASONS.map((reason) => {
                          const selected = selectedReason === reason.value

                          return (
                            <View key={reason.value} style={styles.reasonButton}>
                              <Button
                                mode={selected ? 'contained' : 'outlined'}
                                onPress={() =>
                                  setSelectedReasonByPost((prev) => ({
                                    ...prev,
                                    [post.id]: reason.value,
                                  }))
                                }
                              >
                                {reason.label}
                              </Button>
                            </View>
                          )
                        })}
                      </View>

                      {selectedReason === 'other' && (
                        <>
                          <Text style={styles.reportLabel}>Your Reason</Text>

                          <TextInput
                            value={otherReasonByPost[post.id] || ''}
                            onChangeText={(text) =>
                              setOtherReasonByPost((prev) => ({
                                ...prev,
                                [post.id]: text,
                              }))
                            }
                            placeholder="Write your own reason..."
                            placeholderTextColor="#777"
                            style={styles.detailsInput}
                            multiline
                          />
                        </>
                      )}

                      <Text style={styles.reportLabel}>Details</Text>

                      <TextInput
                        value={detailsByPost[post.id] || ''}
                        onChangeText={(text) =>
                          setDetailsByPost((prev) => ({
                            ...prev,
                            [post.id]: text,
                          }))
                        }
                        placeholder="Explain the report..."
                        placeholderTextColor="#777"
                        style={styles.detailsInput}
                        multiline
                      />

                      <Button
                        mode="contained"
                        disabled={isSubmitting}
                        onPress={() => createReport(post.id)}
                      >
                        {isSubmitting ? 'Submitting...' : 'Submit Report'}
                      </Button>
                    </View>
                  )}
                </Surface>
              )
            })}
          </View>
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
  scroll: {
    flex: 1,
  },
  container: {
    paddingTop: 0,
    paddingBottom: 16,
    paddingHorizontal: 4,
    alignSelf: 'stretch',
    flexGrow: 1,
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
  listWrap: {
    gap: 6,
    marginBottom: 16,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 14,
  },
  successText: {
    color: 'green',
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
    width: '100%',
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
  reportLabel: {
    color: '#ddd',
    fontSize: 12,
    marginBottom: 4,
  },
  reasonWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  reasonButton: {
    minWidth: 100,
  },
  detailsInput: {
    color: '#fff',
    backgroundColor: '#222',
    borderRadius: 10,
    minHeight: 52,
    padding: 8,
    marginBottom: 8,
    textAlignVertical: 'top',
  },
  empty: {
    color: '#aaa',
    textAlign: 'center',
    marginTop: 16,
  },
})