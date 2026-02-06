// app/(tabs)/Leaderboard.js
// No table anymore: instead, you scroll to see cards for Top Users / Top Messages.
// ✅ Week/Month filter + Top Users/Top Messages filter stays at TOP
// ✅ Medal PNGs via require(): gold-medal.png / silvar-medal.png / copper-medal.png
// ✅ Uses <Image source={require(...)} style={...} />
// ✅ Big top card (rank #1) + scrollable list of rounded cards for the rest
// ✅ Keeps original logic: view/period/category, urls, stats, loadData, useEffect deps, refresh

import React, { useEffect, useMemo, useState } from 'react'
import { View, StyleSheet, ScrollView, Image } from 'react-native'
import { Text, Surface, Avatar, SegmentedButtons } from 'react-native-paper'
import { Stack, useRouter } from 'expo-router'

import Background from '../../components/Background'
import Button from '../../components/Button'

const API_BASE = 'http://localhost:3000'

// Medal PNGs (MUST exist relative to this file: app/(tabs)/Leaderboard.js)
const medalGold = require('../../assets/images/gold-medal.png')
const medalSilver = require('../../assets/images/silvar-medal.png') // keep spelling
const medalCopper = require('../../assets/images/copper-medal.png')

export default function Leaderboard() {
  const router = useRouter() // kept

  // filters (kept)
  const [view, setView] = useState('users')      // users | echoes
  const [period, setPeriod] = useState('week')   // day | week | month | all
  const [category, setCategory] = useState('all')

  // data (kept)
  const [rows, setRows] = useState([])
  const [stats, setStats] = useState({ echoes: 0, appraises: 0, comments: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const leaderboardUrl = useMemo(() => {
    const params = new URLSearchParams({
      view,
      period,
      category,
      limit: '50', // more items since we're showing a scroll list
    })
    return `${API_BASE}/api/leaderboard?${params.toString()}`
  }, [view, period, category])

  const statsUrl = useMemo(() => {
    const params = new URLSearchParams({ period, category })
    return `${API_BASE}/api/stats?${params.toString()}`
  }, [period, category])

  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [lbRes, stRes] = await Promise.all([
        fetch(leaderboardUrl),
        fetch(statsUrl),
      ])

      const lb = await lbRes.json()
      const st = await stRes.json()

      setRows(Array.isArray(lb) ? lb : [])
      setStats(st || { echoes: 0, appraises: 0, comments: 0 })
    } catch (e) {
      console.error(e)
      setError('Failed to load leaderboard data')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [view, period, category])

  const topItem = rows.length ? rows[0] : null
  const restItems = rows.length > 1 ? rows.slice(1) : []

  // UI: only week/month shown
  const togglePeriodValue = period === 'month' ? 'month' : 'week'

  return (
    <Background>
      <Stack.Screen options={{ title: 'Leaderboard' }} />

      <ScrollView contentContainerStyle={styles.container}>

        {/* TOP BAR */}
        <Surface style={styles.headerBar} elevation={0}>
          <Button
            mode="outlined"
            onPress={loadData}
            disabled={loading}
            style={styles.refreshBtn}
          >
            Refresh
          </Button>

          <Text style={styles.headerTitle}>Leaderboard</Text>

          <View style={styles.headerSpacer} />
        </Surface>

        {/* FILTERS ON TOP */}
        <Surface style={styles.filterWrap} elevation={0}>
          <SegmentedButtons
            value={togglePeriodValue}
            onValueChange={(v) => setPeriod(v)}
            buttons={[
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
            ]}
            style={styles.segmented}
          />

          <View style={{ height: 10 }} />

          <SegmentedButtons
            value={view}
            onValueChange={(v) => setView(v)}
            buttons={[
              { value: 'users', label: 'Top Users' },
              { value: 'echoes', label: 'Top Messages' },
            ]}
            style={styles.segmented}
          />
        </Surface>

        {/* STATS */}
        <View style={styles.statsRow}>
          <Stat label="Echoes" value={stats.echoes} />
          <Stat label="Appraises" value={stats.appraises} />
          <Stat label="Comments" value={stats.comments} />
        </View>

        {error !== '' && <Text style={styles.error}>{error}</Text>}

        {/* BIG TOP SECTION (rank #1) */}
        <Surface style={styles.topCard} elevation={0}>
          <Text style={styles.topSectionLabel}>
            {view === 'users' ? 'Top User' : 'Top Message'}
          </Text>

          <View style={styles.topCardRow}>
            {/* profile + medal next to it */}
            <View style={styles.topAvatarAndMedal}>
              {renderAvatar(topItem, view)}
              <View style={{ width: 10 }} />
              {renderMedal(1, 38)}
            </View>
          </View>

          {/* name below + votes */}
          <View style={styles.topTextBlock}>
            <Text style={styles.topName} numberOfLines={1}>
              {view === 'users'
                ? (topItem?.email ?? '—')
                : (topItem?.author ?? '—')}
            </Text>

            <Text style={styles.topVotes}>
              {view === 'users'
                ? `Votes: ${String(topItem?.score ?? 0)}`
                : `Votes: ${String(topItem?.appraises ?? 0)}`}
            </Text>

            {view === 'echoes' && (
              <Text style={styles.topPreview} numberOfLines={3}>
                {topItem?.preview ?? '—'}
              </Text>
            )}
          </View>
        </Surface>

        {/* SCROLL LIST (no table) */}
        <Text style={styles.sectionTitle}>
          {view === 'users' ? 'Leaderboard Users' : 'Leaderboard Messages'}
        </Text>

        <View style={styles.listWrap}>
          {rows.map((r, i) => {
            const rank = Number(r.rank ?? i + 1)

            const title =
              view === 'users'
                ? (r.email ?? 'Unknown User')
                : (r.preview ?? 'Unknown Message')

            const subtitle =
              view === 'users'
                ? `Votes: ${String(r.score ?? 0)}`
                : `By: ${String(r.author ?? 'Unknown')} · Votes: ${String(r.appraises ?? 0)}`

            return (
              <Surface key={`${view}-${rank}-${i}`} style={styles.itemCard} elevation={0}>
                <View style={styles.itemRow}>
                  {/* medal for top 3 */}
                  <View style={styles.rankBlock}>
                    <Text style={styles.rankText}>#{rank}</Text>
                    {rank <= 3 ? (
                      <View style={styles.rankMedal}>
                        {renderMedal(rank, 18)}
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.itemTextCol}>
                    <Text style={styles.itemTitle} numberOfLines={view === 'users' ? 1 : 2}>
                      {title}
                    </Text>
                    <Text style={styles.itemSubtitle} numberOfLines={2}>
                      {subtitle}
                    </Text>

                    {/* For messages view, show a little extra preview under */}
                    {view === 'echoes' && (
                      <Text style={styles.itemPreview} numberOfLines={3}>
                        {String(r.preview ?? '')}
                      </Text>
                    )}
                  </View>
                </View>
              </Surface>
            )
          })}

          {!rows.length && !loading && (
            <Text style={styles.empty}>No results yet</Text>
          )}
        </View>

      </ScrollView>
    </Background>
  )
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  )
}

/**
 * Avatar behavior:
 * - Uses remote URL if available
 * - Else initials placeholder
 *
 * If you later add a URL field:
 * users: avatarUrl / profilePic / profile_image
 * echoes: authorAvatarUrl / avatarUrl
 */
function renderAvatar(item, view) {
  if (!item) {
    return <Avatar.Text size={92} label="U" style={styles.avatarPlaceholder} />
  }

  const url =
    (view === 'users'
      ? (item.avatarUrl || item.profilePic || item.profile_image)
      : (item.authorAvatarUrl || item.avatarUrl)) || null

  if (url && typeof url === 'string') {
    return (
      <Avatar.Image
        size={92}
        source={{ uri: url }}
        style={styles.avatarImage}
      />
    )
  }

  const label =
    view === 'users'
      ? topInitial(item.email)
      : topInitial(item.author)

  return <Avatar.Text size={92} label={label} style={styles.avatarPlaceholder} />
}

function topInitial(text) {
  if (!text) return 'U'
  return String(text[0] ?? 'U').toUpperCase()
}

/**
 * Medal PNG renderer (uses Image + require like your example)
 * Image source={require('../assets/images/logo.png')} style={styles.image}
 */
function renderMedal(rank, size = 24) {
  let source = null
  if (rank === 1) source = medalGold
  else if (rank === 2) source = medalSilver
  else if (rank === 3) source = medalCopper
  if (!source) return null

  return (
    <Image
      source={source}
      style={{ width: size, height: size, resizeMode: 'contain' }}
    />
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },

  /* ----- top header bar ----- */
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 10,
  },
  refreshBtn: {
    width: 92,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 92,
  },

  /* ----- filters (top) ----- */
  filterWrap: {
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    padding: 10,
    marginBottom: 14,
  },
  segmented: {
    borderRadius: 12,
  },

  /* ----- big top card ----- */
  topCard: {
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    marginBottom: 14,
  },
  topSectionLabel: {
    color: '#bbb',
    fontSize: 12,
    marginBottom: 10,
  },
  topCardRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  topAvatarAndMedal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholder: {
    backgroundColor: '#4f46e5',
  },
  avatarImage: {
    backgroundColor: 'transparent',
  },
  topTextBlock: {
    alignItems: 'center',
    marginTop: 4,
  },
  topName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    maxWidth: '95%',
  },
  topVotes: {
    color: '#ddd',
    fontSize: 13,
    marginBottom: 6,
  },
  topPreview: {
    color: '#bbb',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: '95%',
  },

  /* ----- stats ----- */
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#aaa',
    fontSize: 12,
  },
  statValue: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },

  /* ----- list (no table) ----- */
  sectionTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  listWrap: {
    gap: 10,
    marginBottom: 16,
  },
  itemCard: {
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rankBlock: {
    width: 72,
    paddingTop: 2,
    alignItems: 'flex-start',
  },
  rankText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  rankMedal: {
    marginTop: 6,
  },
  itemTextCol: {
    flex: 1,
    paddingLeft: 8,
  },
  itemTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  itemSubtitle: {
    color: '#cfcfcf',
    fontSize: 12,
  },
  itemPreview: {
    marginTop: 6,
    color: '#bdbdbd',
    fontSize: 12,
  },

  empty: {
    color: '#aaa',
    marginTop: 8,
  },
  error: {
    color: '#ff6b6b',
    marginBottom: 10,
  },
})
