import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { auth } from '../config/firebase';
import { API_BASE } from '../config/api';
import { theme } from '../core/theme';

/**
 * Like / unlike button for a post.
 *
 * @param {number}   postId
 * @param {number}   initialCount  - like count from the server
 * @param {boolean}  initialLiked  - whether the current user already liked it
 * @param {function} onUpdate      - called with { liked, count } after a successful toggle
 */
export default function LikeButton({ postId, initialCount = 0, initialLiked = false, onUpdate }) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  async function handlePress() {
    if (loading) return;
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) return;

      const res = await fetch(`${API_BASE}/posts/${postId}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        const nextLiked = data.liked;
        const nextCount = nextLiked ? count + 1 : count - 1;
        setLiked(nextLiked);
        setCount(nextCount);
        onUpdate?.({ liked: nextLiked, count: nextCount });
      }
    } catch (err) {
      console.error('LikeButton error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <TouchableOpacity style={styles.row} onPress={handlePress} disabled={loading} activeOpacity={0.7}>
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : (
        <MaterialIcons
          name={liked ? 'favorite' : 'favorite-border'}
          size={22}
          color={liked ? theme.colors.primary : '#888'}
        />
      )}
      <Text style={[styles.count, liked && styles.likedCount]}>{count}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  count: { fontSize: 14, color: '#888' },
  likedCount: { color: theme.colors.primary },
});
