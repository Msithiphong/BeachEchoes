import { Platform } from 'react-native'

/**
 * Get the API base URL based on the platform and environment
 * 
 * Development:
 * - iOS Simulator: Uses localhost:3000
 * - Android Emulator: Uses 10.0.2.2:3000 (special Android emulator IP)
 * - Physical Devices: Replace LOCAL_IP with your computer's IP address
 * 
 * Production:
 * - Replace with your production API URL
 */
const getApiUrl = () => {
  if (__DEV__) {
    // Development mode
    if (Platform.OS === 'android') {
      // Android emulator uses 10.0.2.2 to access host machine's localhost
      return 'http://10.0.2.2:3000'
      
      // For physical Android devices, uncomment below and add your local IP:
      // return 'http://192.168.1.XXX:3000'
    } else {
      // iOS simulator can use localhost directly
      return 'http://localhost:3000'
    }
  }
  
  // Production mode - replace with your actual production URL
  return 'https://your-production-api.com'
}

export const API_URL = getApiUrl()
export const API_BASE = `${API_URL}/api`
