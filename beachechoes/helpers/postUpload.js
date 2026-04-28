import { auth } from '../config/firebase'
import { API_BASE } from '../config/api'

export async function publishPost({
  localImageUri,
  overlayText,
  category,
  isAnonymous,
  mapX,
  mapY,
  latitude,
  longitude,
}) {
  const token = await auth.currentUser?.getIdToken()

  if (!token) {
    throw new Error('User not authenticated')
  }

  const response = await fetch(localImageUri)
  const blob = await response.blob()

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onloadend = async () => {
      try {
        const base64data = reader.result.split(',')[1]

        const uploadResponse = await fetch(`${API_BASE}/posts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            imageBase64: base64data,
            contentType: blob.type || 'image/jpeg',
            overlayText: overlayText || '',
            category,
            isAnonymous: !!isAnonymous,
            mapX,
            mapY,
            latitude,
            longitude,
          }),
        })

        if (!uploadResponse.ok) {
          const text = await uploadResponse.text()
          throw new Error(`Server error ${uploadResponse.status}: ${text}`)
        }

        const data = await uploadResponse.json()

        if (!data.success) {
          throw new Error(data.error || 'Publish failed')
        }

        resolve(data.post)
      } catch (err) {
        reject(err)
      }
    }

    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}