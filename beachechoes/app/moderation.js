import React, { useMemo, useState } from 'react'
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
  const [messages, setMessages] = useState(MOCK_MESSAGES)
  const [search, setSearch] = useState('')

  const { width: screenW } = useWindowDimensions()

  const BG_MAX_WIDTH = 340
  const leftOffset = Math.max(0, (screenW - BG_MAX_WIDTH) / 2)

  const filteredMessages = useMemo(() => {
    const searchLower = search.trim().toLowerCase()

    return messages.filter((msg) => {
      const matchesFilter = filter === 'all' ? true : msg.status === filter
      const matchesSearch =
        searchLower === ''
          ? true
          : msg.author.name.toLowerCase().includes(searchLower)

      return matchesFilter && matchesSearch
    })
  }, [messages, filter, search])

  function updateStatus(id, newStatus) {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === id ? { ...msg, status: newStatus } : msg
      )
    )
  }

  function getInitial(name) {
    return name ? name[0].toUpperCase() : 'U'
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
        >
          {/* SEARCH */}
          <Surface style={styles.searchWrap} elevation={0}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by user..."
              placeholderTextColor="#666"
              style={styles.searchInput}
            />
          </Surface>

          {/* HORIZONTAL FILTER SCROLL */}
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

          {/* MESSAGE LIST */}
          {filteredMessages.length === 0 && (
            <Text style={styles.empty}>No messages found</Text>
          )}

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

  empty: {
    textAlign: 'center',
    marginTop: 20,
    color: '#000',
    fontSize: 16,
  },
})