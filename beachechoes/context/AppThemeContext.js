import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'beachechoes_theme_mode'

const AppThemeContext = createContext(null)

const palettes = {
  dark: {
    mode: 'dark',
    gradient: ['#032b44', '#0f5f7a', '#1ea0a9', '#f2d184'],
    textPrimary: '#f7fbff',
    textSecondary: 'rgba(247, 251, 255, 0.9)',
    card: 'rgba(255,255,255,0.22)',
    border: 'rgba(255,255,255,0.35)',
  },
  light: {
    mode: 'light',
    gradient: ['#78c7f6', '#67d2cb', '#9fe5cb', '#ffe8a2'],
    textPrimary: '#08304b',
    textSecondary: 'rgba(8, 48, 75, 0.85)',
    card: 'rgba(255,255,255,0.58)',
    border: 'rgba(8, 48, 75, 0.16)',
  },
}

export function AppThemeProvider({ children }) {
  const [mode, setMode] = useState('dark')

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (value === 'dark' || value === 'light') {
          setMode(value)
        }
      })
      .catch(() => {})
  }, [])

  const setThemeMode = async (nextMode) => {
    if (nextMode !== 'dark' && nextMode !== 'light') return
    setMode(nextMode)
    try {
      await AsyncStorage.setItem(STORAGE_KEY, nextMode)
    } catch {
      // Ignore persistence errors to avoid blocking UI.
    }
  }

  const toggleTheme = () => {
    const next = mode === 'dark' ? 'light' : 'dark'
    setThemeMode(next)
  }

  const value = {
    mode,
    isDark: mode === 'dark',
    palette: palettes[mode],
    toggleTheme,
    setThemeMode,
  }

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>
}

export function useAppTheme() {
  const ctx = useContext(AppThemeContext)
  if (!ctx) {
    return {
      mode: 'dark',
      isDark: true,
      palette: palettes.dark,
      toggleTheme: () => {},
      setThemeMode: () => {},
    }
  }
  return ctx
}
