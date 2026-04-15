// app/(tabs)/Leaderboard.js
// No table anymore: instead, you scroll to see cards for Top Users / Top Messages.
// ✅ Week/Month filter + Top Users/Top Messages filter stays at TOP
// ✅ Medal PNGs via require(): gold-medal.png / silvar-medal.png / copper-medal.png
// ✅ Uses <Image source={require(...)} style={...} />
// ✅ Big top card (rank #1) + scrollable list of rounded cards for the rest
// ✅ Keeps original logic: view/period/category, urls, stats, loadData, useEffect deps, refresh

import React, { useEffect, useMemo, useState } from 'react'
<<<<<<< Updated upstream
import { View, StyleSheet, ScrollView, Image } from 'react-native'
import { Text, Surface, Avatar, SegmentedButtons } from 'react-native-paper'
=======
// React Native UI primitives:
// - View: layout container (like a div)
// - StyleSheet: styles object creator
// - ScrollView: scrollable vertical container
// - Image: renders medal images
// - useWindowDimensions: gives live screen width/height so layout adapts to device size
// - Pressable: ADDED to replace SegmentedButtons with custom pill-style filter buttons
import { View, StyleSheet, ScrollView, Image, useWindowDimensions, Pressable } from 'react-native'

// react-native-paper components (Material UI-ish):
// - Text: consistent typography
// - Surface: paper-like container (can have elevation/shadow)
// - Avatar: user avatar circles (Image/Text variants)
// NOTE: SegmentedButtons was REMOVED and replaced by custom Pressable filter pills
import { Text, Surface, Avatar } from 'react-native-paper'

// expo-router components:
// - Stack.Screen: lets this screen set its header/title options
// - useRouter: navigation helper (kept here even if you don’t use it yet)
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
  // data (kept)
  const [rows, setRows] = useState([])
  const [stats, setStats] = useState({ echoes: 0, appraises: 0, comments: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

=======
  // Background.js forces a centered maxWidth layout (ex: maxWidth: 340).
  // This screen wants to be “full width”, so we counteract that by shifting left.
  // CHANGED from the GitHub version:
  // - removed the extra +16 offset
  // - this aligns the leaderboard content more naturally with your current screen layout
  const BG_MAX_WIDTH = 340
  const leftOffset = Math.max(0, (screenW - BG_MAX_WIDTH) / 2)

  // ----------------------------
  // Filters (must match backend)
  // ----------------------------
  const [view, setView] = useState('users')
  const [period, setPeriod] = useState('week')

  // Loading + error states for fetch UI
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ----------------------------
  // Data state
  // ----------------------------
  const [rows, setRows] = useState([])
  const [stats, setStats] = useState({ echoes: 0, appraises: 0, comments: 0 })

  // UI only displays Week/Month.
  const togglePeriodValue = period === 'month' ? 'month' : 'week'

  // ------------------------------------
  // Build the leaderboard URL (memoized)
  // ------------------------------------
>>>>>>> Stashed changes
  const leaderboardUrl = useMemo(() => {
    const params = new URLSearchParams({
      view,
      period,
      category,
      limit: '50', // more items since we're showing a scroll list
    })
    return `${API_BASE}/api/leaderboard?${params.toString()}`
  }, [view, period, category])

<<<<<<< Updated upstream
  const statsUrl = useMemo(() => {
    const params = new URLSearchParams({ period, category })
    return `${API_BASE}/api/stats?${params.toString()}`
  }, [period, category])
=======
    return `${API_BASE}/leaderboard?${params.toString()}`
  }, [view, period])
