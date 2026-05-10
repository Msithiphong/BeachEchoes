import React, { useEffect, useState, useContext, useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as ImagePicker from 'expo-image-picker';
import { AuthContext } from '../context/AuthContext';
import { API_BASE } from '../config/api';
import { auth } from '../config/firebase';
import PostImageWithOverlay from '../components/PostImageWithOverlay';
import LikeButton from '../components/LikeButton';
import ReportPostModal from '../components/ReportPostModal';
import DeletePostModal from '../components/DeletePostModal';
import { theme } from '../core/theme';
import CoastalGradient from '../components/CoastalGradient';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function formatDateTime(ts) {
  if (!ts) return 'Unknown time';
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function dedupeItemsById(items = []) {
  const seenIds = new Set();
  return items.filter((item) => {
    if (!item || item.id === undefined || item.id === null) {
      return true;
    }

    const key = String(item.id);
    if (seenIds.has(key)) {
      return false;
    }

    seenIds.add(key);
    return true;
  });
}

function normalizeCommentThread(items = []) {
  const normalized = [];
  const commentIndexById = new Map();

  items.forEach((item) => {
    const replies = dedupeItemsById(item?.replies || []);
    const nextItem = {
      ...item,
      replies,
    };

    if (!item || item.id === undefined || item.id === null) {
      normalized.push(nextItem);
      return;
    }

    const key = String(item.id);
    const existingIndex = commentIndexById.get(key);

    if (existingIndex === undefined) {
      commentIndexById.set(key, normalized.length);
      normalized.push(nextItem);
      return;
    }

    const existingItem = normalized[existingIndex];
    normalized[existingIndex] = {
      ...existingItem,
      ...nextItem,
      replies: dedupeItemsById([...(existingItem.replies || []), ...replies]),
    };
  });

  return normalized;
}

export default function PostWithComments() {
  const router = useRouter();
  const { postId, includeMuted, includeHidden } = useLocalSearchParams();
  const { user } = useContext(AuthContext);

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null); // { id, username }
  const [commentImage, setCommentImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [reportTarget, setReportTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Track which parent comments have their replies expanded
  const [expandedReplies, setExpandedReplies] = useState({});

  const flatListRef = useRef(null);

  // Fetch post details
  const fetchPost = useCallback(async () => {
    if (!postId) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const params = new URLSearchParams({ ids: String(postId) });
      if (includeMuted === '1') params.set('includeMuted', '1');
      if (includeHidden === '1') params.set('includeHidden', '1');
      const res = await fetch(`${API_BASE}/posts/detail?${params.toString()}`, { headers });
      const data = await res.json();
      if (data.success && data.posts && data.posts.length > 0) {
        setPost(data.posts[0]);
      }
    } catch (err) {
      console.error('Fetch post error:', err);
    }
  }, [postId, includeMuted, includeHidden]);

  // Fetch comments
  const fetchComments = useCallback(async (cursor = null) => {
    if (!postId) return;
    try {
      if (!cursor) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const token = await auth.currentUser?.getIdToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const url = cursor
        ? `${API_BASE}/posts/${postId}/comments?cursor=${cursor}`
        : `${API_BASE}/posts/${postId}/comments`;
      
      const res = await fetch(url, { headers });
      const data = await res.json();
      
      if (data.success) {
        const nextComments = Array.isArray(data.comments) ? data.comments : [];
        if (cursor) {
          // Append paginated comments (they already have replies nested)
          setComments(prev => normalizeCommentThread([...prev, ...nextComments]));
        } else {
          // Initial load (comments already have replies nested)
          setComments(normalizeCommentThread(nextComments));
          // Replies are collapsed by default for cleaner initial view
        }
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      }
    } catch (err) {
      console.error('Fetch comments error:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [postId]);

  useEffect(() => {
    if (!postId) return;

    fetchPost();
    fetchComments();
  }, [postId, fetchPost, fetchComments]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && nextCursor) {
      fetchComments(nextCursor);
    }
  };

  const handleDeleted = (postId) => {
    Alert.alert('Post Deleted', 'This post has been deleted.', [
      {
        text: 'OK',
        onPress: () => router.back(),
      },
    ]);
  };

  const handleHideToggle = async () => {
    if (!post?.id || !user) return;

    const nextHidden = includeHidden !== '1';

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API_BASE}/posts/${post.id}/hide`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ hidden: nextHidden }),
      });
      const data = await res.json();

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to update hidden status');
      }

      const title = nextHidden ? 'Post Hidden' : 'Post Unhidden';
      const message = nextHidden
        ? 'This post is now in your Hidden posts.'
        : 'This post is visible again.'

      Alert.alert(title, message, [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (err) {
      console.error('Hide toggle error:', err);
      Alert.alert('Error', 'Failed to update hidden status');
    }
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCommentImage(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Image picker error:', err);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSubmitComment = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to comment.');
      return;
    }

    const trimmedText = commentText.trim();
    if (!trimmedText && !commentImage) {
      Alert.alert('Empty Comment', 'Please enter text or attach an image.');
      return;
    }

    setSubmitting(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const body = {
        content: trimmedText || null,
        parentCommentId: replyTo?.id || null,
      };

      // Convert image to base64 if present
      if (commentImage) {
        const response = await fetch(commentImage);
        const blob = await response.blob();
        const reader = new FileReader();
        const base64Promise = new Promise((resolve, reject) => {
          reader.onloadend = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        body.imageBase64 = await base64Promise;
      }

      const res = await fetch(`${API_BASE}/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        // Add new comment or reply
        if (replyTo) {
          // It's a reply - add to parent comment's replies array
          setComments(prev => normalizeCommentThread(prev.map(comment => {
            if (comment.id === replyTo.id) {
              return {
                ...comment,
                replies: [data.comment, ...(comment.replies || [])]
              };
            }
            return comment;
          })));
          // Auto-expand the parent comment to show the new reply
          setExpandedReplies(prev => ({ ...prev, [replyTo.id]: true }));
        } else {
          // It's a parent comment - add to top of comments list with empty replies array
          setComments(prev => normalizeCommentThread([{ ...data.comment, replies: [] }, ...prev]));
        }
        setCommentText('');
        setReplyTo(null);
        setCommentImage(null);
        // Scroll to top to show new comment
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
      } else {
        Alert.alert('Error', data.error || 'Failed to post comment');
      }
    } catch (err) {
      console.error('Submit comment error:', err);
      Alert.alert('Error', 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await auth.currentUser?.getIdToken();
              const res = await fetch(`${API_BASE}/comments/${commentId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
              });
              const data = await res.json();
              if (data.success) {
                // Remove comment or reply from local state
                setComments(prev => {
                  // First, try to remove it as a parent comment
                  const filtered = prev.filter(c => c.id !== commentId);
                  
                  // If it wasn't removed (meaning it's a reply), remove it from parent's replies
                  if (filtered.length === prev.length) {
                    return normalizeCommentThread(prev.map(comment => ({
                      ...comment,
                      replies: comment.replies?.filter(r => r.id !== commentId) || []
                    })));
                  }
                  
                  return normalizeCommentThread(filtered);
                });
              } else {
                Alert.alert('Error', data.error || 'Failed to delete comment');
              }
            } catch (err) {
              console.error('Delete comment error:', err);
              Alert.alert('Error', 'Failed to delete comment');
            }
          },
        },
      ]
    );
  };

  const toggleReplies = (commentId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  const renderCommentItem = ({ item }) => {
    const isOwner = user?.uid && item.firebase_uid === user.uid;
    const isReply = item.parent_comment_id !== null;
    const timeLabel = formatDateTime(item.created_at);
    const edited = item.edited_at ? ' (edited)' : '';
    const hasReplies = item.replies && item.replies.length > 0;
    const isExpanded = expandedReplies[item.id];

    return (
      <View style={[styles.commentCard, isReply && styles.replyCard]}>
        <View style={styles.commentHeader}>
          <TouchableOpacity
            onPress={() => item.firebase_uid && router.push(`/profile/${item.firebase_uid}`)}
            style={styles.commentAuthor}
          >
            {item.avatar_url ? (
              <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <MaterialIcons name="person" size={16} color="#64748b" />
              </View>
            )}
            <Text style={styles.username}>{item.username || 'User'}</Text>
          </TouchableOpacity>
          <Text style={styles.timeText}>{timeLabel}{edited}</Text>
        </View>

        {item.content && <Text style={styles.commentContent}>{item.content}</Text>}
        
        {item.image_url && (
          <Image source={{ uri: item.image_url }} style={styles.commentImage} />
        )}

        <View style={styles.commentActions}>
          {!isReply && (
            <TouchableOpacity
              onPress={() => setReplyTo({ id: item.id, username: item.username })}
              style={styles.actionBtn}
            >
              <MaterialIcons name="reply" size={16} color="#64748b" />
              <Text style={styles.actionText}>Reply</Text>
            </TouchableOpacity>
          )}
          {isOwner && (
            <TouchableOpacity
              onPress={() => handleDeleteComment(item.id)}
              style={styles.actionBtn}
            >
              <MaterialIcons name="delete-outline" size={16} color="#e53935" />
              <Text style={[styles.actionText, { color: '#e53935' }]}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Toggle button for replies */}
        {hasReplies && (
          <TouchableOpacity
            onPress={() => toggleReplies(item.id)}
            style={styles.toggleRepliesBtn}
          >
            <Text style={styles.toggleRepliesText}>
              {isExpanded 
                ? 'Hide replies' 
                : `View ${item.replies.length} ${item.replies.length === 1 ? 'reply' : 'replies'}`
              }
            </Text>
            <MaterialIcons 
              name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} 
              size={18} 
              color="#3b82f6" 
            />
          </TouchableOpacity>
        )}

        {/* Render replies below parent comment */}
        {hasReplies && isExpanded && item.replies.map((reply) => {
          const replyIsOwner = user?.uid && reply.firebase_uid === user.uid;
          const replyTimeLabel = formatDateTime(reply.created_at);
          const replyEdited = reply.edited_at ? ' (edited)' : '';

          return (
            <View key={String(reply.id)} style={styles.replyCard}>
              <View style={styles.commentHeader}>
                <TouchableOpacity
                  onPress={() => reply.firebase_uid && router.push(`/profile/${reply.firebase_uid}`)}
                  style={styles.commentAuthor}
                >
                  {reply.avatar_url ? (
                    <Image source={{ uri: reply.avatar_url }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <MaterialIcons name="person" size={16} color="#64748b" />
                    </View>
                  )}
                  <Text style={styles.username}>{reply.username || 'User'}</Text>
                </TouchableOpacity>
                <Text style={styles.timeText}>{replyTimeLabel}{replyEdited}</Text>
              </View>

              {reply.content && <Text style={styles.commentContent}>{reply.content}</Text>}
              
              {reply.image_url && (
                <Image source={{ uri: reply.image_url }} style={styles.commentImage} />
              )}

              <View style={styles.commentActions}>
                {replyIsOwner && (
                  <TouchableOpacity
                    onPress={() => handleDeleteComment(reply.id)}
                    style={styles.actionBtn}
                  >
                    <MaterialIcons name="delete-outline" size={16} color="#e53935" />
                    <Text style={[styles.actionText, { color: '#e53935' }]}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderHeader = () => {
    if (!post) return null;

    const createdLabel = formatDateTime(post.created_at);
    const isHiddenView = includeHidden === '1' || post.hidden === true;
    const usernameLabel = post.username || 'Anonymous';
    const canOpenProfile = Boolean(post.owner_firebase_uid);

    return (
      <View style={styles.postCard}>
        <View style={styles.authorRow}>
          <Text style={styles.authorPrefix}>Posted by </Text>
          <TouchableOpacity
            onPress={() => canOpenProfile && router.push(`/profile/${post.owner_firebase_uid}`)}
            disabled={!canOpenProfile}
          >
            <Text style={[styles.authorLabel, canOpenProfile && styles.authorLink]}>
              {usernameLabel}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.cardTopMeta}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{post.category || 'Tips'}</Text>
          </View>
          <Text style={styles.timeText}>Posted {createdLabel}</Text>
        </View>
        <PostImageWithOverlay
          imageUri={post.image_url}
          overlayText={post.overlay_text}
          style={styles.image}
        />
        <View style={styles.cardFooter}>
          <LikeButton
            postId={post.id}
            initialCount={post.like_count ?? 0}
            initialLiked={false}
          />
          <View style={styles.footerActions}>
            {user && (
              <TouchableOpacity
                onPress={handleHideToggle}
                style={styles.actionLabelBtn}
                accessibilityLabel={isHiddenView ? 'Unhide post' : 'Hide post'}
              >
                <MaterialIcons
                  name={isHiddenView ? 'visibility' : 'visibility-off'}
                  size={20}
                  color="#64748b"
                />
                <Text style={styles.actionLabelText}>
                  {isHiddenView ? 'Unhide' : 'Hide'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setReportTarget(post.id)} style={styles.iconBtn}>
              <MaterialIcons name="flag" size={20} color="#888" />
            </TouchableOpacity>
            {user?.uid && post.owner_firebase_uid === user.uid && (
              <TouchableOpacity onPress={() => setDeleteTarget(post.id)} style={styles.iconBtn}>
                <MaterialIcons name="delete-outline" size={20} color="#e53935" />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.commentsHeaderDivider}>
          <Text style={styles.commentsHeaderText}>
            {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
          </Text>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  };

  return (
    <CoastalGradient style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post & Comments</Text>
        </View>

        {loading && !post ? (
          <ActivityIndicator style={styles.loader} size="large" color={theme.colors.primary} />
        ) : !post ? (
          <Text style={styles.empty}>Post not found.</Text>
        ) : (
          <>
            <FlatList
              ref={flatListRef}
              data={comments}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderCommentItem}
              ListHeaderComponent={renderHeader}
              ListFooterComponent={renderFooter}
              ListEmptyComponent={
                !loading && <Text style={styles.noComments}>No comments yet. Be the first!</Text>
              }
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              onEndReached={handleLoadMore}
              onEndReachedThreshold={0.5}
            />

            {/* Comment Input */}
            <View style={styles.inputContainer}>
              {replyTo && (
                <View style={styles.replyBanner}>
                  <Text style={styles.replyText}>Replying to {replyTo.username}</Text>
                  <TouchableOpacity onPress={() => setReplyTo(null)}>
                    <MaterialIcons name="close" size={18} color="#64748b" />
                  </TouchableOpacity>
                </View>
              )}
              {commentImage && (
                <View style={styles.imagePreview}>
                  <Image source={{ uri: commentImage }} style={styles.previewImage} />
                  <TouchableOpacity
                    onPress={() => setCommentImage(null)}
                    style={styles.removeImageBtn}
                  >
                    <MaterialIcons name="close" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.inputRow}>
                <TouchableOpacity onPress={handlePickImage} style={styles.imageBtn}>
                  <MaterialIcons name="image" size={22} color="#64748b" />
                </TouchableOpacity>
                <TextInput
                  style={styles.input}
                  placeholder={replyTo ? `Reply to ${replyTo.username}...` : 'Add a comment...'}
                  placeholderTextColor="#94a3b8"
                  value={commentText}
                  onChangeText={setCommentText}
                  multiline
                  maxLength={500}
                />
                <TouchableOpacity
                  onPress={handleSubmitComment}
                  disabled={submitting || (!commentText.trim() && !commentImage)}
                  style={[
                    styles.sendBtn,
                    (submitting || (!commentText.trim() && !commentImage)) && styles.sendBtnDisabled,
                  ]}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <MaterialIcons name="send" size={20} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </KeyboardAvoidingView>

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
    </CoastalGradient>
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
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
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
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120 },
  postCard: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorPrefix: { fontSize: 13, color: '#0f172a', fontWeight: '700' },
  authorLabel: { fontSize: 13, color: '#0f172a', fontWeight: '700' },
  authorLink: { textDecorationLine: 'underline' },
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
  categoryBadgeText: { color: '#1d4f91', fontSize: 12, fontWeight: '700' },
  timeText: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  cardFooter: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  iconBtn: {
    padding: 4,
  },
  actionLabelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  actionLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  commentsHeaderDivider: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  commentsHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  noComments: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 14,
    marginTop: 20,
    fontStyle: 'italic',
  },
  commentCard: {
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  replyCard: {
    marginLeft: 20,
    marginTop: 8,
    marginBottom: 0,
    backgroundColor: 'rgba(241,245,249,0.88)',
    borderRadius: 12,
    padding: 12,
    elevation: 1,
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  commentAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 6,
  },
  avatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  username: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  commentContent: {
    fontSize: 14,
    color: '#1e293b',
    lineHeight: 20,
    marginBottom: 6,
  },
  commentImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginVertical: 6,
  },
  commentActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  toggleRepliesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 4,
    gap: 4,
  },
  toggleRepliesText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '600',
  },
  loadingMore: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  replyBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  replyText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  imagePreview: {
    position: 'relative',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 12,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  imageBtn: {
    padding: 6,
  },
  input: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
});
