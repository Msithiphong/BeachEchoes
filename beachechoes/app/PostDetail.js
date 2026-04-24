import React, { useEffect, useState, useContext, useCallback } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { AuthContext } from '../context/AuthContext';
import { API_BASE } from '../config/api';
import PostImageWithOverlay from '../components/PostImageWithOverlay';
import LikeButton from '../components/LikeButton';
import ReportPostModal from '../components/ReportPostModal';
import DeletePostModal from '../components/DeletePostModal';
import { theme } from '../core/theme';

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

    return (
      <View style={styles.card}>
        <PostImageWithOverlay
          imageUri={item.image_url}
          overlayText={item.overlay_text}
          style={styles.image}
        />
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Posts here</Text>
        <View style={styles.headerSpacer} />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' },
  headerSpacer: { width: 32 },
  loader: { marginTop: 60 },
  empty: { textAlign: 'center', color: '#888', marginTop: 60, fontSize: 15 },
  list: { padding: 16, gap: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  image: { borderRadius: 0 },
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
