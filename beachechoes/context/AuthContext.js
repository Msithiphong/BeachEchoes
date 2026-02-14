/**
 * Authentication Context Module
 * 
 * Provides global authentication state management across the BeachEchoes app.
 * This context wraps the entire app and syncs with Firebase authentication state,
 * making user data available to all components via the useContext hook.
 * 
 * Features:
 * - Automatic sync with Firebase auth state
 * - Persistent user session across app restarts
 * - Loading state during initialization
 * - Login/logout methods for state management
 * 
 * Usage:
 * ```javascript
 * const { user, login, logout, loading } = useContext(AuthContext)
 * 
 * if (loading) return <Spinner />
 * if (user) return <Dashboard />
 * return <LoginScreen />
 * ```
 * 
 * @module context/AuthContext
 */

import React, { createContext, useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../config/firebase'

/**
 * Authentication Context
 * 
 * Provides:
 * - user: Current user object or null
 * - login: Function to update user state
 * - logout: Function to clear user state
 * - loading: Boolean indicating if auth state is being loaded
 * 
 * @type {React.Context}
 */
export const AuthContext = createContext()

/**
 * Authentication Provider Component
 * 
 * Wraps the app and provides authentication state to all child components.
 * Automatically listens to Firebase auth state changes and updates context.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to wrap
 * @returns {JSX.Element} Provider component
 */
export function AuthProvider({ children }) {
    // Current authenticated user object
    const [user, setUser] = useState(null)
    
    // Loading state - true while checking Firebase auth status
    const [loading, setLoading] = useState(true)

    /**
     * Effect: Listen to Firebase authentication state changes
     * 
     * Sets up a listener that fires whenever the user's auth state changes
     * (login, logout, token refresh, etc.). This keeps our context in sync
     * with Firebase's backend auth state.
     */
    useEffect(() => {
        // Subscribe to Firebase auth state changes
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                // User is signed in - sync Firebase user data with context
                setUser({
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    name: firebaseUser.displayName,
                    emailVerified: firebaseUser.emailVerified,
                    photoURL: firebaseUser.photoURL,
                })
            } else {
                // User is signed out - clear context
                setUser(null)
            }
            // Auth state check complete
            setLoading(false)
        })

        // Cleanup: Unsubscribe from auth listener when component unmounts
        return () => unsubscribe()
    }, [])

    /**
     * Update user state in context
     * 
     * Called after successful login to update the local user state.
     * Firebase auth is already handled by this point - this just updates
     * the context state for immediate UI updates.
     * 
     * @param {Object} userData - User data object
     * @param {string} userData.uid - Firebase user ID
     * @param {string} userData.email - User email
     * @param {string} [userData.name] - User display name
     */
    const login = (userData) => {
        // Firebase auth already handled, just update local state if needed
        setUser(userData)
    }

    /**
     * Clear user state from context
     * 
     * Called after logout to clear local state. The actual Firebase signOut
     * should be called from the component before calling this.
     */
    const logout = () => {
        // Firebase signOut should be called from components
        // This just clears local state
        setUser(null)
    }

    // Provide auth state and methods to all child components
    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {children}
        </AuthContext.Provider>
    )
}