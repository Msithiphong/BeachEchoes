// app/(tabs)/Leaderboard.js
// This screen renders a “card-based” leaderboard (instead of a table).
// - Top area: filters (Week/Month + Top Users/Top Messages) stay at the top.
// - Main area: a big “#1” card + a scrollable list of the remaining ranks.
// - This file assumes your backend endpoint is: GET /api/leaderboard?view=users|messages&period=week|month&limit=50

import React, { useEffect, useMemo, useState } from 'react'
// React Native UI primitives:
// - View: layout container (like a div)
// - StyleSheet: styles object creator
// - ScrollView: scrollable vertical container
// - Image: renders medal images
// - useWindowDimensions: gives live screen width/height so layout adapts to device size
import { View, StyleSheet, ScrollView, Image, useWindowDimensions } from 'react-native'

// react-native-paper components (Material UI-ish):
// - Text: consistent typography
// - Surface: paper-like container (can have elevation/shadow)
// - Avatar: user avatar circles (Image/Text variants)
// - SegmentedButtons: the top “tab-like” button rows
import { Text, Surface, Avatar, SegmentedButtons } from 'react-native-paper'

// expo-router components:
// - Stack.Screen: lets this screen set its header/title options
// - useRouter: navigation helper (kept here even if you don’t use it yet)
import { Stack, useRouter } from 'expo-router'

// Your shared layout components:
// - Background likely provides the main page background + default container layout (maxWidth, centering, etc.)
import Background from '../../components/Background'
import Button from '../../components/Button'

// Base URL for API calls.
// NOTE: 10.0.2.2 is the Android emulator “host machine loopback”.
// If you run on a real phone, you usually must change this to your PC’s LAN IP.
const API_BASE = 'http://10.0.2.2:3000'

// Medal PNGs must exist at these paths.
// IMPORTANT: require() paths are resolved at build time, so the files must exist.
const medalGold = require('../../assets/images/gold-medal.png')
const medalSilver = require('../../assets/images/silvar-medal.png') // spelling kept to match your file name
const medalCopper = require('../../assets/images/copper-medal.png')

