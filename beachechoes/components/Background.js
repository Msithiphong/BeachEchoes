import React from 'react'
import { StyleSheet, KeyboardAvoidingView } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

export default function Background({ children }) {
  return (
    <LinearGradient
      colors={['#96c7e3', '#edd02c']}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.background}
    >
      <KeyboardAvoidingView style={styles.container} behavior="padding">
        {children}
      </KeyboardAvoidingView>
    </LinearGradient>
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
