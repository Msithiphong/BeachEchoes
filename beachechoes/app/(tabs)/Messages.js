import React, { useState, useContext } from 'react'
import { StyleSheet, Text } from 'react-native'
import Button from '../../components/Button'
import Background from '../../components/Background'
import TextInput from '../../components/TextInput'
import { AuthContext } from '../../context/AuthContext'
import { auth } from '../../config/firebase'

import { useRouter } from 'expo-router'

export default function Messages() {
    const router = useRouter()
    const { user } = useContext(AuthContext)

    const [message, setMessage] = useState({ value: '', error: '' })
    const [status, setStatus] = useState({ message: '', error: '' })

    const onMessagePressed = async () => {
        setStatus({ message: '', error: '' })

        if (!message.value.trim()) {
            setStatus({ message: '', error: 'Message cannot be empty'})
            return
        }

        try {
            const token = await auth.currentUser?.getIdToken()
            
            const response = await fetch('http://localhost:3000/api/messages', { 
                method: 'POST', 
                headers: { 
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }, 
                body:JSON.stringify({ 
                    message: message.value 
                }),
            });

        const data = await response.json();

        if (data.success) {
            setStatus({ message: 'Message has been saved to database!', error: '' })
            setMessage({ value: '', error: '' })
        } else {
            setStatus({ message: '', error: data.error || 'Failed to save message' })
        }
        

        } catch (error) {
            console.log('Network failure', error)
            setStatus({ message: '', error: 'Network error. Please try again.' })
        }
    }

    

    return(
        <>
        
        <Background>
            <TextInput 
                label="Message"
                value={message.value}
                onChangeText={(text) => setMessage({ value: text, error: '' })}
                autoCapitalize="none"
            />

            <Text style={styles.successText}>
                {status.message}
            </Text>

            <Text style={styles.errorText}>
                {status.error}
            </Text>
            
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

const styles = StyleSheet.create({
    successText: {
        color: 'green',
        fontSize: 14,
        marginVertical: 8,
        textAlign: 'center',
    },
    errorText: {
        color: 'red',
        fontSize: 14,
        marginVertical: 8,
        textAlign: 'center',
    },
})