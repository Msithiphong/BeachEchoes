import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDraftPost } from '../context/DraftPostContext';
import CampusMap from '../components/CampusMap';
import ClusteredPin from '../components/ClusteredPin';
import { pointInPolygon } from '../helpers/mapUtils';
import { theme } from '../core/theme';

export default function MapPlacement() {
  const router = useRouter();
  const { localImageUri, setMapX, setMapY, clearDraft } = useDraftPost();

  const [pin, setPin] = useState(null); // { x, y } normalized

  if (!localImageUri) {
    router.replace('/(tabs)/Camera');
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
    <View style={styles.container}>
      <Text style={styles.heading}>Place your post on campus</Text>
      <Text style={styles.sub}>Tap a location within the campus boundary.</Text>

      <ScrollView contentContainerStyle={styles.mapWrapper}>
        <CampusMap onTap={handleTap}>
          {pin && (
            <ClusteredPin
              centroid={pin}
              ids={[0]}
              onPress={() => {}}
            />
          )}
        </CampusMap>
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
          <Text style={styles.primaryText}>Publish</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
    marginHorizontal: 16,
  },
  sub: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginVertical: 6,
    marginHorizontal: 16,
  },
  mapWrapper: { paddingHorizontal: 16, paddingBottom: 8 },
  actions: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    alignItems: 'center',
  },
  secondaryText: { color: theme.colors.primary, fontWeight: '600' },
  ghostBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  ghostText: { color: '#666', fontWeight: '600' },
  primaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  disabledBtn: { opacity: 0.4 },
  primaryText: { color: '#fff', fontWeight: '600' },
});
