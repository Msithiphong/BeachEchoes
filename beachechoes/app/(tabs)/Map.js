import React, { useEffect, useState, useCallback, useRef, useContext } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import { useRouter } from 'expo-router'

import { API_BASE } from '../../config/api'
import { auth } from '../../config/firebase'
import { clusterPosts } from '../../helpers/clusterUtils'
import CampusMap from '../../components/CampusMap'
import ClusteredPin from '../../components/ClusteredPin'
import { POST_CATEGORIES } from '../../config/postCategories'
import CoastalGradient from '../../components/CoastalGradient'
import WaveRefreshOverlay from '../../components/WaveRefreshOverlay'
import { useAppTheme } from '../../context/AppThemeContext'
import { AuthContext } from '../../context/AuthContext'

const CATEGORY_FILTERS = ['All', ...POST_CATEGORIES, 'Muted']

export default function MapScreen() {
  const { isDark } = useAppTheme()
  const { user, loading: authLoading } = useContext(AuthContext)
  const router = useRouter()

  const [posts, setPosts] = useState([])
  const [clusters, setClusters] = useState([])
  const [mutedPostCount, setMutedPostCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const waveRef = useRef(null)

  // Redirect unauthenticated users to StartScreen
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/StartScreen')
    }
  }, [user, authLoading, router])

  const fetchPosts = useCallback(async (withWave = false) => {
    if (withWave) {
      waveRef.current?.trigger()
    }
    setLoading(true)
    setError(null)

    try {
      const token = await auth.currentUser?.getIdToken()
      const headers = token ? { Authorization: `Bearer ${token}` } : {}

      const mutedFetchPromise = token
        ? fetch(`${API_BASE}/posts/muted`, { headers })
        : Promise.resolve({
            ok: true,
            json: async () => ({ success: true, posts: [] }),
          })

      const activePostsFetchPromise =
        selectedCategory === 'Muted'
          ? token
            ? fetch(`${API_BASE}/posts/muted`, { headers })
            : Promise.resolve({
                ok: true,
                json: async () => ({ success: true, posts: [] }),
              })
          : (() => {
              const params = new URLSearchParams()

              if (selectedCategory !== 'All') {
                params.set('category', selectedCategory)
              }

              const query = params.toString()
              const categoryParam = query ? `?${query}` : ''

              return fetch(`${API_BASE}/posts/map${categoryParam}`, { headers })
            })()

      const [res, mutedRes] = await Promise.all([
        activePostsFetchPromise,
        mutedFetchPromise,
      ])

      const [data, mutedData] = await Promise.all([
        res.json(),
        mutedRes.json(),
      ])

      if (data?.success) {
        const nextPosts = data?.posts ?? []

        setPosts(nextPosts)
        setClusters(clusterPosts(nextPosts))
        setMutedPostCount(
          mutedData?.success ? (mutedData.posts ?? []).length : 0
        )
      } else {
        setError(data?.error || 'Could not load posts.')
      }
    } catch (err) {
      console.error('Map fetch error:', err)
      setError('Network error. Make sure the server is running.')
    } finally {
      setLoading(false)
    }
  }, [selectedCategory])

  useEffect(() => {
    fetchPosts(false)
  }, [fetchPosts])

  function handlePinPress(ids) {
    router.push({
      pathname: '/PostDetail',
      params: {
        ids: ids.join(','),
        includeMuted: selectedCategory === 'Muted' ? '1' : '0',
      },
    })
  }

  return (
    <CoastalGradient style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={[styles.heading, !isDark && styles.textDark]}>Campus Map</Text>
        <Text style={[styles.subheading, !isDark && styles.textSoftDark]}>
          Explore echoes by spot and category.
        </Text>

        <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchPosts(true)}>
          <Text style={styles.refreshBtnText}>Refresh</Text>
        </TouchableOpacity>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {CATEGORY_FILTERS.map(category => {
            const active = category === selectedCategory
            const label =
              category === 'Muted' ? `Muted (${mutedPostCount})` : category

            return (
              <TouchableOpacity
                key={category}
                style={[
                  styles.filterChip,
                  active && styles.filterChipActive,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.filterText,
                    active && styles.filterTextActive,
                    !isDark && !active && styles.textDark,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>

          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchPosts(true)}>
            <Text style={[styles.retryText, !isDark && styles.textDark]}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.mapWrapper}>
          <View style={styles.mapCard}>
            <CampusMap>
              {clusters.map((cluster, i) => (
                <ClusteredPin
                  key={`${cluster.ids.join('-')}-${i}`}
                  centroid={cluster.centroid}
                  ids={cluster.ids}
                  onPress={handlePinPress}
                />
              ))}
            </CampusMap>

            {posts.length === 0 && (
              <Text style={styles.emptyNote}>
                No posts in {selectedCategory}. Try another category or be the
                first to post.
              </Text>
            )}
          </View>
        </View>
      )}
      <WaveRefreshOverlay ref={waveRef} />
    </CoastalGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerCard: {
    marginTop: 52,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: '#f7fbff',
  },
  subheading: {
    marginTop: 4,
    fontSize: 13,
    color: 'rgba(247, 251, 255, 0.9)',
  },
  refreshBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: 'rgba(3, 32, 53, 0.58)',
    borderWidth: 1,
    borderColor: 'rgba(125, 233, 255, 0.42)',
  },
  refreshBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  filterRow: {
    marginTop: 12,
    paddingRight: 8,
    gap: 8,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.42)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  filterChipActive: {
    backgroundColor: '#0f304f',
    borderColor: '#80eeff',
  },
  filterText: {
    fontSize: 13,
    color: '#f7fbff',
    fontWeight: '700',
  },
  filterTextActive: {
    color: '#fff',
  },
  loader: {
    marginTop: 60,
  },
  mapWrapper: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  mapCard: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    padding: 8,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyNote: {
    textAlign: 'center',
    color: '#f7fbff',
    fontSize: 14,
    marginTop: 16,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(2, 28, 48, 0.35)',
    borderRadius: 12,
    paddingVertical: 12,
  },
  errorBox: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 24,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(130, 22, 22, 0.45)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(3, 32, 53, 0.7)',
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
  },
  textDark: {
    color: '#08304b',
  },
  textSoftDark: {
    color: 'rgba(8, 48, 75, 0.82)',
  },
})
