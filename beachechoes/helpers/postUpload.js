import { auth } from '../config/firebase';
import { API_BASE } from '../config/api';

/**
 * Publish a draft post to the backend.
 *
 * Converts the local image URI to base64, then sends the image data,
 * overlay text, and normalized map coordinates to POST /api/posts.
 *
 * @param {object} draft
 * @param {string} draft.localImageUri - local file URI from expo-camera
 * @param {string} draft.overlayText   - caption text (may be empty)
 * @param {string} draft.category      - selected category label
 * @param {boolean} draft.isAnonymous  - true if post should hide author identity
 * @param {number} draft.mapX          - normalized x coordinate [0,1]
 * @param {number} draft.mapY          - normalized y coordinate [0,1]
 * @returns {Promise<{ id: number, image_url: string }>} the created post
 */
export async function publishPost({ localImageUri, overlayText, category, isAnonymous, mapX, mapY }) {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('User not authenticated');

  // Convert local URI → blob → base64 (same pattern as avatarUpload.js)
  const response = await fetch(localImageUri);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64data = reader.result.split(',')[1];

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
          }),
        });

        if (!uploadResponse.ok) {
          const text = await uploadResponse.text();
          throw new Error(`Server error ${uploadResponse.status}: ${text}`);
        }

        const data = await uploadResponse.json();
        if (!data.success) throw new Error(data.error || 'Publish failed');

        resolve(data.post);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
