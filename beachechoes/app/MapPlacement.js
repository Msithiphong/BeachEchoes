import React, { useState, useEffect, useRef } from 'react';
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
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useDraftPost } from '../context/DraftPostContext';
import CampusMap from '../components/CampusMap';
import ClusteredPin from '../components/ClusteredPin';
import YouAreHerePin from '../components/YouAreHerePin';
import { pointInPolygon, latLngToNormalized, snapToPolygonBoundary } from '../helpers/mapUtils';

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

  const [pin, setPin] = useState(null); // { x, y } normalized
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!localImageUri) {
      router.replace('/(tabs)/Camera');
    }
  }, [localImageUri, router]);

  // Refresh location when MapPlacement is entered
  useEffect(() => {
    async function refreshLocation() {
      if (!locationPermissionGranted) return;
      
      try {
        setIsRefreshingLocation(true);
        let location;
        
        try {
          // Try to get current position with timeout (Android emulators often fail here)
          location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000, // 5 second timeout
            maximumAge: 10000,  // Accept cached location up to 10 seconds old
          });
        } catch (currentPosError) {
          // Fallback to last known position (works better on Android emulators)
          console.log('getCurrentPosition failed, trying last known position:', currentPosError.message);
          location = await Location.getLastKnownPositionAsync();
          
          if (!location) {
            throw new Error('No location available. Make sure location services are enabled.');
          }
        }
        
        const { latitude, longitude } = location.coords;
        
        if (process.env.EXPO_PUBLIC_DEBUG_GPS === 'true') {
          console.log('🔄 MapPlacement: Refreshing location');
          console.log(`  GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        }
        
        // Store raw lat/lng
        setUserLat(latitude);
        setUserLng(longitude);
        
        // Convert to normalized map coordinates
        const normalized = latLngToNormalized(latitude, longitude);
        
        // Check if within campus polygon, if not snap to boundary
        let mapCoords = normalized;
        if (!pointInPolygon(normalized)) {
          if (process.env.EXPO_PUBLIC_DEBUG_GPS === 'true') {
            console.log('⚠️  MapPlacement: GPS outside campus, snapping to boundary');
          }
          mapCoords = snapToPolygonBoundary(normalized);
        }
        
        if (process.env.EXPO_PUBLIC_DEBUG_GPS === 'true') {
          console.log(`  Final: (${mapCoords.x.toFixed(4)}, ${mapCoords.y.toFixed(4)})`);
        }
        
        setUserMapX(mapCoords.x);
        setUserMapY(mapCoords.y);
      } catch (error) {
        console.error('Location refresh error:', error);
        Alert.alert('Location Error', 'Failed to refresh your location. You can still select a spot manually.');
      } finally {
        setIsRefreshingLocation(false);
      }
    }

    refreshLocation();
  }, []);

  if (!localImageUri) {
    return null;
  }

  const hasYouAreHere = locationPermissionGranted && userMapX != null && userMapY != null;
  const youAreHereCoords = hasYouAreHere ? { x: userMapX, y: userMapY } : null;

  // Determine which pin to show: only one pin at a time
  // If user has selected a spot, show that; otherwise show "You Are Here" if available
  const showYouAreHere = hasYouAreHere && !pin;
  const showSelectedPin = pin != null;

  async function handleRequestLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        setLocationPermissionGranted(true);
        
        // Fetch location immediately
        setIsRefreshingLocation(true);
        let location;
        
        try {
          location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000,
            maximumAge: 10000,
          });
        } catch (currentPosError) {
          console.log('getCurrentPosition failed, trying last known position:', currentPosError.message);
          location = await Location.getLastKnownPositionAsync();
          
          if (!location) {
            throw new Error('No location available');
          }
        }
        
        const { latitude, longitude } = location.coords;
        
        setUserLat(latitude);
        setUserLng(longitude);
        
        const normalized = latLngToNormalized(latitude, longitude);
        let mapCoords = normalized;
        if (!pointInPolygon(normalized)) {
          mapCoords = snapToPolygonBoundary(normalized);
        }
        
        setUserMapX(mapCoords.x);
        setUserMapY(mapCoords.y);
        setIsRefreshingLocation(false);
      } else {
        setLocationPermissionGranted(false);
        Alert.alert('Permission Denied', 'Location permission is required to use the "You Are Here" feature.');
      }
    } catch (error) {
      console.error('Location request error:', error);
      setIsRefreshingLocation(false);
    }
  }

  function handleNearMePress() {
    if (!hasYouAreHere) return;
    
    // Clear manual pin selection to show and select "You Are Here"
    setPin(null);
    
    // Center and zoom to "You Are Here" pin at 2x zoom
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
    // Re-select "You Are Here" as the post location
    if (hasYouAreHere) {
      setPin(null); // Clear manual selection to show "You Are Here"
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
    // Use selected pin if available, otherwise use "You Are Here"
    const finalCoords = pin || youAreHereCoords;
    
    if (!finalCoords) {
      Alert.alert('No location', 'Tap a spot on the campus map before publishing.');
      return;
    }
    setMapX(finalCoords.x);
    setMapY(finalCoords.y);
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
        <View style={[styles.statusChip, (pin || hasYouAreHere) ? styles.statusChipReady : styles.statusChipWaiting]}>
          <Text style={[styles.statusText, (pin || hasYouAreHere) ? styles.statusTextReady : styles.statusTextWaiting]}>
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
          
          {/* NearMe / NearMeDisabled Icon */}
          <TouchableOpacity
            style={styles.nearMeButton}
            onPress={locationPermissionGranted ? handleNearMePress : handleRequestLocation}
            disabled={isRefreshingLocation}
          >
            <MaterialIcons
              name={locationPermissionGranted ? 'near-me' : 'near-me-disabled'}
              size={24}
              color={locationPermissionGranted ? '#2563eb' : '#94a3b8'}
            />
          </TouchableOpacity>
          
          {/* Debug Overlay - GPS Calibration Info */}
          {process.env.EXPO_PUBLIC_DEBUG_GPS === 'true' && hasYouAreHere && (
            <View style={styles.debugOverlay}>
              <Text style={styles.debugTitle}>🗺️ GPS Debug (Affine)</Text>
              <Text style={styles.debugText}>GPS: {userLat?.toFixed(6)}, {userLng?.toFixed(6)}</Text>
              <Text style={styles.debugText}>Map: ({userMapX?.toFixed(5)}, {userMapY?.toFixed(5)})</Text>
              <Text style={styles.debugText}>In Polygon: {pointInPolygon({ x: userMapX, y: userMapY }) ? '✅ YES' : '❌ NO'}</Text>
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
