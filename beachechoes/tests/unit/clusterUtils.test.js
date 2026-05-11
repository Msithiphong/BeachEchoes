// Documents the clustering rules that drive grouped map pins.
import { clusterPosts, formatPinCount } from '../../helpers/clusterUtils';

describe('clusterUtils', () => {
  describe('clusterPosts', () => {
    it('returns empty array for empty input', () => {
      const result = clusterPosts([]);
      expect(result).toEqual([]);
    });

    it('creates single cluster for one post', () => {
      const posts = [{ id: 1, map_x: 0.5, map_y: 0.5 }];
      const result = clusterPosts(posts);
      expect(result).toHaveLength(1);
      expect(result[0].centroid).toEqual({ x: 0.5, y: 0.5 });
      expect(result[0].ids).toEqual([1]);
    });

    it('keeps distant posts in separate clusters', () => {
      const posts = [
        { id: 1, map_x: 0.1, map_y: 0.1 },
        { id: 2, map_x: 0.9, map_y: 0.9 },
      ];
      const result = clusterPosts(posts);
      expect(result).toHaveLength(2);
    });

    it('groups nearby posts into same cluster', () => {
      const posts = [
        { id: 1, map_x: 0.5, map_y: 0.5 },
        { id: 2, map_x: 0.501, map_y: 0.501 }, // Very close to first post
      ];
      const result = clusterPosts(posts);
      expect(result).toHaveLength(1);
      expect(result[0].ids).toHaveLength(2);
      expect(result[0].ids).toContain(1);
      expect(result[0].ids).toContain(2);
    });

    it('updates centroid to mean position of cluster members', () => {
      const posts = [
        { id: 1, map_x: 0.5, map_y: 0.5 },
        { id: 2, map_x: 0.502, map_y: 0.502 },
      ];
      const result = clusterPosts(posts);
      expect(result).toHaveLength(1);
      expect(result[0].centroid.x).toBeCloseTo(0.501, 3);
      expect(result[0].centroid.y).toBeCloseTo(0.501, 3);
    });

    it('skips posts with invalid map coordinates', () => {
      const posts = [
        { id: 1, map_x: 0.5, map_y: 0.5 },
        { id: 2, map_x: null, map_y: 0.5 },
        { id: 3, map_x: 0.5, map_y: undefined },
        { id: 4, map_x: -1, map_y: 0.5 }, // Out of range
      ];
      const result = clusterPosts(posts);
      expect(result).toHaveLength(1);
      expect(result[0].ids).toEqual([1]);
    });

    it('handles string coordinate values from database', () => {
      const posts = [
        { id: 1, map_x: '0.5', map_y: '0.5' },
        { id: 2, map_x: '0.501', map_y: '0.501' },
      ];
      const result = clusterPosts(posts);
      expect(result).toHaveLength(1);
      expect(result[0].ids).toHaveLength(2);
    });

    it('respects custom threshold parameter', () => {
      const posts = [
        { id: 1, map_x: 0.5, map_y: 0.5 },
        { id: 2, map_x: 0.55, map_y: 0.55 },
      ];
      // With small threshold, should be separate
      const resultSmall = clusterPosts(posts, 0.01);
      expect(resultSmall).toHaveLength(2);

      // With large threshold, should cluster together
      const resultLarge = clusterPosts(posts, 0.5);
      expect(resultLarge).toHaveLength(1);
    });
  });

  describe('formatPinCount', () => {
    it('returns string representation for counts 1-9', () => {
      expect(formatPinCount(1)).toBe('1');
      expect(formatPinCount(5)).toBe('5');
      expect(formatPinCount(9)).toBe('9');
    });

    it('returns "9+" for counts above 9', () => {
      expect(formatPinCount(10)).toBe('9+');
      expect(formatPinCount(50)).toBe('9+');
      expect(formatPinCount(999)).toBe('9+');
    });

    it('returns "0" for zero count', () => {
      expect(formatPinCount(0)).toBe('0');
    });
  });
});
