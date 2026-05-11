import React from 'react'
import { Platform, StyleSheet } from 'react-native'
import { Text } from 'react-native-paper'
import { useAppTheme } from '../context/AppThemeContext'

// Reuse one title treatment while still adapting text color to light/dark mode.
export default function Header(props) {
  const { isDark } = useAppTheme()
  return <Text style={[styles.header, isDark ? styles.textWhite : styles.textDark]} {...props} />
}

const styles = StyleSheet.create({
  header: {
    fontSize: 29,
    fontWeight: '700',
    letterSpacing: 0.3,
    fontFamily: Platform.select({
      ios: 'AvenirNext-DemiBold',
      android: 'sans-serif-medium',
      default: undefined,
    }),
    paddingVertical: 8,
    textShadowColor: 'rgba(255,255,255,0.18)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  textWhite: {
    color: '#f7fbff',
  },
  textDark: {
    color: '#08304b',
    textShadowColor: 'rgba(8, 48, 75, 0.12)',
  },
})
