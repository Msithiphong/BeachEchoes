import { CLUSTER_THRESHOLD } from '../config/campusMap';

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

  for (const post of posts) {
    let placed = false;
    for (const cluster of clusters) {
      const dx = post.map_x - cluster.centroid.x;
      const dy = post.map_y - cluster.centroid.y;
      if (Math.sqrt(dx * dx + dy * dy) < threshold) {
        cluster.ids.push(post.id);
        // Update centroid to the mean position of all cluster members.
        const n = cluster.ids.length;
        cluster.centroid.x = (cluster.centroid.x * (n - 1) + post.map_x) / n;
        cluster.centroid.y = (cluster.centroid.y * (n - 1) + post.map_y) / n;
        placed = true;
        break;
      }
    }
    if (!placed) {
      clusters.push({ centroid: { x: post.map_x, y: post.map_y }, ids: [post.id] });
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
