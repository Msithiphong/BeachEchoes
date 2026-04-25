import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDraftPost } from '../context/DraftPostContext';
import PostImageWithOverlay from '../components/PostImageWithOverlay';
import { theme } from '../core/theme';
import { DEFAULT_POST_CATEGORY, POST_CATEGORIES } from '../config/postCategories';

const MAX_OVERLAY_LENGTH = 2000;

export default function EditPost() {
  const router = useRouter();
  const { localImageUri, overlayText, setOverlayText, category, setCategory, capturedAt, clearDraft } = useDraftPost();

  const [text, setText] = useState(overlayText);
  const [selectedCategory, setSelectedCategory] = useState(category || DEFAULT_POST_CATEGORY);
  const [categoryOpen, setCategoryOpen] = useState(false);

  if (!localImageUri) {
    // Guard: if someone lands here without a draft, send them back.
    router.replace('/(tabs)/Camera');
    return null;
  }

  function handleRetake() {
    clearDraft();
    router.replace('/(tabs)/Camera');
  }

  function handleContinue() {
    setOverlayText(text.trim());
    setCategory(selectedCategory);
    router.push('/MapPlacement');
  }

  function handleTextChange(value) {
    if (value.length <= MAX_OVERLAY_LENGTH) {
      setText(value);
    }
  }

  const capturedLabel = capturedAt
    ? new Date(capturedAt).toLocaleString()
    : 'Capture time unavailable';

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <PostImageWithOverlay
          imageUri={localImageUri}
          overlayText={text}
          style={styles.preview}
        />
        <Text style={styles.capturedAt}>Taken: {capturedLabel}</Text>

        <View style={styles.categoryRow}>
          <Text style={styles.categoryLabel}>Category</Text>
          <TouchableOpacity
            style={styles.categoryTrigger}
            onPress={() => setCategoryOpen((prev) => !prev)}
          >
            <Text style={styles.categoryValue}>{selectedCategory}</Text>
            <Text style={styles.categoryChevron}>{categoryOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {categoryOpen && (
            <View style={styles.categoryMenu}>
              {POST_CATEGORIES.map((item) => {
                const active = item === selectedCategory;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.categoryOption, active && styles.categoryOptionActive]}
                    onPress={() => {
                      setSelectedCategory(item);
                      setCategoryOpen(false);
                    }}
                  >
                    <Text style={[styles.categoryOptionText, active && styles.categoryOptionTextActive]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Add a caption (optional)"
            placeholderTextColor="#888"
            value={text}
            onChangeText={handleTextChange}
            multiline
            maxLength={MAX_OVERLAY_LENGTH}
          />
          <Text style={styles.charCount}>{text.length}/{MAX_OVERLAY_LENGTH}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={handleRetake}>
            <Text style={styles.secondaryText}>Retake</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleContinue}>
            <Text style={styles.primaryText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  container: { padding: 16, paddingBottom: 40 },
  preview: { borderRadius: 8, marginBottom: 16 },
  capturedAt: { fontSize: 12, color: '#666', marginBottom: 14 },
  categoryRow: { marginBottom: 16 },
  categoryLabel: { fontSize: 13, color: '#555', marginBottom: 6, fontWeight: '600' },
  categoryTrigger: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
  },
  categoryValue: { fontSize: 15, color: '#222' },
  categoryChevron: { color: '#888', fontSize: 12 },
  categoryMenu: {
    borderWidth: 1,
    borderColor: '#e2e2e2',
    borderRadius: 8,
    marginTop: 8,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  categoryOption: { paddingHorizontal: 12, paddingVertical: 12 },
  categoryOptionActive: { backgroundColor: '#f0f7ff' },
  categoryOptionText: { fontSize: 15, color: '#222' },
  categoryOptionTextActive: { color: theme.colors.primary, fontWeight: '700' },
  inputRow: { marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#222',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: { fontSize: 12, color: '#aaa', textAlign: 'right', marginTop: 4 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignItems: 'center',
  },
  secondaryText: { color: theme.colors.primary, fontWeight: '600', fontSize: 15 },
  primaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
