import React, { createContext, useState } from 'react'

export const AuthContext = createContext()

// Handles user credentials across beach echoes
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)

    const login = (userData) => setUser(userData)
    const logout = () => setUser(null)

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}