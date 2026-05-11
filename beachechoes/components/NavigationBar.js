import React, { useState, useEffect } from 'react'
import { BottomNavigation } from 'react-native-paper'
import { useRouter, usePathname } from 'expo-router'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'

// Bottom tab shell that keeps React Native Paper navigation in sync with Expo Router paths.
export default function NavigationBar() {
  const router = useRouter()
  const pathname = usePathname()

  const [index, setIndex] = useState(0)
  const [routes] = useState([
    { key: 'home', title: 'Home', icon: 'home', route: '/(tabs)/Dashboard' },
    { key: 'map', title: 'Map', icon: 'map', route: '/(tabs)/Map' },
    { key: 'post', title: 'Post', icon: 'add-circle', route: '/(tabs)/Camera' },
    { key: 'leaderboard', title: 'Stats', icon: 'leaderboard', route: '/(tabs)/Leaderboard' },
    { key: 'profile', title: 'Profile', icon: 'person', route: '/(tabs)/Profile'},
    
  ])

  // Sync index with current route
  useEffect(() => {
    const currentIndex = routes.findIndex(route => pathname.includes(route.key))
    if (currentIndex !== -1 && currentIndex !== index) {
      setIndex(currentIndex)
    }
  }, [pathname])

  const handleTabPress = ({ route }) => {
    const newIndex = routes.findIndex(r => r.key === route.key)
    setIndex(newIndex)
    router.push(route.route)
  }

  const renderIcon = ({ route, focused, color }) => {
    return <MaterialIcons name={route.icon} size={28} color={color} />
  }

  return (
    <BottomNavigation.Bar
      navigationState={{ index, routes }}
      onTabPress={handleTabPress}
      renderIcon={renderIcon}
      shifting={true}
      labeled={true}
    />
  )
}
