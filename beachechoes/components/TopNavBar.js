import React from 'react'
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { theme } from '../core/theme'

export const NAVBAR_HEIGHT = 38

export default function TopNavBar({ translateY }) {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: insets.top / 6,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={[styles.content, { height: NAVBAR_HEIGHT }]}>
        <Text style={styles.title}></Text>
        <TouchableOpacity onPress={() => router.push('/Notifications')} hitSlop={8}>
          <MaterialIcons name="notifications-none" size={26} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: '#fee65f',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
  },
})
