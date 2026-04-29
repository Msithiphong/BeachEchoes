import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Slot, usePathname } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import NavigationBar from '../../components/NavigationBar'
import TopNavBar, { NAVBAR_HEIGHT } from '../../components/TopNavBar'
import { ScrollContext } from '../../context/ScrollContext'
import useHideOnScroll from '../../hooks/useHideOnScroll'

export default function TabsLayout() {
  const insets = useSafeAreaInsets()
  const totalNavHeight = NAVBAR_HEIGHT + insets.top / 6
  const { scrollHandler, navbarTranslateY } = useHideOnScroll(totalNavHeight)
  const pathname = usePathname()
  const isCamera = pathname === '/(tabs)/Camera'

  return (
    <ScrollContext.Provider value={{ scrollHandler, navbarHeight: totalNavHeight }}>
      <View style={styles.container}>
        {!isCamera && <TopNavBar translateY={navbarTranslateY} />}
        <View style={styles.content}>
          <Slot />
        </View>
        <NavigationBar />
      </View>
    </ScrollContext.Provider>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
})
