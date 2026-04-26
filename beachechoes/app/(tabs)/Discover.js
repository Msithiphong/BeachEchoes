/**
 * Discover Component
 * 
 * Placeholder screen for discovering content.
 * User search has been moved to the Profile tab.
 * 
 * @component
 */

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Header from '../../components/Header'
import Background from '../../components/Background'


export default function Discover() {
    return(
        <Background>
            <Header>
                Discover
            </Header>
            <View style={styles.container}>
                <Text style={styles.placeholderText}>
                    User search is now available in the Profile tab.
                </Text>
            </View>
        </Background>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    placeholderText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
})
