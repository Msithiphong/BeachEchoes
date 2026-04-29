import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useDraftPost } from '../context/DraftPostContext';
import CampusMap from '../components/CampusMap';
import ClusteredPin from '../components/ClusteredPin';
import { pointInPolygon } from '../helpers/mapUtils';

export default function MapPlacement() {
  const router = useRouter();
  const { localImageUri, setMapX, setMapY, clearDraft } = useDraftPost();

  const [pin, setPin] = useState(null); // { x, y } normalized

  useEffect(() => {
    if (!localImageUri) {
      router.replace('/(tabs)/Camera');
    }
  }, [localImageUri, router]);

  if (!localImageUri) {
    return null;
  }

  function handleTap({ x, y }) {
    if (!pointInPolygon({ x, y })) {
      Alert.alert('Outside campus', 'Please tap a location on the CSULB campus.');
      return;
    }
    setPin({ x, y });
  }

  function handleBack() {
    router.back();
  }

  function handleCancel() {
    clearDraft();
    router.replace('/(tabs)/Camera');
  }

  function handlePublish() {
    if (!pin) {
      Alert.alert('No location', 'Tap a spot on the campus map before publishing.');
      return;
    }
    setMapX(pin.x);
    setMapY(pin.y);
    // MapPlacement triggers publish; navigate to postUpload handler via PostPublish
    router.push('/PostPublish');
  }

  return (
    <LinearGradient
      colors={['#96c7e3', '#edd02c']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.container}
    >
      <View style={styles.headerCard}>
        <Text style={styles.heading}>Pin Your Echo</Text>
        <Text style={styles.sub}>Tap one spot on campus to publish your post.</Text>
        <View style={[styles.statusChip, pin ? styles.statusChipReady : styles.statusChipWaiting]}>
          <Text style={[styles.statusText, pin ? styles.statusTextReady : styles.statusTextWaiting]}>
            {pin ? 'Location selected' : 'Select a location'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.mapWrapper} showsVerticalScrollIndicator={false}>
        <View style={styles.mapCard}>
          <CampusMap onTap={handleTap}>
            {pin && (
              <ClusteredPin
                centroid={pin}
                ids={[0]}
                onPress={() => {}}
              />
            )}
          </CampusMap>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={handleBack}>
          <Text style={styles.secondaryText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ghostBtn} onPress={handleCancel}>
          <Text style={styles.ghostText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryBtn, !pin && styles.disabledBtn]}
          onPress={handlePublish}
          disabled={!pin}
        >
          <LinearGradient
            colors={['#0f172a', '#1f2937']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryBtnGradient}
          >
            <Text style={styles.primaryText}>Publish</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerCard: {
    marginTop: 16,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.82)',
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
  sub: {
    fontSize: 14,
    color: '#334155',
    marginTop: 5,
  },
  statusChip: {
    alignSelf: 'flex-start',
    marginTop: 12,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusChipReady: { backgroundColor: '#dcfce7' },
  statusChipWaiting: { backgroundColor: '#e2e8f0' },
  statusText: { fontSize: 12, fontWeight: '700' },
  statusTextReady: { color: '#166534' },
  statusTextWaiting: { color: '#334155' },
  mapWrapper: { paddingHorizontal: 16, paddingVertical: 12 },
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
  actions: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#0f172a',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.78)',
  },
  secondaryText: { color: '#0f172a', fontWeight: '700' },
  ghostBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#94a3b8',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  ghostText: { color: '#475569', fontWeight: '700' },
  primaryBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  primaryBtnGradient: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  disabledBtn: { opacity: 0.4 },
  primaryText: { color: '#fff', fontWeight: '700' },
});
