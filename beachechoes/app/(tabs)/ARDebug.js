import React, { useContext, useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { ScrollContext } from '../../context/ScrollContext'
import {
  addARStateListener,
  addAprilTagListener,
  addPlaneUpdateListener,
  addTrackingStateListener,
  placeEcho,
  startARSession,
  stopARSession,
} from '../../modules/beachechoes-ar'

function pretty(value) {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export default function ARDebugScreen() {
  const { navbarHeight } = useContext(ScrollContext)

  const [sessionStatus, setSessionStatus] = useState('not_started')
  const [lastTracking, setLastTracking] = useState(null)
  const [lastPlane, setLastPlane] = useState(null)
  const [lastTag, setLastTag] = useState(null)
  const [lastArState, setLastArState] = useState(null)
  const [lastPlaceEcho, setLastPlaceEcho] = useState(null)
  const [error, setError] = useState(null)
  const [planeIds, setPlaneIds] = useState({})
  const [trackingEvents, setTrackingEvents] = useState(0)
  const [planeEvents, setPlaneEvents] = useState(0)
  const [tagEvents, setTagEvents] = useState(0)
  const [arStateEvents, setArStateEvents] = useState(0)

  useEffect(() => {
    const trackingSub = addTrackingStateListener((event) => {
      setLastTracking(event)
      setTrackingEvents((count) => count + 1)
    })

    const planeSub = addPlaneUpdateListener((event) => {
      setLastPlane(event)
      setPlaneEvents((count) => count + 1)
      if (event?.id) {
        setPlaneIds((prev) => ({ ...prev, [event.id]: true }))
      }
    })

    const tagSub = addAprilTagListener((event) => {
      setLastTag(event)
      setTagEvents((count) => count + 1)
    })

    const arStateSub = addARStateListener((event) => {
      setLastArState(event)
      setArStateEvents((count) => count + 1)
    })

    return () => {
      trackingSub?.remove?.()
      planeSub?.remove?.()
      tagSub?.remove?.()
      arStateSub?.remove?.()
    }
  }, [])

  const uniquePlaneCount = useMemo(() => Object.keys(planeIds).length, [planeIds])

  const handleStart = async () => {
    setError(null)
    try {
      const result = await startARSession()
      setSessionStatus(String(result))
    } catch (e) {
      setError(e?.message || String(e))
      setSessionStatus('start_failed')
    }
  }

  const handleStop = async () => {
    setError(null)
    try {
      const result = await stopARSession()
      setSessionStatus(String(result))
    } catch (e) {
      setError(e?.message || String(e))
      setSessionStatus('stop_failed')
    }
  }

  const handlePlaceEcho = async () => {
    setError(null)
    try {
      const result = await placeEcho({
        localOffset: { x: 0, y: 0, z: -1 },
        floorLock: true,
      })
      setLastPlaceEcho(result)
    } catch (e) {
      setError(e?.message || String(e))
    }
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: navbarHeight + 12 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Temporary AR Debug Demo</Text>
      <Text style={styles.subtitle}>
        Use this screen for milestone demo only. Remove after demo.
      </Text>

      <View style={styles.row}>
        <TouchableOpacity style={styles.button} onPress={handleStart}>
          <Text style={styles.buttonText}>Start AR Session</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleStop}>
          <Text style={styles.buttonText}>Stop AR Session</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.buttonWide} onPress={handlePlaceEcho}>
        <Text style={styles.buttonText}>Place Echo</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Session</Text>
        <Text style={styles.value}>status: {sessionStatus}</Text>
        {error ? <Text style={styles.error}>error: {error}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Event Counts</Text>
        <Text style={styles.value}>tracking: {trackingEvents}</Text>
        <Text style={styles.value}>plane updates: {planeEvents}</Text>
        <Text style={styles.value}>unique planes: {uniquePlaneCount}</Text>
        <Text style={styles.value}>apriltag updates: {tagEvents}</Text>
        <Text style={styles.value}>ar state updates: {arStateEvents}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Latest Tracking</Text>
        <Text style={styles.json}>{pretty(lastTracking)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Latest Plane/Floor Update</Text>
        <Text style={styles.json}>{pretty(lastPlane)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Latest AprilTag Event</Text>
        <Text style={styles.json}>{pretty(lastTag)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Latest AR State Event</Text>
        <Text style={styles.json}>{pretty(lastArState)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Latest placeEcho Result</Text>
        <Text style={styles.json}>{pretty(lastPlaceEcho)}</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1020',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 10,
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: '#b7c0d8',
    fontSize: 13,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    backgroundColor: '#1863f2',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonWide: {
    backgroundColor: '#0d8f66',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#141b32',
    borderRadius: 10,
    padding: 12,
  },
  cardTitle: {
    color: '#d4ddf5',
    fontWeight: '700',
    marginBottom: 6,
  },
  value: {
    color: '#ffffff',
    fontSize: 13,
    marginBottom: 2,
  },
  error: {
    color: '#ff8181',
    fontSize: 12,
    marginTop: 6,
  },
  json: {
    color: '#9de2b6',
    fontSize: 12,
    fontFamily: 'monospace',
  },
})
