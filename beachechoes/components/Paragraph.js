import React from 'react'
import { Platform, StyleSheet } from 'react-native'
import { Text } from 'react-native-paper'
import { useAppTheme } from '../context/AppThemeContext'

// Companion body text style for auth screens and lightweight empty states.
export default function Paragraph(props) {
  const { isDark } = useAppTheme()
  return <Text style={[styles.text, isDark ? styles.textWhite : styles.textDark]} {...props} />
}

const styles = StyleSheet.create({
  text: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Platform.select({
      ios: 'AvenirNext-Regular',
      android: 'sans-serif',
      default: undefined,
    }),
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  textWhite: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  textDark: {
    color: 'rgba(8, 48, 75, 0.88)',
  },
})
