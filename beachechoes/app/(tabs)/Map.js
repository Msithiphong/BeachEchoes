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
import { API_BASE } from '../../config/api';
import { clusterPosts } from '../../helpers/clusterUtils';
import CampusMap from '../../components/CampusMap';
import ClusteredPin from '../../components/ClusteredPin';
import { theme } from '../../core/theme';

export default function MapScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [clusters, setClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/posts/map`);
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
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  function handlePinPress(ids) {
    router.push({ pathname: '/PostDetail', params: { ids: ids.join(',') } });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Campus Map</Text>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchPosts}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.mapWrapper} showsVerticalScrollIndicator={false}>
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
          {posts.length === 0 && (
            <Text style={styles.emptyNote}>No posts yet. Be the first to post on campus!</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  loader: { marginTop: 60 },
  mapWrapper: { padding: 12 },
  emptyNote: {
    textAlign: 'center',
    color: '#888',
    fontSize: 14,
    marginTop: 16,
    paddingHorizontal: 24,
  },
  errorBox: { alignItems: 'center', marginTop: 60, paddingHorizontal: 24 },
  errorText: { color: '#c00', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
  },
  retryText: { color: '#fff', fontWeight: '600' },
});
