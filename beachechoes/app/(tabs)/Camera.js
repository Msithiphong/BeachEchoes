import React, { useEffect, useRef, useState } from 'react'
import { View, TouchableOpacity, StyleSheet, Text, ActivityIndicator, Linking, Platform } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useIsFocused } from '@react-navigation/native'
import { useCameraPermissions } from 'expo-camera'
import { startARSession, stopARSession } from '../../modules/beachechoes-ar'
import { theme } from '../../core/theme'

const SCREEN_NAME = 'CameraScreen'
// TODO(Milestone 5+): Replace this fallback with a real zone-selection flow.
const DEFAULT_ZONE_ID = 'camera-screen-default-zone'

function resolveZoneId(rawZoneId) {
  if (Array.isArray(rawZoneId)) {
    const firstZoneId = rawZoneId.find(
      (value) => typeof value === 'string' && value.trim().length > 0
    )
    return firstZoneId?.trim() ?? DEFAULT_ZONE_ID
  }

  if (typeof rawZoneId === 'string' && rawZoneId.trim().length > 0) {
    return rawZoneId.trim()
  }

  return DEFAULT_ZONE_ID
}

function getErrorMessage(error, fallbackMessage) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === 'string' && error.trim().length > 0) {
    return error
  }

  return fallbackMessage
}

function getStatusCopy(startupState) {
  if (startupState === 'initializing') {
    return 'Preparing camera permission'
  }

  if (startupState === 'starting') {
    return 'Starting AR session'
  }

  if (startupState === 'active') {
    return 'AR session active'
  }

  if (startupState === 'failure') {
    return 'Unable to start AR'
  }

  return 'AR session idle'
}

function logCameraScreenError(zoneId, stage, error, extraContext = {}) {
  console.error('[CameraScreen] Failed to start AR session', {
    screen: SCREEN_NAME,
    platform: Platform.OS,
    zoneId,
    stage,
    error,
    stack: error instanceof Error ? error.stack : undefined,
    ...extraContext,
  })
}