>>>>>>> Stashed changes

  async function loadData() {
    setLoading(true)
    setError('')
    try {
<<<<<<< Updated upstream
      const [lbRes, stRes] = await Promise.all([
        fetch(leaderboardUrl),
        fetch(statsUrl),
      ])

=======
      const lbRes = await fetch(leaderboardUrl)

      if (!lbRes.ok) {
        const t = await lbRes.text()
        throw new Error(`Leaderboard HTTP ${lbRes.status}: ${t}`)
      }

>>>>>>> Stashed changes
      const lb = await lbRes.json()
      const st = await stRes.json()

<<<<<<< Updated upstream
      setRows(Array.isArray(lb) ? lb : [])
      setStats(st || { echoes: 0, appraises: 0, comments: 0 })
=======
      if (!lb || lb.success !== true) {
        throw new Error(lb?.error || 'Leaderboard response was not success=true')
      }

      const data = Array.isArray(lb.data) ? lb.data : []
      setRows(data)

      if (view === 'users') {
        const totalUpvotes = data.reduce((sum, r) => sum + Number(r.total_upvotes ?? 0), 0)
        setStats({
          echoes: data.length,
          appraises: totalUpvotes,
          comments: 0,
        })
      } else {
        const totalUpvotes = data.reduce((sum, r) => sum + Number(r.upvotes ?? 0), 0)
        setStats({
          echoes: data.length,
          appraises: totalUpvotes,
          comments: 0,
        })
      }
>>>>>>> Stashed changes
    } catch (e) {
      console.error(e)
      setError('Failed to load leaderboard data')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

<<<<<<< Updated upstream
  useEffect(() => {
    loadData()
  }, [view, period, category])

  const topItem = rows.length ? rows[0] : null
  const restItems = rows.length > 1 ? rows.slice(1) : []

  // UI: only week/month shown
  const togglePeriodValue = period === 'month' ? 'month' : 'week'
=======
  // ----------------------------
  // Auto-load on filter change
  // ----------------------------
  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, period])

  // ----------------------------
  // Derived UI data
  // ----------------------------
  const topItem = rows.length ? rows[0] : null
  const listRows = rows.length > 1 ? rows.slice(1) : []
>>>>>>> Stashed changes

  return (
    <Background>
      <Stack.Screen options={{ title: 'Leaderboard' }} />

<<<<<<< Updated upstream
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
=======
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
        >
          {/* ----------------------------
              TOP HEADER BAR
             ---------------------------- */}
          <Surface style={styles.headerBar} elevation={0}>
            {/* CHANGED from the GitHub version:
                - title now appears on the left
                - refresh button now appears on the right
                - refresh button uses contained styling with white background */}
            <Text style={styles.headerTitle}>Leaderboard</Text>

            <View style={styles.headerSpacer} />

            <Button
              mode="contained"
              onPress={loadData}
              disabled={loading}
              style={styles.refreshBtn}
              buttonColor="#ffffff"
              textColor="#000000"
            >
              Refresh
            </Button>
          </Surface>

          {/* ----------------------------
              FILTERS (stay near top)
             ---------------------------- */}
          <Surface style={styles.filterWrap} elevation={0}>
            {/* CHANGED from the GitHub version:
                - replaced SegmentedButtons with custom Pressable pill buttons
                - this allows fuller control over rounded shape, colors, spacing, and selected state */}

            {/* Period toggle (Week/Month only) */}
            <View style={styles.segmentRow}>
              <Pressable
                onPress={() => setPeriod('week')}
                style={[
                  styles.segmentPill,
                  togglePeriodValue === 'week' && styles.segmentPillSelected,
                ]}
              >
                <Text
                  style={[
                    styles.segmentPillText,
                    togglePeriodValue === 'week' && styles.segmentPillTextSelected,
                  ]}
                >
                  Week
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setPeriod('month')}
                style={[
                  styles.segmentPill,
                  togglePeriodValue === 'month' && styles.segmentPillSelected,
                ]}
              >
                <Text
                  style={[
                    styles.segmentPillText,
                    togglePeriodValue === 'month' && styles.segmentPillTextSelected,
                  ]}
                >
                  Month
                </Text>
              </Pressable>
            </View>

            {/* Simple spacing between the two filter rows */}
            <View style={styles.segmentGap} />

            {/* View toggle (Top Users / Top Messages) */}
            <View style={styles.segmentRow}>
              <Pressable
                onPress={() => setView('users')}
                style={[
                  styles.segmentPill,
                  view === 'users' && styles.segmentPillSelected,
                ]}
              >
                <Text
                  style={[
                    styles.segmentPillText,
                    view === 'users' && styles.segmentPillTextSelected,
                  ]}
                >
                  Top Users
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setView('messages')}
                style={[
                  styles.segmentPill,
                  view === 'messages' && styles.segmentPillSelected,
                ]}
              >
                <Text
                  style={[
                    styles.segmentPillText,
                    view === 'messages' && styles.segmentPillTextSelected,
                  ]}
                >
                  Top Messages
                </Text>
              </Pressable>
            </View>
          </Surface>

          {/* ----------------------------
              STATS ROW
             ---------------------------- */}
          {/* CHANGED from the GitHub version:
              - stats row display was commented out/hidden from the UI
              - data is still computed in state, but not currently rendered */}
          {/*
          <View style={styles.statsRow}>
            <Stat label="Messages" value={stats.echoes} />
            <Stat label="Upvotes" value={stats.appraises} />
            <Stat label="Comments" value={stats.comments} />
          </View>
          */}
