import { auth } from '../config/firebase'

/**
 * Upload avatar image to Firebase Storage via backend API
 * 
 * @param {string} userId - The user's Firebase UID
 * @param {string} imageUri - Local image URI (from image picker)
 * @returns {Promise<string>} The public URL of the uploaded avatar
 */
export async function uploadAvatar(userId, imageUri) {
  try {
    // Get current user's ID token
    const token = await auth.currentUser?.getIdToken()
    if (!token) {
      throw new Error('User not authenticated')
    }

    // Convert image to base64
    const response = await fetch(imageUri)
    const blob = await response.blob()
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64data = reader.result.split(',')[1]
        
        try {
          // Send to backend with auth token
          const uploadResponse = await fetch(`http://localhost:3000/api/profile/${userId}/avatar`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              imageBase64: base64data,
              contentType: blob.type || 'image/jpeg',
            }),
          })
          
          // Check if response is ok
          if (!uploadResponse.ok) {
            throw new Error(`Server error: ${uploadResponse.status}`)
          }
          
          // Check content type before parsing
          const contentType = uploadResponse.headers.get('content-type')
          if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Server returned non-JSON response. Is the server running?')
          }
          
          const data = await uploadResponse.json()
          
          if (data.success) {
            resolve(data.avatarUrl)
          } else {
            reject(new Error(data.error || 'Upload failed'))
          }
        } catch (error) {
          reject(error)
        }
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('Avatar upload error:', error)
    throw error
  }
}

/**
 * Example usage in a component:
 * 
 * import * as ImagePicker from 'expo-image-picker'
 * import { uploadAvatar } from '../helpers/avatarUpload'
 * 
 * const pickAndUploadAvatar = async () => {
 *   // Request permissions
 *   const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
 *   if (status !== 'granted') {
 *     alert('Permission to access camera roll is required!')
 *     return
 *   }
 * 
 *   // Pick image
 *   const result = await ImagePicker.launchImageLibraryAsync({
 *     mediaTypes: ImagePicker.MediaTypeOptions.Images,
 *     allowsEditing: true,
 *     aspect: [1, 1],
 *     quality: 0.8,
 *   })
 * 
 *   if (!result.canceled) {
 *     try {
 *       const avatarUrl = await uploadAvatar(user.uid, result.assets[0].uri)
 *       console.log('Avatar uploaded:', avatarUrl)
 *       // Update user profile with avatarUrl
 *     } catch (error) {
 *       console.error('Upload failed:', error)
 *     }
 *   }
 * }
 */
