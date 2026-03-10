/**
 * Discover Component
 * 
 * Placeholder screen for the Discover feature where users will be able to
 * explore and discover content from other CSULB students.
 * 
 * Future features:
 * - Browse public posts/echoes
 * - Search for users and content
 * - Filter by tags or categories
 * - Trending content
 * 
 * @component
 */

import React, { useState } from 'react'
import Button from '../../components/Button'
import Header from '../../components/Header'
import Background from '../../components/Background'
import TextInput from '../../components/TextInput'
import { useRouter } from 'expo-router'


export default function Discover() {
    const router = useRouter()
    const [search, setSearch] = useState('')
    
    return(
        <>
        <Background>
            <Header>
                Discover
            </Header>
            <TextInput
                label="Search"
                returnKeyType="search"
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
            />
        </Background>
        </>
    )
}