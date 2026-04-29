import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { auth } from '../config/firebase';
import { API_BASE } from '../config/api';
import { theme } from '../core/theme';

const REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'offensive', label: 'Offensive content' },
  { value: 'other', label: 'Other' },
];

export default function ReportPostModal({ visible, postId, onClose }) {
  const [reason, setReason] = useState(null);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  function handleClose() {
    setReason(null);
    setDetails('');
    onClose();
  }

  async function handleSubmit() {
    if (!reason) {
      Alert.alert('Select a reason', 'Please select a reason before submitting.');
      return;
    }
    if (reason === 'other' && !details.trim()) {
      Alert.alert('Details required', 'Please provide details for your report.');
      return;
    }
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API_BASE}/posts/${postId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason, details: details.trim() || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Reported', 'Thank you for your report.');
        handleClose();
      } else {
        Alert.alert('Error', data.error || 'Could not submit report.');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Report post</Text>

          {REASONS.map((r) => (
            <TouchableOpacity
              key={r.value}
              style={[styles.option, reason === r.value && styles.selectedOption]}
              onPress={() => setReason(r.value)}
            >
              <Text style={[styles.optionText, reason === r.value && styles.selectedText]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}

          {reason === 'other' && (
            <TextInput
              style={styles.detailsInput}
              placeholder="Describe the issue…"
              placeholderTextColor="#aaa"
              value={details}
              onChangeText={setDetails}
              multiline
              maxLength={500}
            />
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} disabled={loading}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 36,
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  option: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  selectedOption: { borderColor: theme.colors.primary, backgroundColor: `${theme.colors.primary}18` },
  optionText: { fontSize: 15, color: '#333' },
  selectedText: { color: theme.colors.primary, fontWeight: '600' },
  detailsInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#222',
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  cancelText: { color: '#555', fontWeight: '600' },
  submitBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontWeight: '600' },
});
