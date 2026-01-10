import React from 'react'
import { useRouter } from 'expo-router'
import Background from '../components/Background'
import Logo from '../components/Logo'
import Header from '../components/Header'
import Button from '../components/Button'
import Paragraph from '../components/Paragraph'

export default function StartScreen() {
  const router = useRouter()
  return (
    <Background>
      <Logo />
      <Header>Beach Echoes</Header>
      <Paragraph>
        Connect with your fellow CSULB peers
      </Paragraph>
      <Button
        mode="contained"
        onPress={() => router.push('/LoginScreen')}
      >
        Login
      </Button>
      <Button
        mode="outlined"
        onPress={() => router.push('/RegisterScreen')}
      >
        Sign Up
      </Button>
    </Background>
  )
}