>>>>>>> Stashed changes

        {/* STATS */}
        <View style={styles.statsRow}>
          <Stat label="Echoes" value={stats.echoes} />
          <Stat label="Appraises" value={stats.appraises} />
          <Stat label="Comments" value={stats.comments} />
        </View>

<<<<<<< Updated upstream
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
=======
          {/* ----------------------------
              BIG TOP CARD (rank #1)
             ---------------------------- */}
          <Surface style={styles.topCard} elevation={0}>
            {/* CHANGED from the GitHub version:
                - removed the top section label ("Top User" / "Top Message")
                - medal is now overlaid on the avatar instead of shown beside it
                - messages view now shows message text as the main bold title
                - author is shown below as "By user" */}
            <View style={styles.topCardRow}>
              <View style={styles.topAvatarWrap}>
                {renderAvatar(topItem, view)}
                <View style={styles.topMedalOverlay}>
                  {renderMedal(1, 34)}
                </View>
              </View>
            </View>

            <View style={styles.topTextBlock}>
              {view === 'users' ? (
                <Text style={styles.topName} numberOfLines={1}>
                  {topItem?.name ?? '—'}
                </Text>
              ) : (
                <>
                  <Text style={styles.topMessageTitle} numberOfLines={2}>
                    {topItem?.message ?? '—'}
                  </Text>
                  <Text style={styles.topByUser} numberOfLines={1}>
                    By {topItem?.author?.name ?? '—'}
                  </Text>
                </>
              )}

              <View style={styles.topVotesBubble}>
                <Text style={styles.topVotesBubbleText}>
                  {view === 'users'
                    ? `Votes: ${String(topItem?.total_upvotes ?? 0)}`
                    : `Votes: ${String(topItem?.upvotes ?? 0)}`}
                </Text>
              </View>
            </View>
          </Surface>

          {/* ----------------------------
              LIST SECTION (starts at #2)
             ---------------------------- */}
          <Text style={styles.sectionTitle}>
            {view === 'users' ? 'Leaderboard Users' : 'Leaderboard Messages'}
          </Text>

          <View style={styles.listWrap}>
            {listRows.map((r, i) => {
              const rank = Number(r.rank ?? i + 2)

              return (
                <Surface key={`${view}-${rank}-${i}`} style={styles.itemCard} elevation={0}>
                  <View style={styles.itemRow}>
                    <View style={styles.rankBlock}>
                      {/* CHANGED from the GitHub version:
                          - medal and rank are now displayed on the same horizontal row
                          - gives a tighter, cleaner layout for ranked list items */}
                      <View style={styles.rankAndMedalRow}>
                        {rank <= 3 ? <View style={styles.rankMedal}>{renderMedal(rank, 18)}</View> : null}
                        <Text style={styles.rankText}>#{rank}</Text>
                      </View>
                    </View>

                    {/* CHANGED from the GitHub version:
                        - users view still shows user name
                        - messages view now shows message text as primary text
                        - author appears below as "By user"
                        - vote count is moved to a separate right-side text block */}
                    <View style={styles.itemNameBlock}>
                      {view === 'users' ? (
                        <Text style={styles.itemName} numberOfLines={1}>
                          {r.name ?? 'Unknown User'}
                        </Text>
                      ) : (
                        <>
                          <Text style={styles.itemMessageText} numberOfLines={2}>
                            {r.message ?? 'Unknown Message'}
                          </Text>
                          <Text style={styles.itemByUser} numberOfLines={1}>
                            By {r.author?.name ?? 'Unknown'}
                          </Text>
                        </>
                      )}
                    </View>

                    <Text style={styles.itemVotes}>
                      {view === 'users'
                        ? `${String(r.total_upvotes ?? 0)} Votes`
                        : `${String(r.upvotes ?? 0)} Votes`}
                    </Text>
                  </View>
                </Surface>
              )
            })}

            {!listRows.length && !loading && <Text style={styles.empty}>No results yet</Text>}
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
=======
// ----------------------------
// Small reusable stat component
// ----------------------------
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
  const url =
    (view === 'users'
      ? (item.avatarUrl || item.profilePic || item.profile_image)
      : (item.authorAvatarUrl || item.avatarUrl)) || null
