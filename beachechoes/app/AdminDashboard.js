import React from 'react'
import { useRouter } from 'expo-router'
import Background from '../components/Background'
import Header from '../components/Header'
import Button from '../components/Button'
import { requestPermissions, sendLocalNotification } from '../components/Notifications'

export default function AdminDashboard() {
<<<<<<< Updated upstream
    const router = useRouter()

    return (
        <Background>
            <Header>
                Team Admin Dashboard
            </Header>

            <Button
                mode="outlined"
                onPress={async () => {
                    const granted = await requestPermissions();
                    if (granted) {
                        await sendLocalNotification();
                    }
                }}
            >
                Notifications
            </Button>

            <Button
                mode="outlined"
                onPress={() => router.push('/message')}
            >
                Messages
            </Button>

            <Button
                mode="outlined"
                onPress={() => router.push('/moderation')}
            >
                Content Moderation
            </Button>

        </Background>
    )
=======
  const router = useRouter()

  return (
    <Background>
      <Header>
        Team Admin Dashboard
      </Header>

      <Button
        mode="outlined"
        onPress={async () => {
          const granted = await requestPermissions()
          if (granted) {
            await sendLocalNotification()
          }
        }}
      >
        Notifications
      </Button>

      <Button
        mode="outlined"
        onPress={() => router.push('/Messages')}
      >
        Messages
      </Button>

      <Button
        mode="outlined"
        onPress={() => router.push('/MessageDisplay')}
      >
        Message Display / Report Test
      </Button>

      <Button
        mode="outlined"
        onPress={() => router.push('/moderation')}
      >
        Content Moderation
      </Button>
    </Background>
  )
>>>>>>> Stashed changes
}