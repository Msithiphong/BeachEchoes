import { useState, useCallback, useRef, useEffect } from 'react'
import debounce from 'lodash.debounce'
import { API_URL } from '../config/api'

/**
 * Reusable hook for searching users by name with debounced API calls.
 *
 * Returns suggestions formatted for react-native-autocomplete-dropdown
 * ({ id, title }) plus loading state and helper callbacks.
 *
 * @param {number} debounceMs - Debounce delay in milliseconds (default 300)
 * @returns {{ suggestions, loading, onChangeText, clearSuggestions }}
 */
export default function useUserSearch(debounceMs = 300) {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)

  // Keep the debounced fetch stable so typing does not recreate/cancel it on every render.
  const fetchRef = useRef(
    debounce(async (query) => {
      if (!query || query.trim().length === 0) {
        setSuggestions([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const res = await fetch(
          `${API_URL}/api/users/search?q=${encodeURIComponent(query.trim())}`
        )
        const data = await res.json()

        if (data.success && Array.isArray(data.users)) {
          setSuggestions(
            data.users.map((u) => ({
              id: u.firebase_uid,
              title: u.name,
            }))
          )
        } else {
          setSuggestions([])
        }
      } catch (err) {
        console.error('User search error:', err)
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, debounceMs)
  )

  // Cancel any pending debounce on unmount
  useEffect(() => {
    return () => fetchRef.current.cancel()
  }, [])

  const onChangeText = useCallback((text) => {
    fetchRef.current(text)
  }, [])

  const clearSuggestions = useCallback(() => {
    setSuggestions([])
  }, [])

  return { suggestions, loading, onChangeText, clearSuggestions }
}
