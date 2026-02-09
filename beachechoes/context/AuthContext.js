import React, { createContext, useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../config/firebase'

export const AuthContext = createContext()

// Handles user credentials across beach echoes
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Subscribe to Firebase auth state changes
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                // User is signed in - sync with context
                setUser({
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    name: firebaseUser.displayName,
                    emailVerified: firebaseUser.emailVerified,
                    photoURL: firebaseUser.photoURL,
                })
            } else {
                // User is signed out
                setUser(null)
            }
            setLoading(false)
        })

        // Cleanup subscription on unmount
        return () => unsubscribe()
    }, [])

    const login = (userData) => {
        // Firebase auth already handled, just update local state if needed
        setUser(userData)
    }

    const logout = () => {
        // Firebase signOut should be called from components
        // This just clears local state
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    )
}