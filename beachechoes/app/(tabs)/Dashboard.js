import React, { useContext } from 'react'
import { View, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import Background from '../../components/Background'
import Logo from '../../components/Logo'
import Header from '../../components/Header'
import Paragraph from '../../components/Paragraph'
import Button from '../../components/Button'
import { AuthContext } from '../../context/AuthContext'

export default function Dashboard() {
  const router = useRouter()
  const { logout } = useContext(AuthContext)

  const handleLogout = () => {
    logout()
    router.replace('/StartScreen')
  }

  return (
    <View style={styles.container}>
      <Background style={styles.content}>
        <Logo />
        <Header>Begin</Header>
        <Paragraph>
          Explore California State University Long Beach and Connect with others!
        </Paragraph>
        <Button
          mode="outlined"
          onPress={() => router.push("/Camera")}
        >
          Camera
        </Button>
        <Button
          mode="outlined"
          onPress={handleLogout}
        >
          Logout
        </Button>
      </Background>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  content: {
    flex: 1,
  }
})

