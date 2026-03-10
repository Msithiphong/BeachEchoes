/**
 * Discover Component
 * 
 * Screen for discovering other CSULB students via username autocomplete search.
 * Uses the reusable UserAutocomplete component backed by the useUserSearch hook.
 * 
 * @component
 */

import React, { useContext } from 'react'
import { View, StyleSheet } from 'react-native'
import Header from '../../components/Header'
import Background from '../../components/Background'
import UserAutocomplete from '../../components/UserAutocomplete'
import { useRouter } from 'expo-router'
import { AuthContext } from '../../context/AuthContext'


export default function Discover() {
    const router = useRouter()
    const { user } = useContext(AuthContext)

    // Navigate to the selected user's profile (or own Profile tab if it's the current user)
    const handleSelectUser = (item) => {
        if (item.id === user?.uid) {
            router.push('/(tabs)/Profile')
        } else {
            router.push(`/profile/${item.id}`)
        }
    }
    
    return(
        <Background>
            <Header>
                Discover
            </Header>
            <View style={styles.searchContainer}>
                <UserAutocomplete
                    onSelectUser={handleSelectUser}
                    placeholder="Search users..."
                />
            </View>
        </Background>
    )
}

const styles = StyleSheet.create({
    searchContainer: {
        width: '100%',
        zIndex: 1,
    },
})