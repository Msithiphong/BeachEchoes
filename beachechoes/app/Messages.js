/**
 * Messages Component
 * 
 * Test screen for sending messages to the database. This component demonstrates
 * authenticated API calls to the backend, including token-based authentication
 * and error handling.
 * 
 * Features:
 * - Text input for message content
 * - Authenticated POST request to backend
 * - Success/error message display
 * - Input validation
 * 
 * Note: This is a development/testing screen and may be replaced with a full
 * messaging feature in the future.
 * 
 * @component
 */

import React, { useState, useContext } from 'react'
import { StyleSheet, Text } from 'react-native'
import Button from '../components/Button'
import Background from '../components/Background'
import TextInput from '../components/TextInput'
import { AuthContext } from '../context/AuthContext'
import { auth } from '../config/firebase'
import { API_URL } from '../config/api'

import { useRouter } from 'expo-router'

export default function Messages() {
    // Navigation hook
    const router = useRouter()
    
    // Access authenticated user from context
    const { user } = useContext(AuthContext)

    // State for message input with validation error
    const [message, setMessage] = useState({ value: '', error: '' })
    
    // State for success/error status messages
    const [status, setStatus] = useState({ message: '', error: '' })

    /**
     * Handle message submission to database
     * 
     * Validates message content, gets Firebase auth token, and sends
     * authenticated POST request to backend API.
     * 
     * @async
     */
    const onMessagePressed = async () => {
        // Clear previous status messages
        setStatus({ message: '', error: '' })

        // Validate message is not empty
        if (!message.value.trim()) {
            setStatus({ message: '', error: 'Message cannot be empty'})
            return
        }

        try {
            // Get current user's Firebase authentication token
            const token = await auth.currentUser?.getIdToken()
            
            // Messages uses the legacy message endpoint rather than the posts flow.
            // It remains useful as a simple authenticated backend smoke test.
            const response = await fetch(`${API_URL}/api/messages`, { 
                method: 'POST', 
                headers: { 
                    'Content-Type': 'application/json',
                    // Include auth token if available
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }, 
                body:JSON.stringify({ 
                    message: message.value 
                }),
            });

        // Parse response
        const data = await response.json();

        if (data.success) {
            // Success: show confirmation and clear input
            setStatus({ message: 'Message has been saved to database!', error: '' })
            setMessage({ value: '', error: '' })
        } else {
            // API returned error
            setStatus({ message: '', error: data.error || 'Failed to save message' })
        }
        

        } catch (error) {
            // Network or other error
            console.log('Network failure', error)
            setStatus({ message: '', error: 'Network error. Please try again.' })
        }
    }

    

    return(
        <>
        
        <Background>
            {/* Message input field */}
            <TextInput 
                label="Message"
                value={message.value}
                onChangeText={(text) => setMessage({ value: text, error: '' })}
                autoCapitalize="none"
            />

            {/* Success message display */}
            <Text style={styles.successText}>
                {status.message}
            </Text>

            {/* Error message display */}
            <Text style={styles.errorText}>
                {status.error}
            </Text>
            
            {/* Submit button */}
            <Button
                mode="contained"
                onPress={onMessagePressed}
            >
                Send 2 DB
            </Button>
            
        </Background>
        </>
    )
}

/**
 * Styles for status messages
 */
const styles = StyleSheet.create({
    // Success message (green)
    successText: {
        color: 'green',
        fontSize: 14,
        marginVertical: 8,
        textAlign: 'center',
    },
    // Error message (red)
    errorText: {
        color: 'red',
        fontSize: 14,
        marginVertical: 8,
        textAlign: 'center',
    },
})
