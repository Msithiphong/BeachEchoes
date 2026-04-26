import React, { useEffect, useState, useContext, useCallback } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { AuthContext } from '../context/AuthContext';
import { API_BASE } from '../config/api';
import PostImageWithOverlay from '../components/PostImageWithOverlay';
import LikeButton from '../components/LikeButton';
import ReportPostModal from '../components/ReportPostModal';
import DeletePostModal from '../components/DeletePostModal';
import { theme } from '../core/theme';

function formatDateTime(ts) {
  if (!ts) return 'Unknown time';
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString();
}

export default function PostDetail() {
  const router = useRouter();
  const { ids } = useLocalSearchParams(); // comma-separated post IDs
  const { user } = useContext(AuthContext);

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportTarget, setReportTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchPosts = useCallback(async () => {
    if (!ids) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/posts/detail?ids=${ids}`);
      const data = await res.json();
      if (data.success) setPosts(data.posts);
    } catch (err) {
      console.error('PostDetail fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [ids]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  function handleDeleted(postId) {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }

  function renderItem({ item }) {
    const isOwner = user?.uid && item.owner_firebase_uid === user.uid;
    const createdLabel = formatDateTime(item.created_at);
    const expiresLabel = formatDateTime(item.expires_at);
    const usernameLabel = item.username || 'Anonymous';

    return (
      <View style={styles.card}>
        <View style={styles.authorRow}>
          <Text style={styles.authorLabel}>Posted by {usernameLabel}</Text>
        </View>
        <View style={styles.cardTopMeta}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{item.category || 'Tips'}</Text>
          </View>
          <Text style={styles.timeText}>Posted {createdLabel}</Text>
        </View>
        <PostImageWithOverlay
          imageUri={item.image_url}
          overlayText={item.overlay_text}
          style={styles.image}
        />
        <Text style={styles.expiresText}>Expires {expiresLabel}</Text>
        <View style={styles.cardFooter}>
          <LikeButton
            postId={item.id}
            initialCount={item.like_count ?? 0}
            initialLiked={false}
          />
          <View style={styles.footerActions}>
            <TouchableOpacity onPress={() => setReportTarget(item.id)} style={styles.iconBtn}>
              <MaterialIcons name="flag" size={20} color="#888" />
            </TouchableOpacity>
            {isOwner && (
              <TouchableOpacity onPress={() => setDeleteTarget(item.id)} style={styles.iconBtn}>
                <MaterialIcons name="delete-outline" size={20} color="#e53935" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#96c7e3', '#edd02c']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Posts At This Spot</Text>
          <Text style={styles.headerSubtitle}>Tap into the campus moment.</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color={theme.colors.primary} />
      ) : posts.length === 0 ? (
        <Text style={styles.empty}>No posts found.</Text>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <ReportPostModal
        visible={reportTarget !== null}
        postId={reportTarget}
        onClose={() => setReportTarget(null)}
      />
      <DeletePostModal
        visible={deleteTarget !== null}
        postId={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={() => {
          handleDeleted(deleteTarget);
          setDeleteTarget(null);
        }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    marginTop: 52,
    marginHorizontal: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  headerSubtitle: { fontSize: 13, color: '#334155', marginTop: 1 },
  loader: { marginTop: 60 },
  empty: {
    textAlign: 'center',
    color: '#1e293b',
    marginTop: 60,
    fontSize: 15,
    backgroundColor: 'rgba(255,255,255,0.65)',
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  list: { padding: 16, gap: 16, paddingBottom: 28 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.14,
    shadowRadius: 7,
  },
  image: { borderRadius: 0 },
  authorRow: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  authorLabel: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '700',
  },
  cardTopMeta: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e6f0ff',
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 4,
  },
  categoryBadgeText: {
    color: '#1d4f91',
    fontSize: 12,
    fontWeight: '700',
  },
  timeText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  expiresText: {
    paddingHorizontal: 14,
    paddingTop: 8,
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  footerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { padding: 4 },
});
