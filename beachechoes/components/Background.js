import React from 'react'
import { StyleSheet, KeyboardAvoidingView } from 'react-native'
import CoastalGradient from './CoastalGradient'

export default function Background({ children }) {
  return (
    <CoastalGradient style={styles.background}>
      <KeyboardAvoidingView style={styles.container} behavior="padding">
        {children}
      </KeyboardAvoidingView>
    </CoastalGradient>
  )
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
  },
  container: {
    flex: 1,
    padding: 0,
    width: '100%',
    maxWidth: 340,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
