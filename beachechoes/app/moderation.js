<<<<<<< Updated upstream
import React, { useMemo, useState } from 'react'
=======
import React, { useEffect, useMemo, useState } from 'react'
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream

// ---------------- MOCK DATA ----------------
const MOCK_MESSAGES = [
  {
    id: 1,
    message: 'Hello from the library echo!',
    status: 'pending',
    reports: 0,
    created_at: '2026-04-04',
    author: { name: 'Jose', avatar_url: null },
  },
  {
    id: 2,
    message: 'This is a flagged message example',
    status: 'flagged',
    reports: 3,
    created_at: '2026-04-03',
    author: { name: 'Alex', avatar_url: null },
  },
  {
    id: 3,
    message: 'Removed message sample',
    status: 'removed',
    reports: 1,
    created_at: '2026-04-02',
    author: { name: 'Sam', avatar_url: null },
  },
  {
    id: 4,
    message: 'Testing another pending echo for moderation review.',
    status: 'pending',
    reports: 2,
    created_at: '2026-04-01',
    author: { name: 'Monica', avatar_url: null },
  },
  {
    id: 5,
    message: 'A second flagged sample so scrolling feels more natural.',
    status: 'flagged',
    reports: 5,
    created_at: '2026-03-31',
    author: { name: 'Jordan', avatar_url: null },
  },
]
=======
import { API_BASE } from '../config/api'
>>>>>>> Stashed changes

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'flagged', label: 'Flagged' },
  { key: 'removed', label: 'Removed' },
  { key: 'approved', label: 'Approved' },
]

// ---------------- SCREEN ----------------
export default function Moderation() {
  const [filter, setFilter] = useState('all')
<<<<<<< Updated upstream
  const [messages, setMessages] = useState(MOCK_MESSAGES)
  const [search, setSearch] = useState('')
=======
  const [messages, setMessages] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorText, setErrorText] = useState('')
  const [successText, setSuccessText] = useState('')

  const [expandedMessageId, setExpandedMessageId] = useState(null)
  const [reportsByMessage, setReportsByMessage] = useState({})
>>>>>>> Stashed changes

  const { width: screenW } = useWindowDimensions()

  const BG_MAX_WIDTH = 340
  const leftOffset = Math.max(0, (screenW - BG_MAX_WIDTH) / 2)

