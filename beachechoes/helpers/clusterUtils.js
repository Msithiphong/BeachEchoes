import { CLUSTER_THRESHOLD } from '../config/campusMap';

/**
 * Check if a post has valid normalized map coordinates.
 * Handles both number and string types (database drivers may return either).
 * @param {{ map_x: any, map_y: any }} post
 * @returns {boolean}
 */
function hasValidMapCoordinates(post) {
  // Parse coordinates - handle both numbers and numeric strings
  const x = typeof post.map_x === 'string' ? parseFloat(post.map_x) : post.map_x;
  const y = typeof post.map_y === 'string' ? parseFloat(post.map_y) : post.map_y;
  
  return (
    typeof x === 'number' &&
    typeof y === 'number' &&
    !isNaN(x) &&
    !isNaN(y) &&
    x >= 0 &&
    x <= 1 &&
    y >= 0 &&
    y <= 1
  );
}

/**
 * Group an array of posts into spatial clusters.
 * Posts whose normalized (map_x, map_y) positions are within
 * CLUSTER_THRESHOLD of each other are merged into a single cluster.
 *
 * Uses a greedy single-pass approach: fast enough for the expected
 * post volumes on a campus map feed.
 *
 * @param {Array<{ id: number, map_x: number, map_y: number }>} posts
 * @param {number} [threshold] - override the default cluster threshold
 * @returns {Array<{ centroid: { x: number, y: number }, ids: number[] }>}
 */
export function clusterPosts(posts, threshold = CLUSTER_THRESHOLD) {
  const clusters = [];

  // Filter out posts with invalid or missing map coordinates
  const validPosts = posts.filter(post => {
    const isValid = hasValidMapCoordinates(post);
    if (!isValid && __DEV__) {
      console.warn('ClusterUtils: Skipping post with invalid coordinates:', {
        id: post.id,
        map_x: post.map_x,
        map_y: post.map_y,
      });
    }
    return isValid;
  });

  for (const post of validPosts) {
    // Ensure coordinates are numbers (handle string values from database)
    const postX = typeof post.map_x === 'string' ? parseFloat(post.map_x) : post.map_x;
    const postY = typeof post.map_y === 'string' ? parseFloat(post.map_y) : post.map_y;
    
    let placed = false;
    for (const cluster of clusters) {
      const dx = postX - cluster.centroid.x;
      const dy = postY - cluster.centroid.y;
      if (Math.sqrt(dx * dx + dy * dy) < threshold) {
        cluster.ids.push(post.id);
        // Update centroid to the mean position of all cluster members.
        const n = cluster.ids.length;
        cluster.centroid.x = (cluster.centroid.x * (n - 1) + postX) / n;
        cluster.centroid.y = (cluster.centroid.y * (n - 1) + postY) / n;
        placed = true;
        break;
      }
    }
    if (!placed) {
      clusters.push({ centroid: { x: postX, y: postY }, ids: [post.id] });
    }
  }

  return clusters;
}

/**
 * Format a post count for display on a cluster pin.
 * Counts above 9 are shown as "9+".
 *
 * @param {number} count
 * @returns {string}
 */
export function formatPinCount(count) {
  return count > 9 ? '9+' : String(count);
}