=======
  const url = view === 'users' ? item.avatar_url ?? null : item.author?.avatar_url ?? null
>>>>>>> Stashed changes

  if (url && typeof url === 'string') {
    return (
      <Avatar.Image
        size={92}
        source={{ uri: url }}
        style={styles.avatarImage}
      />
    )
  }

<<<<<<< Updated upstream
  const label =
    view === 'users'
      ? topInitial(item.email)
      : topInitial(item.author)
=======
  const label = view === 'users' ? topInitial(item.name) : topInitial(item.author?.name)
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
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
=======
  return <Image source={source} style={{ width: size, height: size, resizeMode: 'contain' }} />
}

const styles = StyleSheet.create({
  // Wrapper that counters Background.js maxWidth/centering
  shiftWrap: {
    alignSelf: 'flex-start',
    flex: 1,
  },

  // ScrollView style
  scroll: {
    flex: 1,
  },

  // content container inside ScrollView
  // CHANGED from the GitHub version:
  // - reduced horizontal padding
  // - removed top padding
  // - keeps layout tighter and wider on screen
  container: {
    paddingTop: 0,
    paddingBottom: 16,
    paddingHorizontal: 4,
    alignSelf: 'stretch',
    flexGrow: 1,
>>>>>>> Stashed changes
  },

  /* ----- top header bar ----- */
  // CHANGED from the GitHub version:
  // - darker translucent background
  // - slightly extended left/right with negative margins
  // - better visual separation from the page background
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
<<<<<<< Updated upstream
    backgroundColor: 'rgba(255,255,255,0.06)',
=======
    backgroundColor: 'rgba(0,0,0,0.35)',
>>>>>>> Stashed changes
    marginBottom: 10,
    marginLeft: -6,
    marginRight: -6,
  },
  refreshBtn: {
<<<<<<< Updated upstream
    width: 92,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
=======
    // CHANGED from the GitHub version:
    // - wider button to fit the contained button style better
    width: 120,
  },
  headerTitle: {
    // CHANGED from the GitHub version:
    // - larger title text for stronger emphasis
    color: '#000',
    fontSize: 32,
>>>>>>> Stashed changes
    fontWeight: 'bold',
    marginLeft: 6,
  },
  headerSpacer: {
<<<<<<< Updated upstream
    width: 92,
=======
    width: 20,
>>>>>>> Stashed changes
  },

  /* ----- filters (top) ----- */
  // CHANGED from the GitHub version:
  // - filter wrapper redesigned for custom pill buttons
  // - darker translucent background and slightly rounder corners
  filterWrap: {
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingVertical: 5,
    paddingHorizontal: 6,
    marginBottom: 14,
  },
<<<<<<< Updated upstream
  segmented: {
    borderRadius: 12,
=======

  // ADDED for custom Pressable filter pills
  segmentRow: {
    flexDirection: 'row',
    gap: 6,
  },
  segmentPill: {
    flex: 1,
    minHeight: 34,
    borderRadius: 999,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  segmentPillSelected: {
    backgroundColor: '#ffffff',
  },
  segmentPillText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  segmentPillTextSelected: {
    color: '#000000',
  },
  segmentGap: {
    height: 6,
>>>>>>> Stashed changes
  },

  /* ----- big top card ----- */
  topCard: {
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    marginBottom: 14,
  },
<<<<<<< Updated upstream
  topSectionLabel: {
    color: '#bbb',
    fontSize: 12,
    marginBottom: 10,
  },
=======
>>>>>>> Stashed changes
  topCardRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  // ADDED:
  // wraps avatar so medal can be positioned on top of it
  topAvatarWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
<<<<<<< Updated upstream
=======

  // ADDED:
  // overlays medal at the lower-left area of the top avatar
  topMedalOverlay: {
    position: 'absolute',
    left: -6,
    bottom: -4,
  },

>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
  topVotes: {
    color: '#ddd',
    fontSize: 13,
=======

  // ADDED for top message mode:
  // message text becomes the main bold title
  topMessageTitle: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    maxWidth: '95%',
    textAlign: 'center',
  },

  // ADDED for top message mode:
  // shows the author below the message
  topByUser: {
    color: '#000',
    fontSize: 12,
    marginBottom: 8,
    maxWidth: '95%',
    textAlign: 'center',
  },

  topVotesBubble: {
    backgroundColor: '#000',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
    color: '#fff',
=======
    color: '#000',
>>>>>>> Stashed changes
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  listWrap: {
    gap: 10,
    marginBottom: 16,
  },

  // CHANGED from the GitHub version:
  // - item cards now use a solid dark background instead of semi-transparent dark
  // - improves contrast and makes white text easier to read
  itemCard: {
    borderRadius: 18,
<<<<<<< Updated upstream
    backgroundColor: 'rgba(0,0,0,0.55)',
=======
    backgroundColor: 'rgba(0,0,0,1)',
>>>>>>> Stashed changes
    padding: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankBlock: {
    width: 72,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  // ADDED:
  // puts medal and rank number on the same row
  rankAndMedalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankText: {
<<<<<<< Updated upstream
=======
    // CHANGED from the GitHub version:
    // - white text for readability on dark card background
>>>>>>> Stashed changes
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 6,
  },
  rankMedal: {
    justifyContent: 'center',
  },

  // ADDED:
  // main middle text block for each row
  itemNameBlock: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 10,
  },
<<<<<<< Updated upstream
  itemTitle: {
    color: '#fff',
    fontSize: 14,
=======

  // ADDED / CHANGED:
  // white, larger, bold user name text
  itemName: {
    color: '#fff',
    fontSize: 16,
>>>>>>> Stashed changes
    fontWeight: 'bold',
  },
<<<<<<< Updated upstream
  itemSubtitle: {
    color: '#cfcfcf',
    fontSize: 12,
  },
  itemPreview: {
    marginTop: 6,
    color: '#bdbdbd',
=======

  // ADDED:
  // main message text for message leaderboard rows
  itemMessageText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },

  // ADDED:
  // author line shown below message text
  itemByUser: {
    color: '#d1d5db',
>>>>>>> Stashed changes
    fontSize: 12,
    marginTop: 2,
  },

  // ADDED:
  // vote count separated to right side of row
  itemVotes: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 6,
    marginRight: 6,
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