export default function CameraScreen() {
  const isFocused = useIsFocused()
  const { zoneId: rawZoneId } = useLocalSearchParams()
  const zoneId = resolveZoneId(rawZoneId)
  const [permission, requestPermission] = useCameraPermissions()
  const [startupState, setStartupState] = useState('idle')
  const [errorMessage, setErrorMessage] = useState(null)
  const [retryNonce, setRetryNonce] = useState(0)
  const mountedRef = useRef(false)
  const sessionStartedRef = useRef(false)
  const startupInFlightRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      startupInFlightRef.current = false

      if (!sessionStartedRef.current) {
        return
      }

      stopARSession().catch((error) => {
        logCameraScreenError(zoneId, 'stopARSessionOnUnmount', error, {
          lifecycle: 'unmount',
        })
      })

      sessionStartedRef.current = false
    }
  }, [zoneId])

  useEffect(() => {
    if (isFocused) {
      return
    }

    startupInFlightRef.current = false
    setStartupState('idle')
    setErrorMessage(null)

    if (!sessionStartedRef.current) {
      return
    }

    stopARSession()
      .then((result) => {
        sessionStartedRef.current = false

        if (!result?.success) {
          logCameraScreenError(
            zoneId,
            'stopARSessionResult',
            new Error(result?.message || 'Failed to stop AR session'),
            {
              lifecycle: 'blur',
              result,
            }
          )
        }
      })
      .catch((error) => {
        logCameraScreenError(zoneId, 'stopARSessionException', error, {
          lifecycle: 'blur',
        })
      })
  }, [isFocused, zoneId])

  useEffect(() => {
    if (!isFocused) {
      return
    }

    if (!permission) {
      setStartupState('initializing')
      return
    }

    if (startupInFlightRef.current || sessionStartedRef.current) {
      return
    }

    let isCancelled = false

    const failStartup = (
      stage,
      error,
      extraContext = {},
      fallbackMessage = 'Unable to start AR session'
    ) => {
      startupInFlightRef.current = false
      logCameraScreenError(zoneId, stage, error, extraContext)

      if (isCancelled || !mountedRef.current) {
        return
      }

      setStartupState('failure')
      setErrorMessage(getErrorMessage(error, fallbackMessage))
    }

    const beginStartup = async () => {
      setErrorMessage(null)
      setStartupState('initializing')

      if (!permission.granted) {
        if (!permission.canAskAgain) {
          failStartup(
            'cameraPermissionDenied',
            new Error('Camera permission is denied. Enable camera access in system settings to start AR.'),
            {
              permission,
            }
          )
          return
        }

        try {
          startupInFlightRef.current = true
          const permissionResult = await requestPermission()
          startupInFlightRef.current = false

          if (isCancelled || !mountedRef.current) {
            return
          }

          if (!permissionResult.granted) {
            failStartup(
              'cameraPermissionRequestDenied',
              new Error('Camera permission is required to start the AR session.'),
              {
                permissionResult,
              }
            )
          }
        } catch (error) {
          failStartup('requestPermission', error, {
            permission,
          })
        }

        return
      }

      startupInFlightRef.current = true
      setStartupState('starting')

      try {
        const result = await startARSession(zoneId)

        if (isCancelled || !mountedRef.current) {
          if (result?.success) {
            stopARSession().catch((error) => {
              logCameraScreenError(zoneId, 'stopAfterCancelledStart', error, {
                lifecycle: 'cancelledStartCleanup',
                result,
              })
            })
          }
          return
        }

        if (!result?.success) {
          failStartup(
            'startARSessionResult',
            new Error(result?.message || 'Native AR session failed to start.'),
            {
              result,
            }
          )
          return
        }

        startupInFlightRef.current = false
        sessionStartedRef.current = true
        setStartupState('active')
        setErrorMessage(null)
      } catch (error) {
        failStartup('startARSessionException', error)
      }
    }

    void beginStartup()

    return () => {
      isCancelled = true
    }
  }, [isFocused, permission, requestPermission, retryNonce, zoneId])

  const permissionDeniedPermanently = permission && !permission.granted && permission.canAskAgain === false
  const isBusy = startupState === 'initializing' || startupState === 'starting'

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>BeachEchoes AR</Text>
        <Text style={styles.title}>Camera.js session startup</Text>
        <Text style={styles.subtitle}>
          This screen only handles AR session startup for the development build.
        </Text>
      </View>

      <View style={styles.statusCard}>
        {isBusy && <ActivityIndicator size="large" color="#fff" style={styles.spinner} />}

        <Text style={styles.statusLabel}>{getStatusCopy(startupState)}</Text>

        <Text style={styles.statusText}>
          {startupState === 'active'
            ? 'The native AR session started successfully.'
            : startupState === 'failure'
              ? errorMessage
              : 'Waiting for permission checks and native AR startup to finish.'}
        </Text>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Zone</Text>
          <Text style={styles.metaValue}>{zoneId}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Platform</Text>
          <Text style={styles.metaValue}>{Platform.OS}</Text>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Permission</Text>
          <Text style={styles.metaValue}>
            {permission?.granted ? 'Granted' : permission ? permission.status : 'Checking'}
          </Text>
        </View>

        {startupState === 'failure' && (
          <View style={styles.actionGroup}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setRetryNonce((value) => value + 1)}
            >
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </TouchableOpacity>

            {permissionDeniedPermanently && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  Linking.openSettings().catch((error) => {
                    logCameraScreenError(zoneId, 'openSettings', error, {
                      lifecycle: 'errorRecovery',
                    })
                  })
                }}
              >
                <Text style={styles.secondaryButtonText}>Open Settings</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05070b',
    paddingHorizontal: 24,
    paddingVertical: 28,
    justifyContent: 'center',
  },
  hero: {
    marginBottom: 28,
  },
  eyebrow: {
    color: '#8fa5c7',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 10,
  },
  subtitle: {
    color: '#c8d2e1',
    fontSize: 16,
    lineHeight: 24,
  },
  statusCard: {
    backgroundColor: '#101826',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(143,165,199,0.2)',
  },
  spinner: {
    marginBottom: 20,
  },
  statusLabel: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
  },
  statusText: {
    color: '#c8d2e1',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(143,165,199,0.12)',
  },
  metaLabel: {
    color: '#8fa5c7',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  metaValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionGroup: {
    marginTop: 20,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: theme.colors.error,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  secondaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
})
