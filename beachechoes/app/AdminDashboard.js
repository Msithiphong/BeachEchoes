import React, { useState } from 'react'
import { useRouter } from 'expo-router'
import { Alert, ActivityIndicator } from 'react-native'
import { signInWithEmailAndPassword } from 'firebase/auth'
import Background from '../components/Background'
import Header from '../components/Header'
import Button from '../components/Button'
import { requestPermissions, sendLocalNotification } from '../components/Notifications'
import { auth } from '../config/firebase'
import { TEST_USER_A, TEST_USER_B, SHOW_ADMIN_TEST_BUTTONS } from '../config/testUsers'

export default function AdminDashboard() {
    const router = useRouter()
    const [signingIn, setSigningIn] = useState(false)

    /**
     * Sign in as a test user
     * @param {Object} user - Test user credentials object
     * @param {string} userName - Display name for the user (e.g., "User A")
     */
    const handleTestSignIn = async (user, userName) => {
        if (!user.email || !user.password) {
            Alert.alert('Configuration Error', `${userName} credentials not found in environment variables. Please check your .env file.`)
            return
        }

        setSigningIn(true)
        try {
            await signInWithEmailAndPassword(auth, user.email, user.password)
            // Immediately route to Dashboard after successful sign-in
            router.replace('/Dashboard')
        } catch (error) {
            console.error(`Sign in error for ${userName}:`, error)
            Alert.alert('Sign In Failed', error.message || `Could not sign in as ${userName}. Please check credentials.`)
        } finally {
            setSigningIn(false)
        }
    }

    // Show test sign-in buttons only in dev mode or when explicitly enabled
    const showTestButtons = __DEV__ || SHOW_ADMIN_TEST_BUTTONS

    return (
        <Background>
            <Header>
                Team Admin Dashboard
            </Header>

            {/* Dev-only test user sign-in buttons */}
            {showTestButtons && (
                <>
                    <Button
                        mode="contained"
                        onPress={() => handleTestSignIn(TEST_USER_A, 'User A')}
                        disabled={signingIn}
                    >
                        {signingIn ? <ActivityIndicator color="#fff" /> : 'Sign in as Luffy'}
                    </Button>

                    <Button
                        mode="contained"
                        onPress={() => handleTestSignIn(TEST_USER_B, 'User B')}
                        disabled={signingIn}
                    >
                        {signingIn ? <ActivityIndicator color="#fff" /> : 'Sign in as Naruto'}
                    </Button>
                </>
            )}

            {/* Button Sends notifications for testing */}
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
                onPress={() => router.push('/Messages')}
            >
                Messages
            </Button>

        </Background>
    )

}