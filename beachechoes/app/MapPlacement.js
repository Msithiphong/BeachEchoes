// Map placement step that lets the user pick a campus location or reuse current GPS.
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useDraftPost } from '../context/DraftPostContext';
import CampusMap from '../components/CampusMap';
import ClusteredPin from '../components/ClusteredPin';
import YouAreHerePin from '../components/YouAreHerePin';
import { pointInPolygon, latLngToNormalized, snapToPolygonBoundary } from '../helpers/mapUtils';
import CoastalGradient from '../components/CoastalGradient';

export default function MapPlacement() {
  const router = useRouter();

  const {
    localImageUri,
    setMapX,
    setMapY,
    clearDraft,
    userLat,
    setUserLat,
    userLng,
    setUserLng,
    userMapX,
    setUserMapX,
    userMapY,
    setUserMapY,
    locationPermissionGranted,
    setLocationPermissionGranted,
  } = useDraftPost();

  const [pin, setPin] = useState(null);
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!localImageUri) {
      router.replace('/(tabs)/Camera');
    }
  }, [localImageUri, router]);

  function clearUserLocation() {
    setUserLat(null);
    setUserLng(null);
    setUserMapX(null);
    setUserMapY(null);
  }

  function applyLocationToDraft(location) {
    const { latitude, longitude } = location.coords;

    setUserLat(latitude);
    setUserLng(longitude);

    const normalized = latLngToNormalized(latitude, longitude);

    let mapCoords = normalized;

    if (!pointInPolygon(normalized)) {
      // Keep the pin on campus even when GPS drifts slightly outside the polygon.
      mapCoords = snapToPolygonBoundary(normalized);
    }

    setUserMapX(mapCoords.x);
    setUserMapY(mapCoords.y);

    if (process.env.EXPO_PUBLIC_DEBUG_GPS === 'true') {
      console.log('MapPlacement: real GPS location applied');
      console.log(`GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      console.log(`Map: (${mapCoords.x.toFixed(4)}, ${mapCoords.y.toFixed(4)})`);
    }
  }

  async function getRealLocation({ showAlerts = false } = {}) {
    const servicesEnabled = await Location.hasServicesEnabledAsync();

    if (!servicesEnabled) {
      if (showAlerts) {
        Alert.alert(
          'Location Services Off',
          'Turn on Android location services, then try again.'
        );
      }

      return null;
    }

    const permission = await Location.requestForegroundPermissionsAsync();

    if (permission.status !== 'granted') {
      setLocationPermissionGranted(false);

      if (showAlerts) {
        Alert.alert(
          'Location Permission Needed',
          'Allow location permission to use your current location.'
        );
      }

      return null;
    }

    setLocationPermissionGranted(true);

    let location = null;

    try {
      location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        mayShowUserSettingsDialog: Platform.OS === 'android',
      });
    } catch (currentPositionError) {
      console.log('getCurrentPosition failed:', currentPositionError.message);

      try {
        location = await Location.getLastKnownPositionAsync({
          maxAge: 30000,
          requiredAccuracy: 100,
        });
      } catch (lastKnownError) {
        console.log('getLastKnownPosition failed:', lastKnownError.message);
      }
    }

    if (!location) {
      if (showAlerts) {
        Alert.alert(
          'No GPS Location',
          'Android did not return a real GPS location. In the emulator, set a location and press SET LOCATION, then try again.'
        );
      }

      return null;
    }

    return location;
  }

  useEffect(() => {
    async function refreshLocationOnLoad() {
      try {
        setIsRefreshingLocation(true);

        const location = await getRealLocation({ showAlerts: false });

        if (!location) {
          clearUserLocation();
          return;
        }

        applyLocationToDraft(location);
      } catch (error) {
        console.log('Location refresh failed:', error.message);
        clearUserLocation();
      } finally {
        setIsRefreshingLocation(false);
      }
    }

    refreshLocationOnLoad();
  }, []);

  if (!localImageUri) {
    return null;
  }

  const hasYouAreHere =
    userLat != null &&
    userLng != null &&
    userMapX != null &&
    userMapY != null;

  const youAreHereCoords = hasYouAreHere ? { x: userMapX, y: userMapY } : null;

  const showYouAreHere = hasYouAreHere && !pin;
  const showSelectedPin = pin != null;

  async function handleRequestLocation() {
    try {
      setIsRefreshingLocation(true);

      const location = await getRealLocation({ showAlerts: true });

      if (!location) {
        clearUserLocation();
        return;
      }

      applyLocationToDraft(location);
      setPin(null);

      const normalized = latLngToNormalized(
        location.coords.latitude,
        location.coords.longitude
      );

      const mapCoords = pointInPolygon(normalized)
        ? normalized
        : snapToPolygonBoundary(normalized);

      mapRef.current?.centerTo({
        x: mapCoords.x,
        y: mapCoords.y,
        zoom: 2,
      });
    } catch (error) {
      console.log('Location request failed:', error.message);
      clearUserLocation();
    } finally {
      setIsRefreshingLocation(false);
    }
  }

  function handleNearMePress() {
    if (!hasYouAreHere) {
      handleRequestLocation();
      return;
    }

    setPin(null);

    mapRef.current?.centerTo({
      x: userMapX,
      y: userMapY,
      zoom: 2,
    });
  }

  function handleTap({ x, y }) {
    if (!pointInPolygon({ x, y })) {
      Alert.alert('Outside campus', 'Please tap a location on the CSULB campus.');
      return;
    }

    setPin({ x, y });
  }

  function handleYouAreHereTap() {
    if (hasYouAreHere) {
      setPin(null);
    }
  }

  function handleBack() {
    router.back();
  }

  function handleCancel() {
    clearDraft();
    router.replace('/(tabs)/Camera');
  }

  function handlePublish() {
    // Manual map taps override GPS so the user stays in control of final placement.
    const finalCoords = pin || youAreHereCoords;

    if (!finalCoords) {
      Alert.alert('No location', 'Tap a spot on the campus map before publishing.');
      return;
    }

    setMapX(finalCoords.x);
    setMapY(finalCoords.y);
    router.push('/PostPublish');
  }

  return (
    <CoastalGradient style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.heading}>Pin Your Echo</Text>
        <Text style={styles.sub}>Tap one spot on campus to publish your post.</Text>

        <View
          style={[
            styles.statusChip,
            pin || hasYouAreHere ? styles.statusChipReady : styles.statusChipWaiting,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              pin || hasYouAreHere ? styles.statusTextReady : styles.statusTextWaiting,
            ]}
          >
            {pin ? 'Location selected' : hasYouAreHere ? 'Using your location' : 'Select a location'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.mapWrapper} showsVerticalScrollIndicator={false}>
        <View style={styles.mapCard}>
          <CampusMap ref={mapRef} onTap={handleTap}>
            {showYouAreHere && (
              <YouAreHerePin
                centroid={youAreHereCoords}
                onPress={handleYouAreHereTap}
              />
            )}

            {showSelectedPin && (
              <ClusteredPin
                centroid={pin}
                ids={[0]}
                onPress={() => {}}
              />
            )}
          </CampusMap>

          <TouchableOpacity
            style={styles.nearMeButton}
            onPress={handleNearMePress}
            disabled={isRefreshingLocation}
          >
            <MaterialIcons
              name={hasYouAreHere ? 'near-me' : 'near-me-disabled'}
              size={24}
              color={hasYouAreHere ? '#2563eb' : '#94a3b8'}
            />
          </TouchableOpacity>

          {process.env.EXPO_PUBLIC_DEBUG_GPS === 'true' && hasYouAreHere && (
            <View style={styles.debugOverlay}>
              <Text style={styles.debugTitle}>GPS Debug</Text>
              <Text style={styles.debugText}>
                GPS: {userLat?.toFixed(6)}, {userLng?.toFixed(6)}
              </Text>
              <Text style={styles.debugText}>
                Map: ({userMapX?.toFixed(5)}, {userMapY?.toFixed(5)})
              </Text>
              <Text style={styles.debugText}>
                In Polygon: {pointInPolygon({ x: userMapX, y: userMapY }) ? 'YES' : 'NO'}
              </Text>
            </View>
          )}
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
          style={[styles.primaryBtn, !(pin || hasYouAreHere) && styles.disabledBtn]}
          onPress={handlePublish}
          disabled={!(pin || hasYouAreHere)}
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
    </CoastalGradient>
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

  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },

  statusTextReady: { color: '#166534' },
  statusTextWaiting: { color: '#334155' },

  mapWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

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
    position: 'relative',
  },

  nearMeButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#111827',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
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

  secondaryText: {
    color: '#0f172a',
    fontWeight: '700',
  },

  ghostBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#94a3b8',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.65)',
  },

  ghostText: {
    color: '#475569',
    fontWeight: '700',
  },

  primaryBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },

  primaryBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  disabledBtn: {
    opacity: 0.4,
  },

  primaryText: {
    color: '#fff',
    fontWeight: '700',
  },

  debugOverlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    padding: 12,
    borderRadius: 8,
    maxWidth: '80%',
  },

  debugTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },

  debugText: {
    color: '#e2e8f0',
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 2,
  },
});
