// app/(tabs)/Leaderboard.js

import React, { useEffect, useMemo, useState } from 'react'
import { View, StyleSheet, ScrollView, Image, useWindowDimensions, Pressable } from 'react-native'
import { Text, Surface, Avatar } from 'react-native-paper'
import { Stack, useRouter } from 'expo-router'

import Background from '../../components/Background'
import Button from '../../components/Button'
import { API_BASE } from '../../config/api'

const medalGold = require('../../assets/images/gold-medal.png')
const medalSilver = require('../../assets/images/silvar-medal.png')
const medalCopper = require('../../assets/images/copper-medal.png')

export default function Leaderboard() {
  const router = useRouter()
  const { width: screenW } = useWindowDimensions()

  const BG_MAX_WIDTH = 340
  const leftOffset = Math.max(0, (screenW - BG_MAX_WIDTH) / 2)

  // Backend now uses:
  // users = top users
  // posts = top posts/messages
  const [view, setView] = useState('users')
  // Removed period state (week/month toggle)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rows, setRows] = useState([])
  const [stats, setStats] = useState({ echoes: 0, appraises: 0, comments: 0 })

  // Removed togglePeriodValue

  const leaderboardUrl = useMemo(() => {
    const params = new URLSearchParams({
      view,
      limit: '50',
    })
    return `${API_BASE}/leaderboard?${params.toString()}`
  }, [view])

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const lbRes = await fetch(leaderboardUrl)

      if (!lbRes.ok) {
        const t = await lbRes.text()
        throw new Error(`Leaderboard HTTP ${lbRes.status}: ${t}`)
      }

      const lb = await lbRes.json()

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
    } catch (e) {
      console.error(e)
      setError('Failed to load leaderboard data')
      setRows([])
      setStats({ echoes: 0, appraises: 0, comments: 0 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  const topItem = rows.length ? rows[0] : null
  const listRows = rows.length > 1 ? rows.slice(1) : []

  return (
    <Background>
      <Stack.Screen options={{ title: 'Leaderboard' }} />

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
          <Surface style={styles.headerBar} elevation={0}>
            <Text style={styles.headerTitle}>Leaderboard</Text>
          </Surface>

          <Surface style={styles.filterWrap} elevation={0}>
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
                onPress={() => setView('posts')}
                style={[
                  styles.segmentPill,
                  view === 'posts' && styles.segmentPillSelected,
                ]}
              >
                <Text
                  style={[
                    styles.segmentPillText,
                    view === 'posts' && styles.segmentPillTextSelected,
                  ]}
                >
                  Top Posts
                </Text>
              </Pressable>
            </View>
          </Surface>

          {error !== '' && <Text style={styles.error}>{error}</Text>}

          <Surface style={styles.topCard} elevation={0}>
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

          <Text style={styles.sectionTitle}>
            {view === 'users' ? 'Leaderboard Users' : 'Leaderboard Posts'}
          </Text>

          <View style={styles.listWrap}>
            {listRows.map((r, i) => {
              const rank = Number(r.rank ?? i + 2)

              return (
                <Surface key={`${view}-${rank}-${i}`} style={styles.itemCard} elevation={0}>
                  <View style={styles.itemRow}>
                    <View style={styles.rankBlock}>
                      <View style={styles.rankAndMedalRow}>
                        {rank <= 3 ? <View style={styles.rankMedal}>{renderMedal(rank, 18)}</View> : null}
                        <Text style={styles.rankText}>#{rank}</Text>
                      </View>
                    </View>

                    <View style={styles.itemNameBlock}>
                      {view === 'users' ? (
                        <Text style={styles.itemName} numberOfLines={1}>
                          {r.name ?? 'Unknown User'}
                        </Text>
                      ) : (
                        <>
                          <Text style={styles.itemMessageText} numberOfLines={2}>
                            {r.message ?? 'Unknown Post'}
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
          </View>
        </ScrollView>
      </View>
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

function renderAvatar(item, view) {
  if (!item) {
    return <Avatar.Text size={92} label="U" style={styles.avatarPlaceholder} />
  }

  const url = view === 'users' ? item.avatar_url ?? null : item.author?.avatar_url ?? null

  if (url && typeof url === 'string') {
    return <Avatar.Image size={92} source={{ uri: url }} style={styles.avatarImage} />
  }

  const label = view === 'users' ? topInitial(item.name) : topInitial(item.author?.name)

  return <Avatar.Text size={92} label={label} style={styles.avatarPlaceholder} />
}

function topInitial(text) {
  if (!text) return 'U'
  return String(text[0] ?? 'U').toUpperCase()
}

function renderMedal(rank, size = 24) {
  let source = null
  if (rank === 1) source = medalGold
  else if (rank === 2) source = medalSilver
  else if (rank === 3) source = medalCopper
  if (!source) return null

  return <Image source={source} style={{ width: size, height: size, resizeMode: 'contain' }} />
}

const styles = StyleSheet.create({
  shiftWrap: {
    alignSelf: 'flex-start',
    flex: 1,
    marginTop: 50,
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
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
    marginBottom: 10,
    marginLeft: -6,
    marginRight: -6,
  },
  refreshBtn: {
    width: 120,
  },
  headerTitle: {
    color: '#000',
    fontSize: 32,
    fontWeight: 'bold',
    marginLeft: 0,
    textAlign: 'center',
    flex: 1,
  },
  headerSpacer: {
    width: 20,
  },

  filterWrap: {
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingVertical: 5,
    paddingHorizontal: 6,
    marginBottom: 14,
  },

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
  },

  topCard: {
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    marginBottom: 14,
  },
  topCardRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  topAvatarWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topMedalOverlay: {
    position: 'absolute',
    left: -6,
    bottom: -4,
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
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    maxWidth: '95%',
  },
  topMessageTitle: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    maxWidth: '95%',
    textAlign: 'center',
  },
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
    marginBottom: 6,
  },
  topVotesBubbleText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },

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

  sectionTitle: {
    color: '#000',
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
    backgroundColor: 'rgba(0,0,0,1)',
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
  rankAndMedalRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 6,
  },
  rankMedal: {
    justifyContent: 'center',
  },
  itemNameBlock: {
    flex: 1,
    justifyContent: 'center',
    paddingLeft: 10,
  },
  itemName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemMessageText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  itemByUser: {
    color: '#d1d5db',
    fontSize: 12,
    marginTop: 2,
  },
  itemVotes: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 6,
    marginRight: 6,
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