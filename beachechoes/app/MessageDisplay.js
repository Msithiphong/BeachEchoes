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
import { API_BASE } from '../config/api'
import { auth } from '../config/firebase'

const REPORT_REASONS = [
  'Spam',
  'Harassment',
  'Inappropriate Content',
  'False Information',
  'Other',
]

export default function MessageDisplay() {
  const [messages, setMessages] = useState([])
  const [expandedReportId, setExpandedReportId] = useState(null)
  const [selectedReasonByMessage, setSelectedReasonByMessage] = useState({})
  const [detailsByMessage, setDetailsByMessage] = useState({})
  const [errorText, setErrorText] = useState('')
  const [successText, setSuccessText] = useState('')
  const [submittingId, setSubmittingId] = useState(null)

  const { width: screenW } = useWindowDimensions()

  const BG_MAX_WIDTH = 340
  const leftOffset = Math.max(0, (screenW - BG_MAX_WIDTH) / 2)

  useEffect(() => {
    fetchMessages()
  }, [])

  async function fetchMessages() {
    try {
      setErrorText('')

      const response = await fetch(`${API_BASE}/messages/public`)
      const text = await response.text()

      let data

      try {
        data = JSON.parse(text)
      } catch (error) {
        console.error('Fetch messages returned non-JSON:', text)
        setErrorText('Fetch messages failed. Backend did not return JSON.')
        return
      }

      if (!response.ok || !data.success) {
        setErrorText(data.error || 'Failed to load messages.')
        return
      }

      setMessages(data.messages.filter((msg) => msg.status !== 'removed'))
    } catch (error) {
      console.error('Fetch messages error:', error)
      setErrorText('Network error. Could not load messages.')
    }
  }

  async function createReport(messageId) {
    try {
      setErrorText('')
      setSuccessText('')
      setSubmittingId(messageId)

      const token = await auth.currentUser?.getIdToken()

      if (!token) {
        setErrorText('You must be logged in to report a message.')
        return
      }

      const reason = selectedReasonByMessage[messageId] || 'Spam'
      const details = detailsByMessage[messageId] || ''

      console.log('Submitting report:', {
        url: `${API_BASE}/messages/${messageId}/report`,
        messageId,
        reason,
        details,
        hasToken: !!token,
      })

      const response = await fetch(`${API_BASE}/messages/${messageId}/report`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason,
          details,
        }),
      })

      const text = await response.text()

      let data

      try {
        data = JSON.parse(text)
      } catch (error) {
        console.error('Report returned non-JSON:', text)
        setErrorText('Report failed. Backend did not return JSON.')
        return
      }

      console.log('Report response:', data)

      if (!response.ok || !data.success) {
        setErrorText(data.error || 'Failed to submit report.')
        return
      }

      setSuccessText(
        data.status === 'removed'
          ? `Report submitted. Message was removed after ${data.report_count}/3 reports.`
          : `Report submitted. Current reports: ${data.report_count}/3.`
      )

      setDetailsByMessage((prev) => ({ ...prev, [messageId]: '' }))
      setExpandedReportId(null)

      await fetchMessages()
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
            <Text style={styles.headerTitle}>Messages</Text>

            <View style={styles.headerSpacer} />

            <Button
              mode="contained"
              onPress={fetchMessages}
              style={styles.refreshBtn}
              buttonColor="#ffffff"
              textColor="#000000"
            >
              Refresh
            </Button>
          </Surface>

          {messages.length === 0 && (
            <Text style={styles.empty}>No messages found</Text>
          )}

          <View style={styles.listWrap}>
            {messages.map((msg) => {
              const isExpanded = expandedReportId === msg.id
              const selectedReason = selectedReasonByMessage[msg.id] || 'Spam'
              const isSubmitting = submittingId === msg.id

              return (
                <Surface key={msg.id} style={styles.card} elevation={0}>
                  <View style={styles.row}>
                    {msg.avatar_url ? (
                      <Avatar.Image size={44} source={{ uri: msg.avatar_url }} />
                    ) : (
                      <Avatar.Text size={44} label={getInitial(msg.name)} />
                    )}

                    <View style={styles.textBlock}>
                      <Text style={styles.name}>
                        {msg.name || 'Unknown User'}
                      </Text>

                      <Text style={styles.message}>
                        {msg.message}
                      </Text>

                      <Text style={styles.meta}>
                        {formatDate(msg.created_at)} • Reports: {msg.flag_count || 0}/3
                      </Text>
                    </View>
                  </View>

                  <View style={styles.reportButtonWrap}>
                    <Button
                      mode="outlined"
                      onPress={() => {
                        setErrorText('')
                        setSuccessText('')
                        setExpandedReportId(isExpanded ? null : msg.id)
                      }}
                    >
                      {isExpanded ? 'Cancel Report' : 'Report'}
                    </Button>
                  </View>

                  {isExpanded && (
                    <View style={styles.reportBox}>
                      <Text style={styles.reportTitle}>Report Message</Text>

                      <Text style={styles.reportLabel}>Reason</Text>

                      <View style={styles.reasonWrap}>
                        {REPORT_REASONS.map((reason) => {
                          const selected = selectedReason === reason

                          return (
                            <View key={reason} style={styles.reasonButton}>
                              <Button
                                mode={selected ? 'contained' : 'outlined'}
                                onPress={() =>
                                  setSelectedReasonByMessage((prev) => ({
                                    ...prev,
                                    [msg.id]: reason,
                                  }))
                                }
                              >
                                {reason}
                              </Button>
                            </View>
                          )
                        })}
                      </View>

                      <TextInput
                        value={detailsByMessage[msg.id] || ''}
                        onChangeText={(text) =>
                          setDetailsByMessage((prev) => ({
                            ...prev,
                            [msg.id]: text,
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
                        onPress={() => createReport(msg.id)}
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
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
    marginBottom: 10,
    marginLeft: -6,
    marginRight: -6,
  },

  headerTitle: {
    color: '#000',
    fontSize: 32,
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
    gap: 10,
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
    width: '100%',
    alignSelf: 'stretch',
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,1)',
    padding: 12,
  },

  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  textBlock: {
    flex: 1,
    marginLeft: 10,
    minWidth: 0,
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
    flexShrink: 1,
  },

  meta: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 6,
  },

  reportButtonWrap: {
    marginTop: 12,
    width: '100%',
  },

  reportBox: {
    width: '100%',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
  },

  reportTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },

  reportLabel: {
    color: '#ccc',
    fontSize: 12,
    marginBottom: 6,
  },

  reasonWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },

  reasonButton: {
    width: '50%',
    padding: 3,
  },

  detailsInput: {
    width: '100%',
    backgroundColor: '#fff',
    color: '#000',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 70,
    marginBottom: 10,
    textAlignVertical: 'top',
  },

  empty: {
    color: '#000',
    marginTop: 8,
    textAlign: 'center',
    fontSize: 16,
  },
})