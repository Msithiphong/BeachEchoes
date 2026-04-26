import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE } from '../../config/api';
import { clusterPosts } from '../../helpers/clusterUtils';
import CampusMap from '../../components/CampusMap';
import ClusteredPin from '../../components/ClusteredPin';
import { POST_CATEGORIES } from '../../config/postCategories';

const CATEGORY_FILTERS = ['All', ...POST_CATEGORIES];

export default function MapScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const categoryParam = selectedCategory !== 'All'
        ? `?category=${encodeURIComponent(selectedCategory)}`
        : '';
      const res = await fetch(`${API_BASE}/posts/map${categoryParam}`);
      const data = await res.json();
      if (data.success) {
        setPosts(data.posts);
        setClusters(clusterPosts(data.posts));
      } else {
        setError('Could not load posts.');
      }
    } catch (err) {
      console.error('Map fetch error:', err);
      setError('Network error. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  function handlePinPress(ids) {
    router.push({ pathname: '/PostDetail', params: { ids: ids.join(',') } });
  }

  return (
    <LinearGradient
      colors={['#96c7e3', '#edd02c']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      <View style={styles.headerCard}>
        <Text style={styles.heading}>Campus Map</Text>
        <Text style={styles.subheading}>Explore echoes by spot and category.</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {CATEGORY_FILTERS.map((category) => {
            const active = category === selectedCategory;
            return (
              <TouchableOpacity
                key={category}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{category}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0f172a" style={styles.loader} />
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchPosts}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.mapWrapper} showsVerticalScrollIndicator={false}>
          <View style={styles.mapCard}>
            <CampusMap>
              {clusters.map((cluster, i) => (
                <ClusteredPin
                  key={i}
                  centroid={cluster.centroid}
                  ids={cluster.ids}
                  onPress={handlePinPress}
                />
              ))}
            </CampusMap>
          </View>
          {posts.length === 0 && (
            <Text style={styles.emptyNote}>
              No posts in {selectedCategory}. Try another category or be the first to post.
            </Text>
          )}
        </ScrollView>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  subheading: { marginTop: 4, fontSize: 13, color: '#334155' },
  filterRow: { marginTop: 12, paddingRight: 8, gap: 8 },
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
  filterText: { fontSize: 13, color: '#334155', fontWeight: '700' },
  filterTextActive: { color: '#fff' },
  loader: { marginTop: 60 },
  mapWrapper: { paddingHorizontal: 12, paddingBottom: 12 },
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
  errorBox: { alignItems: 'center', marginTop: 60, paddingHorizontal: 24 },
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
  retryText: { color: '#fff', fontWeight: '700' },
});