export default function Leaderboard() {
  // Router instance (safe to keep for later navigation like “tap a user to open profile”)
  const router = useRouter()

  // Screen width (updates if device rotates or window changes)
  const { width: screenW } = useWindowDimensions()

  // Background.js forces a centered maxWidth layout (ex: maxWidth: 340).
  // This screen wants to be “full width”, so we counteract that by shifting left.
  // - BG_MAX_WIDTH: the forced width from Background.js
  // - leftOffset: how far the centered content is offset from left edge,
  //   plus a small padding tweak (+12) so spacing feels normal.
  const BG_MAX_WIDTH = 340
  const leftOffset = Math.max(0, (screenW - BG_MAX_WIDTH) / 2) + 16

  // ----------------------------
  // Filters (must match backend)
  // ----------------------------

  // view controls which leaderboard you fetch:
  // - 'users' => backend returns user leaderboard rows
  // - 'messages' => backend returns message leaderboard rows
  const [view, setView] = useState('users')

  // period controls time window for ranking:
  // backend supports day|week|month|all (per your comment),
  // but the UI only shows week/month for simplicity.
  const [period, setPeriod] = useState('week')

  // Loading + error states for fetch UI
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ----------------------------
  // Data state
  // ----------------------------

  // rows holds the raw leaderboard rows from the backend:
  // - when view === 'users': { name, total_upvotes, avatar_url, rank? }
  // - when view === 'messages': { message, upvotes, author: { name, avatar_url }, rank? }
  const [rows, setRows] = useState([])

  // stats is a small “summary row” UI (messages/upvotes/comments)
  // Here it’s computed locally from rows (no separate /api/stats call).
  const [stats, setStats] = useState({ echoes: 0, appraises: 0, comments: 0 })

  // UI only displays Week/Month.
  // If period is anything else (like 'day' or 'all'), this falls back to showing 'week' selected.
  // (You can expand the UI later if you want more periods.)
  const togglePeriodValue = period === 'month' ? 'month' : 'week'

  // ------------------------------------
  // Build the leaderboard URL (memoized)
  // ------------------------------------
  // useMemo prevents rebuilding the URL on every render unless dependencies change.
  // This keeps fetch logic stable and avoids accidental extra network calls.
  const leaderboardUrl = useMemo(() => {
    // URLSearchParams safely builds query strings:
    // - avoids manual string concatenation mistakes
    // - properly escapes special characters
    const params = new URLSearchParams({
      view,
      period,
      limit: '50',
    })

    // Final URL example:
    // http://10.0.2.2:3000/api/leaderboard?view=users&period=week&limit=50
    return `${API_BASE}/api/leaderboard?${params.toString()}`
  }, [view, period])

  // ----------------------------
  // Fetch leaderboard data
  // ----------------------------
  async function loadData() {
    // Start loading + clear any old error
    setLoading(true)
    setError('')

    try {
      // Request leaderboard
      const lbRes = await fetch(leaderboardUrl)

      // If server responds with non-2xx:
      // - read body text (often contains useful error info)
      // - throw to go to catch()
      if (!lbRes.ok) {
        const t = await lbRes.text()
        throw new Error(`Leaderboard HTTP ${lbRes.status}: ${t}`)
      }

      // Parse JSON response
      const lb = await lbRes.json()

      // Expected backend shape:
      // { success: true, view, period, limit, data: [...] }
      if (!lb || lb.success !== true) {
        throw new Error(lb?.error || 'Leaderboard response was not success=true')
      }

      // Protect against lb.data being missing or not an array
      const data = Array.isArray(lb.data) ? lb.data : []

      // Save rows to state => triggers re-render
      setRows(data)

      // ----------------------------
      // Compute stats locally
      // ----------------------------
      // You removed /api/stats, so the stats box is derived from the current rows:
      // - “Messages” = number of items currently in the list (users or messages)
      // - “Upvotes” = sum of upvotes across the list
      // - “Comments” = 0 (placeholder until you implement comment stats)
      if (view === 'users') {
        // total_upvotes exists on user rows
        const totalUpvotes = data.reduce((sum, r) => sum + Number(r.total_upvotes ?? 0), 0)
        setStats({
          echoes: data.length,
          appraises: totalUpvotes,
          comments: 0,
        })
      } else {
        // upvotes exists on message rows
        const totalUpvotes = data.reduce((sum, r) => sum + Number(r.upvotes ?? 0), 0)
        setStats({
          echoes: data.length,
          appraises: totalUpvotes,
          comments: 0,
        })
      }
    } catch (e) {
      // Any fetch/json/logic error lands here.
      // console.error helps you see the actual reason in Metro logs / console.
      console.error(e)

      // User-friendly UI message:
      setError('Failed to load leaderboard data')

      // Reset state to safe defaults:
      setRows([])
      setStats({ echoes: 0, appraises: 0, comments: 0 })
    } finally {
      // Always stop loading even if error happened
      setLoading(false)
    }
  }

  // ----------------------------
  // Auto-load on filter change
  // ----------------------------
  // Every time `view` or `period` changes, refetch leaderboard.
  useEffect(() => {
    loadData()

    // This ESLint disable prevents the linter from forcing `loadData` into dependencies.
    // If you included loadData, it would change identity on re-render and could loop.
    // Alternative: wrap loadData in useCallback, then include it safely.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, period])

  // ----------------------------
  // Derived UI data
  // ----------------------------

  // Top item is rank #1 (first row returned).
  // We assume backend returns sorted list (highest first).
  const topItem = rows.length ? rows[0] : null

  // Remaining items start at #2.
  // This allows you to render rank #1 in the large “top card” section,
  // and keep the list cleaner.
  const listRows = rows.length > 1 ? rows.slice(1) : []

  // ----------------------------
  // Render
  // ----------------------------
  return (
    <Background>
      {/* Configure the screen header title (Expo Router Stack) */}
      <Stack.Screen options={{ title: 'Leaderboard' }} />

      {/* 
        CANCEL Background.js center+maxWidth by shifting left:
        - styles.shiftWrap makes this full-height container (flex: 1)
        - width: screenW forces full screen width
        - translateX shifts content left so it lines up with the real screen edges
      */}
      <View
        style={[
          styles.shiftWrap,
          {
            width: screenW,
            transform: [{ translateX: -leftOffset }],
          },
        ]}
      >
        {/* 
          ScrollView:
          - style={styles.scroll} ensures it can expand (flex: 1)
          - contentContainerStyle controls padding/growth of inner content
          - showsVerticalScrollIndicator={false} hides scrollbar for cleaner look
        */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {/* ----------------------------
              TOP HEADER BAR
             ---------------------------- */}
          <Surface style={styles.headerBar} elevation={0}>
            {/* Refresh button re-fetches leaderboard */}
            <Button mode="outlined" onPress={loadData} disabled={loading} style={styles.refreshBtn}>
              Refresh
            </Button>

            {/* Title in center */}
            <Text style={styles.headerTitle}>Leaderboard</Text>

            {/* Spacer so title stays centered (same width as refresh button) */}
            <View style={styles.headerSpacer} />
          </Surface>

          {/* ----------------------------
              FILTERS (stay near top)
             ---------------------------- */}
          <Surface style={styles.filterWrap} elevation={0}>
            {/* Period toggle (Week/Month only) */}
            <SegmentedButtons
              value={togglePeriodValue}
              // When user taps week/month, update `period` state => triggers useEffect => reload
              onValueChange={(v) => setPeriod(v)}
              buttons={[
                { value: 'week', label: 'Week' },
                { value: 'month', label: 'Month' },
              ]}
              style={styles.segmented}
            />

            {/* Simple spacing between the two segmented rows */}
            <View style={{ height: 10 }} />

            {/* View toggle (Top Users / Top Messages) */}
            <SegmentedButtons
              value={view}
              // Update `view` state => triggers reload
              onValueChange={(v) => setView(v)}
              buttons={[
                { value: 'users', label: 'Top Users' },
                { value: 'messages', label: 'Top Messages' },
              ]}
              style={styles.segmented}
            />
          </Surface>

          {/* ----------------------------
              STATS ROW
             ---------------------------- */}
          {/* 
            Stat is a small component below.
            stats.echoes/appraises/comments are computed from the current list.
          */}
          <View style={styles.statsRow}>
            <Stat label="Messages" value={stats.echoes} />
            <Stat label="Upvotes" value={stats.appraises} />
            <Stat label="Comments" value={stats.comments} />
          </View>

          {/* If we have an error message, show it */}
          {error !== '' && <Text style={styles.error}>{error}</Text>}

          {/* ----------------------------
              BIG TOP CARD (rank #1)
             ---------------------------- */}
          <Surface style={styles.topCard} elevation={0}>
            {/* Label changes depending on selected view */}
            <Text style={styles.topSectionLabel}>
              {view === 'users' ? 'Top User' : 'Top Message'}
            </Text>

            {/* Avatar + medal row */}
            <View style={styles.topCardRow}>
              <View style={styles.topAvatarAndMedal}>
                {/* Avatar rendering depends on view + available URL */}
                {renderAvatar(topItem, view)}
                <View style={{ width: 10 }} />
                {/* Rank #1 medal */}
                {renderMedal(1, 38)}
              </View>
            </View>

            {/* Main text area for the top item */}
            <View style={styles.topTextBlock}>
              {/* Display name:
                  - users: item.name
                  - messages: item.author.name
              */}
              <Text style={styles.topName} numberOfLines={1}>
                {view === 'users' ? topItem?.name ?? '—' : topItem?.author?.name ?? '—'}
              </Text>

              {/* Votes in a black “pill” bubble for strong contrast */}
              <View style={styles.topVotesBubble}>
                <Text style={styles.topVotesBubbleText}>
                  {view === 'users'
                    ? `Votes: ${String(topItem?.total_upvotes ?? 0)}`
                    : `Votes: ${String(topItem?.upvotes ?? 0)}`}
                </Text>
              </View>

              {/* Only show message preview if we’re in messages view */}
              {view === 'messages' && (
                <Text style={styles.topPreview} numberOfLines={3}>
                  {topItem?.message ?? '—'}
                </Text>
              )}
            </View>
          </Surface>

          {/* ----------------------------
              LIST SECTION (starts at #2)
             ---------------------------- */}
          <Text style={styles.sectionTitle}>
            {view === 'users' ? 'Leaderboard Users' : 'Leaderboard Messages'}
          </Text>

          <View style={styles.listWrap}>
            {/* 
              Render each row as a card.
              - i is 0-based index within listRows (which starts at rank #2)
              - rank comes from backend if provided, else fallback to i+2
            */}
            {listRows.map((r, i) => {
              // Use backend rank if present; otherwise compute it from index
              const rank = Number(r.rank ?? i + 2)

              // Card title:
              // - users: r.name
              // - messages: r.message
              const title = view === 'users' ? r.name ?? 'Unknown User' : r.message ?? 'Unknown Message'

              // Card subtitle:
              // - users: show votes total_upvotes
              // - messages: show author + votes
              const subtitle =
                view === 'users'
                  ? `Votes: ${String(r.total_upvotes ?? 0)}`
                  : `By: ${String(r.author?.name ?? 'Unknown')} · Votes: ${String(r.upvotes ?? 0)}`

              return (
                // Surface card wrapper:
                // - key must be unique/stable to help React list rendering
                // - you include view + rank + i for uniqueness
                <Surface key={`${view}-${rank}-${i}`} style={styles.itemCard} elevation={0}>
                  <View style={styles.itemRow}>
                    {/* Rank block on the left */}
                    <View style={styles.rankBlock}>
                      <Text style={styles.rankText}>#{rank}</Text>

                      {/* Show medals only for top 3 ranks */}
                      {rank <= 3 ? <View style={styles.rankMedal}>{renderMedal(rank, 18)}</View> : null}
                    </View>

                    {/* Text column on the right */}
                    <View style={styles.itemTextCol}>
                      {/* Title lines:
                          - users: 1 line (names should be short)
                          - messages: allow 2 lines
                      */}
                      <Text style={styles.itemTitle} numberOfLines={view === 'users' ? 1 : 2}>
                        {title}
                      </Text>

                      <Text style={styles.itemSubtitle} numberOfLines={2}>
                        {subtitle}
                      </Text>

                      {/* Extra preview line only for messages */}
                      {view === 'messages' && (
                        <Text style={styles.itemPreview} numberOfLines={3}>
                          {String(r.message ?? '')}
                        </Text>
                      )}
                    </View>
                  </View>
                </Surface>
              )
            })}

            {/* Empty state (only show when not loading and no rows) */}
            {!listRows.length && !loading && <Text style={styles.empty}>No results yet</Text>}
          </View>
        </ScrollView>
      </View>
    </Background>
  )
}

// ----------------------------
// Small reusable stat component
// ----------------------------
// This just prints a label + number.
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
 * - If no item, show placeholder "U"
 * - If item has avatar URL, show Avatar.Image
 * - Else show initials (first character of name)
 *
 * Note: view determines where avatar lives:
 * - users: item.avatar_url
 * - messages: item.author.avatar_url
 */
function renderAvatar(item, view) {
  // If topItem is missing (no rows), show a default placeholder
  if (!item) {
    return <Avatar.Text size={92} label="U" style={styles.avatarPlaceholder} />
  }

  // Select avatar URL based on view type
  const url = view === 'users' ? item.avatar_url ?? null : item.author?.avatar_url ?? null

  // If URL looks valid, render it as an image avatar
  if (url && typeof url === 'string') {
    return <Avatar.Image size={92} source={{ uri: url }} style={styles.avatarImage} />
  }

  // If no image, use initial:
  // - users: initial from item.name
  // - messages: initial from item.author.name
  const label = view === 'users' ? topInitial(item.name) : topInitial(item.author?.name)

  return <Avatar.Text size={92} label={label} style={styles.avatarPlaceholder} />
}

// Get the first letter of a name (fallback to "U")
function topInitial(text) {
  if (!text) return 'U'
  return String(text[0] ?? 'U').toUpperCase()
}

/**
 * Medal renderer:
 * - rank 1 => gold
 * - rank 2 => silver
 * - rank 3 => copper
 * - anything else => no medal
 */
function renderMedal(rank, size = 24) {
  let source = null
  if (rank === 1) source = medalGold
  else if (rank === 2) source = medalSilver
  else if (rank === 3) source = medalCopper
  if (!source) return null

  // resizeMode 'contain' keeps the medal aspect ratio (no stretching)
  return <Image source={source} style={{ width: size, height: size, resizeMode: 'contain' }} />
}

// ----------------------------
// Styles
// ----------------------------
// IMPORTANT NOTE ABOUT COLORS:
// You set most text to black (#000). That’s fine *if your background is light*.
// But your itemCard background is dark (rgba(0,0,0,0.55)),
// so black text will be very hard to see on it.
// If you want readable text on dark cards, change item text colors to '#fff'.
const styles = StyleSheet.create({
  // Wrapper that counters Background.js maxWidth/centering
  shiftWrap: {
    // alignSelf flex-start makes it stick to the left edge instead of centering
    alignSelf: 'flex-start',
    // flex:1 allows it to fill available vertical space (helps ScrollView behave)
    flex: 1,
  },

  // ScrollView style: flex ensures it can grow and scroll properly
  scroll: {
    flex: 1,
  },

  // content container inside ScrollView
  container: {
    // top/bottom padding so content doesn't touch edges
    paddingVertical: 16,
    // left/right padding for readable margins
    paddingHorizontal: 14,
    // stretch ensures full width usage
    alignSelf: 'stretch',
    // flexGrow ensures content can expand and scroll correctly
    flexGrow: 1,
  },

  /* ----- top header bar ----- */
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,

    // translucent white background
    backgroundColor: 'rgba(255,255,255,0.06)',

    // spacing below header
    marginBottom: 10,
  },
  refreshBtn: {
    // fixed width so center title stays centered with spacer on right
    width: 92,
  },
  headerTitle: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSpacer: {
    // matches refresh button width to keep title centered
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
    // mostly cosmetic: rounded segmented control
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
    color: '#000',
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

  // Avatar placeholder uses a solid background color
  avatarPlaceholder: {
    backgroundColor: '#4f46e5',
  },
  avatarImage: {
    // transparent background prevents weird colored circle behind the image
    backgroundColor: 'transparent',
  },

  topTextBlock: {
    alignItems: 'center',
    marginTop: 4,
  },
  topName: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    maxWidth: '95%',
  },

  // Black “pill” for votes
  topVotesBubble: {
    backgroundColor: '#000',
    borderRadius: 999, // very large radius => pill shape
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  topVotesBubbleText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },

  topPreview: {
    color: '#000',
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
    color: '#000',
    fontSize: 12,
  },
  statValue: {
    color: '#000',
    fontSize: 20,
    fontWeight: 'bold',
  },

  /* ----- list ----- */
  sectionTitle: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  listWrap: {
    // gap adds spacing between cards (RN supports gap in newer versions)
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
    // WARNING: black on dark background is low contrast.
    // Change to '#fff' if you want it readable on itemCard.
    color: '#000',
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
    // WARNING: black on dark background is low contrast.
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  itemSubtitle: {
    // WARNING: black on dark background is low contrast.
    color: '#000',
    fontSize: 12,
  },
  itemPreview: {
    marginTop: 6,
    // WARNING: black on dark background is low contrast.
    color: '#000',
    fontSize: 12,
  },

  empty: {
    color: '#000',
    marginTop: 8,
  },
  error: {
    color: '#000',
    marginBottom: 10,
  },
})
