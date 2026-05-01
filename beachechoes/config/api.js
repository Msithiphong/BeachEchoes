/**
 * API Configuration Module
 * 
 * Provides centralized API URL configuration that automatically adapts to the
 * current platform (iOS/Android) and environment (development/production).
 * 
 * This solves the common issue where Android emulators cannot access localhost
 * directly and need to use the special IP address 10.0.2.2.
 * 
 * Usage:
 * ```javascript
 * import { API_URL, API_BASE } from '../config/api'
 * 
 * fetch(`${API_URL}/api/users`)
 * // or
 * fetch(`${API_BASE}/users`)
 * ```
 * 
 * @module config/api
 */

import { Platform } from 'react-native'

/**
 * Ngrok URL for testing on physical devices
 * When running ngrok (ngrok http 3000), paste the forwarding URL here
 * Example: 'https://abcd-123-45-67-89.ngrok-free.app'
 * 
 * Set to null to use platform-specific localhost URLs
 * @constant {string|null}
 */
const NGROK_URL = 'https://friction-referable-spinster.ngrok-free.dev'
// const NGROK_URL = 'https://your-ngrok-url.ngrok-free.app'

/**
 * Get the API base URL based on the platform and environment
 * 
 * Development:
 * - If NGROK_URL is set: Uses ngrok URL (works on any device)
 * - iOS Simulator: Uses localhost:3000
 * - Android Emulator: Uses 10.0.2.2:3000 (special Android emulator IP)
 * - Physical Devices: Replace LOCAL_IP with your computer's IP address
 * 
 * Production:
 * - Replace with your production API URL
 * 
 * @returns {string} The appropriate API base URL for the current platform/environment
 */
const getApiUrl = () => {
  if (__DEV__) {
    // Use ngrok if configured (works on any platform/device)
    if (NGROK_URL) {
      return NGROK_URL
    }
    
    // Development mode - platform-specific localhost
    if (Platform.OS === 'android') {
      // Android emulator uses 10.0.2.2 to access host machine's localhost
      return 'http://10.0.2.2:3000'
      
      // For physical Android devices, uncomment below and add your local IP:
      // To find your IP: macOS: ifconfig | grep "inet " | grep -v 127.0.0.1
      //                  Windows: ipconfig (look for IPv4)
      // return 'http://192.168.1.XXX:3000'
    } else {
      // iOS simulator can use localhost directly
      // return 'http://localhost:3000'

      // For testing iOS on Max's PC
      return 'http://192.168.1.117:3000'
    }
  }
  
  // Production mode - replace with your actual production URL
  // TODO: Update this when deploying to production
  return 'https://your-production-api.com'
}

/**
 * The full API URL (e.g., 'http://localhost:3000')
 * @constant {string}
 */
export const API_URL = getApiUrl()

/**
 * The API base path with '/api' suffix (e.g., 'http://localhost:3000/api')
 * Convenient for making API calls without repeating '/api'
 * @constant {string}
 */
export const API_BASE = `${API_URL}/api`
