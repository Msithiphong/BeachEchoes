import React from 'react'
import { useRouter } from 'expo-router'
import Background from '../components/Background'
import Logo from '../components/Logo'
import Header from '../components/Header'
import Paragraph from '../components/Paragraph'
import Button from '../components/Button'
import { AuthProvider } from '../context/AuthContext'

export default function Dashboard() {
  const router = useRouter()
  const { logout } = useContext(AuthContext)

  const handleLogout = () => {
    logout()
    router.replace('/StartScreen')
  }
  return (
    <Background>
      <Logo />
      <Header>Let’s start</Header>
      <Paragraph>
        Explore California State University Long Beach and Connect with others!
      </Paragraph>
      <Button
        mode="outlined"
        onPress={handleLogout}
      >
        Logout
      </Button>
    </Background>
  )
}
