import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'

import { API_BASE } from '../../config/api'
import { auth } from '../../config/firebase'
import { clusterPosts } from '../../helpers/clusterUtils'
import CampusMap from '../../components/CampusMap'
import ClusteredPin from '../../components/ClusteredPin'
import { POST_CATEGORIES } from '../../config/postCategories'

const CATEGORY_FILTERS = ['All', ...POST_CATEGORIES, 'Muted']

export default function MapScreen() {
  const router = useRouter()

  const [posts, setPosts] = useState([])
  const [clusters, setClusters] = useState([])
  const [mutedPostCount, setMutedPostCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('All')

  const fetchPosts = useCallback(async () => {
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
    fetchPosts()
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
    <LinearGradient colors={['#9ed4df', '#ffe000']} style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.heading}>Campus Map</Text>
        <Text style={styles.subheading}>
          Explore echoes by spot and category.
        </Text>

        <TouchableOpacity style={styles.refreshBtn} onPress={fetchPosts}>
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

          <TouchableOpacity style={styles.retryBtn} onPress={fetchPosts}>
            <Text style={styles.retryText}>Retry</Text>
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
    </LinearGradient>
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
    backgroundColor: 'rgba(255,255,255,0.84)',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 2,
  },
  heading: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  subheading: {
    marginTop: 4,
    fontSize: 13,
    color: '#334155',
  },
  refreshBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#0f172a',
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
    borderColor: '#cbd5e1',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#f8fafc',
  },
  filterChipActive: {
    backgroundColor: '#1e293b',
    borderColor: '#1e293b',
  },
  filterText: {
    fontSize: 13,
    color: '#334155',
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
    backgroundColor: 'rgba(255,255,255,0.82)',
    padding: 8,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyNote: {
    textAlign: 'center',
    color: '#1f2937',
    fontSize: 14,
    marginTop: 16,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 12,
    paddingVertical: 12,
  },
  errorBox: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 24,
  },
  errorText: {
    color: '#7f1d1d',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.75)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#0f172a',
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
  },
})