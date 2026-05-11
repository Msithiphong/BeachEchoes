// Leaderboard view for ranking users or posts against the same backend endpoint.

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { View, StyleSheet, ScrollView, Image, useWindowDimensions, Pressable } from 'react-native'
import { Text, Surface, Avatar } from 'react-native-paper'
import { Stack } from 'expo-router'

import Background from '../../components/Background'
import { API_BASE } from '../../config/api'
import WaveRefreshOverlay from '../../components/WaveRefreshOverlay'
import { useAppTheme } from '../../context/AppThemeContext'

const medalGold = require('../../assets/images/gold-medal.png')
const medalSilver = require('../../assets/images/silvar-medal.png')
const medalCopper = require('../../assets/images/copper-medal.png')

export default function Leaderboard() {
  const { isDark } = useAppTheme()
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
  const waveRef = useRef(null)

  // Removed togglePeriodValue

  const leaderboardUrl = useMemo(() => {
    // The backend switches response shape based on the requested view.
    const params = new URLSearchParams({
      view,
      limit: '50',
    })
    return `${API_BASE}/leaderboard?${params.toString()}`
  }, [view])

  async function loadData(withWave = false) {
    if (withWave) {
      waveRef.current?.trigger()
    }
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

      // Header stats are derived from the currently selected leaderboard dataset.
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
    loadData(false)
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
            <Text style={[styles.headerTitle, styles.textWhite]}>Leaderboard</Text>
          </Surface>

          <Surface style={styles.filterWrap} elevation={0}>
            <View style={styles.segmentRow}>
              <Pressable
                onPress={() => {
                  waveRef.current?.trigger()
                  setView('users')
                }}
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
                onPress={() => {
                  waveRef.current?.trigger()
                  setView('posts')
                }}
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
          <Pressable style={styles.refreshBtn} onPress={() => loadData(true)}>
            <Text style={styles.refreshBtnText}>Refresh Board</Text>
          </Pressable>

          {error !== '' && <Text style={[styles.error, isDark ? styles.textWhite : styles.textDark]}>{error}</Text>}

          <Surface style={[styles.topCard, isDark ? styles.surfaceDark : styles.surfaceLight]} elevation={0}>
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
                <Text style={[styles.topName, isDark ? styles.textWhite : styles.textDark]} numberOfLines={1}>
                  {topItem?.name ?? '—'}
                </Text>
              ) : (
                <>
                  <Text style={[styles.topMessageTitle, isDark ? styles.textWhite : styles.textDark]} numberOfLines={2}>
                    {topItem?.message ?? '—'}
                  </Text>
                  <Text style={[styles.topByUser, isDark ? styles.textSoftWhite : styles.textSoftDark]} numberOfLines={1}>
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

          <Text style={[styles.sectionTitle, styles.centeredText, isDark ? styles.textWhite : styles.textDark]}>
            {view === 'users' ? 'Leaderboard Users' : 'Leaderboard Posts'}
          </Text>

          <View style={styles.listWrap}>
            {listRows.map((r, i) => {
              const rank = Number(r.rank ?? i + 2)

              return (
                <Surface key={`${view}-${rank}-${i}`} style={[styles.itemCard, isDark ? styles.itemCardDark : styles.itemCardLight]} elevation={0}>
                  <View style={styles.itemRow}>
                    <View style={styles.rankBlock}>
                      <View style={styles.rankAndMedalRow}>
                        {rank <= 3 ? <View style={styles.rankMedal}>{renderMedal(rank, 18)}</View> : null}
                        <Text style={[styles.rankText, isDark ? styles.textWhite : styles.textDark]}>#{rank}</Text>
                      </View>
                    </View>

                    <View style={styles.itemNameBlock}>
                      {view === 'users' ? (
                        <Text style={[styles.itemName, isDark ? styles.textWhite : styles.textDark]} numberOfLines={1}>
                          {r.name ?? 'Unknown User'}
                        </Text>
                      ) : (
                        <>
                          <Text style={[styles.itemMessageText, isDark ? styles.textWhite : styles.textDark]} numberOfLines={2}>
                            {r.message ?? 'Unknown Post'}
                          </Text>
                          <Text style={[styles.itemByUser, isDark ? styles.textSoftWhite : styles.textSoftDark]} numberOfLines={1}>
                            By {r.author?.name ?? 'Unknown'}
                          </Text>
                        </>
                      )}
                    </View>

                    <Text style={[styles.itemVotes, isDark ? styles.textWhite : styles.textDark]}>
                      {view === 'users'
                        ? `${String(r.total_upvotes ?? 0)} Votes`
                        : `${String(r.upvotes ?? 0)} Votes`}
                    </Text>
                  </View>
                </Surface>
              )
            })}

            {!listRows.length && !loading && (
              <Text style={[styles.empty, styles.centeredText, isDark ? styles.textWhite : styles.textDark]}>No results yet</Text>
            )}
          </View>
        </ScrollView>
      </View>
      <WaveRefreshOverlay ref={waveRef} />
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
    marginLeft: 0,
    marginRight: 0,
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
  itemCardDark: {
    backgroundColor: 'rgba(3, 26, 40, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(125, 233, 255, 0.22)',
  },
  itemCardLight: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(8, 48, 75, 0.16)',
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
  refreshBtn: {
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
    backgroundColor: 'rgba(3, 32, 53, 0.58)',
    borderWidth: 1,
    borderColor: 'rgba(125, 233, 255, 0.42)',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  refreshBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.2,
  },

  centeredText: {
    textAlign: 'center',
    alignSelf: 'center',
  },
  surfaceDark: {
    backgroundColor: 'rgba(2, 30, 49, 0.38)',
    borderWidth: 1,
    borderColor: 'rgba(125, 233, 255, 0.28)',
  },
  surfaceLight: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1,
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
