import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Slot } from 'expo-router'
import NavigationBar from '../../components/NavigationBar'

export default function TabsLayout() {
  return (
    <View style={styles.container}>
        <View style={styles.content}>
          <Slot /> 
        </View>
        <NavigationBar />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  }
})
