import React, { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useDraftPost } from '../context/DraftPostContext';
import { publishPost } from '../helpers/postUpload';
import { theme } from '../core/theme';

/**
 * Intermediate screen that runs the publish network request.
 * Navigates to the Map tab on success, or shows an alert on failure.
 * A ref guard prevents double-submission on strict-mode double-mount.
 */
export default function PostPublish() {
  const router = useRouter();
  const { localImageUri, overlayText, mapX, mapY, clearDraft } = useDraftPost();
  const didSubmit = useRef(false);

  useEffect(() => {
    if (didSubmit.current) return;
    didSubmit.current = true;

    if (!localImageUri || mapX == null || mapY == null) {
      router.replace('/(tabs)/Camera');
      return;
    }

    publishPost({ localImageUri, overlayText, mapX, mapY })
      .then(() => {
        clearDraft();
        router.replace('/(tabs)/Map');
      })
      .catch((err) => {
        console.error('Publish error:', err);
        Alert.alert(
          'Publish failed',
          err.message || 'Something went wrong. Please try again.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={styles.label}>Publishing…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  label: { marginTop: 16, fontSize: 16, color: '#555' },
});
