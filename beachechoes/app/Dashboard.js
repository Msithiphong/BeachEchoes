import React from 'react'
import { useRouter } from 'expo-router'
import Background from '../components/Background'
import Logo from '../components/Logo'
import Header from '../components/Header'
import Paragraph from '../components/Paragraph'
import Button from '../components/Button'

export default function Dashboard() {
  const router = useRouter()
  return (
    <Background>
      <Logo />
      <Header>Let’s start</Header>
      <Paragraph>
        Explore California State University Long Beach and Connect with others!
      </Paragraph>
      <Button
        mode="outlined"
        onPress={() => router.replace('/StartScreen') }
      >
        Logout
      </Button>
    </Background>
  )
}