<<<<<<< Updated upstream
=======
  const moderationUrl = useMemo(() => {
    const params = new URLSearchParams({
      status: filter,
      search: search.trim(),
    })

    return `${API_BASE}/moderation?${params.toString()}`
  }, [filter, search])

  useEffect(() => {
    fetchMessages()
  }, [moderationUrl])

  async function fetchMessages() {
    try {
      setLoading(true)
      setErrorText('')

      const response = await fetch(moderationUrl)
      const text = await response.text()

      let data

      try {
        data = JSON.parse(text)
      } catch (error) {
        console.error('Backend did not return JSON:', text)
        setErrorText('Backend did not return JSON. Check API_BASE and make sure node server.js is running.')
        setMessages([])
        return
      }

      if (!response.ok) {
        setErrorText(data.error || `HTTP error ${response.status}`)
        setMessages([])
        return
      }

      if (data.success) {
        setMessages(Array.isArray(data.messages) ? data.messages : [])
      } else {
        setErrorText(data.error || 'Failed to fetch moderation messages.')
        setMessages([])
      }
    } catch (error) {
      console.error('Fetch moderation messages error:', error)
      setErrorText('Network error. Check API_BASE and server.js.')
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

>>>>>>> Stashed changes
  const filteredMessages = useMemo(() => {
    const searchLower = search.trim().toLowerCase()

    return messages.filter((msg) => {
      const matchesFilter = filter === 'all' ? true : msg.status === filter
<<<<<<< Updated upstream
      const matchesSearch =
        searchLower === ''
          ? true
          : msg.author.name.toLowerCase().includes(searchLower)
=======
      const userName = msg.name || ''

      const matchesSearch =
        searchLower === ''
          ? true
          : userName.toLowerCase().includes(searchLower)
>>>>>>> Stashed changes

      return matchesFilter && matchesSearch
    })
  }, [messages, filter, search])

<<<<<<< Updated upstream
  function updateStatus(id, newStatus) {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === id ? { ...msg, status: newStatus } : msg
      )
    )
=======
  async function updateStatus(id, newStatus) {
    try {
      setErrorText('')
      setSuccessText('')

      const response = await fetch(`${API_BASE}/moderation/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      })

      const text = await response.text()

      let data

      try {
        data = JSON.parse(text)
      } catch (error) {
        console.error('Backend did not return JSON:', text)
        setErrorText('Backend did not return JSON. Check API_BASE and make sure node server.js is running.')
        return
      }

      if (!response.ok) {
        setErrorText(data.error || `HTTP error ${response.status}`)
        return
      }

      if (data.success) {
        setSuccessText(`Message changed to ${newStatus}.`)
        await fetchMessages()
      } else {
        setErrorText(data.error || 'Failed to update moderation status.')
      }
    } catch (error) {
      console.error('Update moderation status error:', error)
      setErrorText('Network error. Check API_BASE and server.js.')
    }
  }

  async function fetchReports(messageId) {
    try {
      setErrorText('')

      const response = await fetch(`${API_BASE}/messages/${messageId}/reports`)
      const text = await response.text()

      let data

      try {
        data = JSON.parse(text)
      } catch (error) {
        console.error('Backend did not return JSON:', text)
        setErrorText('Backend did not return JSON while loading reports.')
        return
      }

      if (!response.ok) {
        setErrorText(data.error || `HTTP error ${response.status}`)
        return
      }

      if (data.success) {
        setReportsByMessage((prev) => ({
          ...prev,
          [messageId]: Array.isArray(data.reports) ? data.reports : [],
        }))
      } else {
        setErrorText(data.error || 'Failed to fetch reports.')
      }
    } catch (error) {
      console.error('Fetch reports error:', error)
      setErrorText('Network error. Could not load reports.')
    }
  }

  async function toggleReports(messageId) {
    if (expandedMessageId === messageId) {
      setExpandedMessageId(null)
      return
    }

    setExpandedMessageId(messageId)
    await fetchReports(messageId)
>>>>>>> Stashed changes
  }

  function getInitial(name) {
    return name ? name[0].toUpperCase() : 'U'
  }

<<<<<<< Updated upstream
=======
  function formatDate(value) {
    if (!value) return ''
    return String(value).replace('T', ' ').slice(0, 19)
  }

>>>>>>> Stashed changes
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
        >
<<<<<<< Updated upstream
          {/* SEARCH */}
=======
          {errorText ? (
            <Text style={styles.errorText}>{errorText}</Text>
          ) : null}

          {successText ? (
            <Text style={styles.successText}>{successText}</Text>
          ) : null}

>>>>>>> Stashed changes
          <Surface style={styles.searchWrap} elevation={0}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by user..."
              placeholderTextColor="#666"
              style={styles.searchInput}
            />
          </Surface>

<<<<<<< Updated upstream
          {/* HORIZONTAL FILTER SCROLL */}
=======
>>>>>>> Stashed changes
          <Surface style={styles.filterWrap} elevation={0}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScrollContent}
            >
              {FILTERS.map((item) => {
                const selected = filter === item.key

                return (
                  <View key={item.key} style={styles.filterButtonWrap}>
                    <Button
                      mode={selected ? 'contained' : 'outlined'}
                      onPress={() => setFilter(item.key)}
                    >
                      {item.label}
                    </Button>
                  </View>
                )
              })}
            </ScrollView>
          </Surface>

<<<<<<< Updated upstream
          {/* MESSAGE LIST */}
=======
          <Button
            mode="outlined"
            onPress={fetchMessages}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </Button>

>>>>>>> Stashed changes
          {filteredMessages.length === 0 && (
            <Text style={styles.empty}>No messages found</Text>
          )}

<<<<<<< Updated upstream
          {filteredMessages.map((msg) => (
            <Surface key={msg.id} style={styles.card} elevation={0}>
              <View style={styles.row}>
                {msg.author.avatar_url ? (
                  <Avatar.Image size={44} source={{ uri: msg.author.avatar_url }} />
                ) : (
                  <Avatar.Text size={44} label={getInitial(msg.author.name)} />
                )}

                <View style={styles.textBlock}>
                  <Text style={styles.name}>{msg.author.name}</Text>

                  <Text style={styles.message} numberOfLines={3}>
                    {msg.message}
                  </Text>

                  <Text style={styles.meta}>
                    {msg.created_at} • {msg.status} • Reports: {msg.reports}
                  </Text>
                </View>
              </View>

              <View style={styles.actions}>
                <View style={styles.actionButton}>
                  <Button onPress={() => updateStatus(msg.id, 'approved')}>
                    Approve
                  </Button>
                </View>

                <View style={styles.actionButton}>
                  <Button onPress={() => updateStatus(msg.id, 'flagged')}>
                    Flag
                  </Button>
                </View>

                <View style={styles.actionButton}>
                  <Button onPress={() => updateStatus(msg.id, 'removed')}>
                    Remove
                  </Button>
                </View>
              </View>
            </Surface>
          ))}
=======
          {filteredMessages.map((msg) => {
            const reports = reportsByMessage[msg.id] || []
            const isExpanded = expandedMessageId === msg.id

            return (
              <Surface key={msg.id} style={styles.card} elevation={0}>
                <View style={styles.row}>
                  {msg.avatar_url ? (
                    <Avatar.Image size={44} source={{ uri: msg.avatar_url }} />
                  ) : (
                    <Avatar.Text size={44} label={getInitial(msg.name)} />
                  )}

                  <View style={styles.textBlock}>
                    <Text style={styles.name}>{msg.name || 'Unknown User'}</Text>

                    <Text style={styles.message} numberOfLines={3}>
                      {msg.message}
                    </Text>

                    <Text style={styles.meta}>
                      {formatDate(msg.created_at)} • {msg.status} • Reports: {msg.flag_count ?? 0}
                    </Text>
                  </View>
                </View>

                <View style={styles.actions}>
                  <View style={styles.actionButton}>
                    <Button onPress={() => updateStatus(msg.id, 'approved')}>
                      Approve
                    </Button>
                  </View>

                  <View style={styles.actionButton}>
                    <Button onPress={() => updateStatus(msg.id, 'flagged')}>
                      Flagged
                    </Button>
                  </View>

                  <View style={styles.actionButton}>
                    <Button onPress={() => updateStatus(msg.id, 'pending')}>
                      Pending
                    </Button>
                  </View>

                  <View style={styles.actionButton}>
                    <Button onPress={() => updateStatus(msg.id, 'removed')}>
                      Remove
                    </Button>
                  </View>
                </View>

                <View style={styles.dropdownButtonWrap}>
                  <Button
                    mode="outlined"
                    onPress={() => toggleReports(msg.id)}
                  >
                    {isExpanded ? 'Hide Reports' : 'Show Reports'}
                  </Button>
                </View>

                {isExpanded && (
                  <View style={styles.reportsPanel}>
                    <Text style={styles.reportsTitle}>Reports</Text>

                    {reports.length === 0 ? (
                      <Text style={styles.noReports}>No reports for this message.</Text>
                    ) : (
                      reports.map((report) => (
                        <View key={report.id} style={styles.reportItem}>
                          <Text style={styles.reportReason}>
                            {report.reason}
                          </Text>

                          <Text style={styles.reportMeta}>
                            By {report.name || `User ${report.user_id || 'Unknown'}`} • {formatDate(report.created_at)}
                          </Text>

                          {report.details ? (
                            <Text style={styles.reportDetails}>
                              {report.details}
                            </Text>
                          ) : null}
                        </View>
                      ))
                    )}
                  </View>
                )}
              </Surface>
            )
          })}
>>>>>>> Stashed changes
        </ScrollView>
      </View>
    </Background>
  )
}

// ---------------- STYLES ----------------
const styles = StyleSheet.create({
  shiftWrap: {
    alignSelf: 'flex-start',
    flex: 1,
  },

  container: {
    paddingHorizontal: 6,
    paddingBottom: 18,
  },

<<<<<<< Updated upstream
=======
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

>>>>>>> Stashed changes
  searchWrap: {
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 10,
  },

  searchInput: {
    fontSize: 16,
    color: '#000',
    paddingVertical: 8,
  },

  filterWrap: {
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingVertical: 8,
    marginBottom: 12,
  },

  filterScrollContent: {
    paddingHorizontal: 8,
    alignItems: 'center',
  },

  filterButtonWrap: {
    marginRight: 8,
    minWidth: 110,
  },

  card: {
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,1)',
    padding: 12,
    marginBottom: 10,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  textBlock: {
    flex: 1,
    marginLeft: 10,
  },

  name: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 2,
  },

  message: {
    color: '#fff',
    fontSize: 14,
    marginTop: 2,
    lineHeight: 20,
  },

  meta: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 6,
  },

  actions: {
    flexDirection: 'row',
    marginTop: 12,
    justifyContent: 'space-between',
  },

  actionButton: {
    flex: 1,
    marginHorizontal: 3,
  },

<<<<<<< Updated upstream
=======
  dropdownButtonWrap: {
    marginTop: 10,
  },

  reportsPanel: {
    backgroundColor: '#181818',
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
  },

  reportsTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 8,
  },

  noReports: {
    color: '#ccc',
    fontSize: 13,
  },

  reportItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 8,
    marginBottom: 8,
  },

  reportReason: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  reportMeta: {
    color: '#bbb',
    fontSize: 12,
    marginTop: 2,
  },

  reportDetails: {
    color: '#ddd',
    fontSize: 13,
    marginTop: 5,
  },

>>>>>>> Stashed changes
  empty: {
    textAlign: 'center',
    marginTop: 20,
    color: '#000',
    fontSize: 16,
  },
})