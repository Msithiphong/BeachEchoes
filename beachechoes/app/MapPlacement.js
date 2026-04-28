import React, { useEffect, useMemo, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { useDraftPost } from '../context/DraftPostContext'
import CampusMap from '../components/CampusMap'
import { pointInPolygon } from '../helpers/mapUtils'
import {
  isLatLngInsideCampus,
  latLngToMapPoint,
} from '../config/campusMap'

function PlacementPin({ point, label, mapWidth, mapHeight }) {
  if (!point || !mapWidth || !mapHeight) return null

  const left = point.x * mapWidth
  const top = point.y * mapHeight

  return (
    <View
      pointerEvents="none"
      style={[
        styles.pinWrap,
        {
          left,
          top,
        },
      ]}
    >
      <View style={styles.pinLabel}>
        <Text style={styles.pinLabelText}>{label}</Text>
      </View>

      <View style={styles.pinDot} />
    </View>
  )
}

export default function MapPlacement() {
  const router = useRouter()

  const {
    localImageUri,
    latitude,
    longitude,
    mapX,
    mapY,
    setMapX,
    setMapY,
    clearDraft,
  } = useDraftPost()

  const initialGpsPoint = useMemo(() => {
    if (latitude == null || longitude == null) return null

    if (!isLatLngInsideCampus(latitude, longitude)) {
      return null
    }

    return latLngToMapPoint(latitude, longitude)
  }, [latitude, longitude])

  const [pin, setPin] = useState(null)
  const [wasAdjusted, setWasAdjusted] = useState(false)

  useEffect(() => {
    if (!pin && mapX != null && mapY != null) {
      setPin({ x: mapX, y: mapY })
      return
    }

    if (!pin && initialGpsPoint) {
      setPin(initialGpsPoint)
      setMapX(initialGpsPoint.x)
      setMapY(initialGpsPoint.y)
    }
  }, [pin, mapX, mapY, initialGpsPoint, setMapX, setMapY])

  if (!localImageUri) {
    router.replace('/(tabs)/Camera')
    return null
  }

  function handleTap({ x, y }) {
    if (!pointInPolygon({ x, y })) {
      Alert.alert('Outside campus', 'Please tap a location on the CSULB campus.')
      return
    }

    setPin({ x, y })
    setMapX(x)
    setMapY(y)
    setWasAdjusted(true)
  }

  function handleBack() {
    router.back()
  }

  function handleCancel() {
    clearDraft()
    router.replace('/(tabs)/Camera')
  }

  function handlePublish() {
    if (!pin) {
      Alert.alert(
        'No location',
        'We could not automatically place your echo. Tap a spot on the campus map before publishing.'
      )
      return
    }

    setMapX(pin.x)
    setMapY(pin.y)
    router.push('/PostPublish')
  }

  const hasGpsLocation = latitude != null && longitude != null
  const isGpsInsideCampus =
    hasGpsLocation && isLatLngInsideCampus(latitude, longitude)

  const statusText = pin
    ? wasAdjusted
      ? 'Location adjusted'
      : 'You are here'
    : isGpsInsideCampus
      ? 'Loading location'
      : 'Tap to select a location'

  const description = pin
    ? 'We placed your echo at your current location. Tap the map if you want to adjust it.'
    : hasGpsLocation
      ? 'Your GPS location is outside the campus map. Tap the map to choose where this echo should appear.'
      : 'Tap one spot on campus to publish your post.'

  return (
    <LinearGradient colors={['#9ed4df', '#ffe000']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerCard}>
          <Text style={styles.heading}>Pin Your Echo</Text>
          <Text style={styles.sub}>{description}</Text>

          <View
            style={[
              styles.statusChip,
              pin ? styles.statusChipReady : styles.statusChipWaiting,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                pin ? styles.statusTextReady : styles.statusTextWaiting,
              ]}
            >
              {statusText}
            </Text>
          </View>

          {hasGpsLocation ? (
            <Text style={styles.gpsText}>
              GPS: {Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}
            </Text>
          ) : null}
        </View>

        <View style={styles.mapWrapper}>
          <View style={styles.mapCard}>
            <CampusMap onTap={handleTap}>
              {pin ? (
                <PlacementPin
                  point={pin}
                  label={wasAdjusted ? 'Selected spot' : 'You are here'}
                />
              ) : null}
            </CampusMap>
          </View>
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
            colors={pin ? ['#1e293b', '#0f172a'] : ['#94a3b8', '#94a3b8']}
            style={styles.primaryBtnGradient}
          >
            <Text style={styles.primaryText}>Publish</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
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
    lineHeight: 20,
  },
  statusChip: {
    alignSelf: 'flex-start',
    marginTop: 12,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusChipReady: {
    backgroundColor: '#dcfce7',
  },
  statusChipWaiting: {
    backgroundColor: '#e2e8f0',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusTextReady: {
    color: '#166534',
  },
  statusTextWaiting: {
    color: '#334155',
  },
  gpsText: {
    marginTop: 8,
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
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
  },
  pinWrap: {
    position: 'absolute',
    alignItems: 'center',
    transform: [{ translateX: -48 }, { translateY: -54 }],
    zIndex: 30,
  },
  pinLabel: {
    backgroundColor: '#0f172a',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 4,
  },
  pinLabelText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  pinDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  actions: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    backgroundColor: 'rgba(255, 224, 0, 0.92)',
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
    opacity: 0.65,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '700',
  },
})