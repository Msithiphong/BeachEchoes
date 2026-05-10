import { tapToNormalized, latLngToNormalized } from '../../helpers/mapUtils';

describe('mapUtils', () => {
  describe('tapToNormalized', () => {
    it('converts tap at top-left corner to (0,0)', () => {
      const result = tapToNormalized(0, 0, 100, 100);
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it('converts tap at bottom-right corner to (1,1)', () => {
      const result = tapToNormalized(100, 100, 100, 100);
      expect(result).toEqual({ x: 1, y: 1 });
    });

    it('converts tap at center to (0.5,0.5)', () => {
      const result = tapToNormalized(50, 50, 100, 100);
      expect(result).toEqual({ x: 0.5, y: 0.5 });
    });

    it('clamps negative tap values to 0', () => {
      const result = tapToNormalized(-10, -10, 100, 100);
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it('clamps tap values beyond view size to 1', () => {
      const result = tapToNormalized(150, 150, 100, 100);
      expect(result).toEqual({ x: 1, y: 1 });
    });

    it('handles different view dimensions correctly', () => {
      const result = tapToNormalized(200, 100, 400, 200);
      expect(result).toEqual({ x: 0.5, y: 0.5 });
    });
  });

  describe('latLngToNormalized', () => {
    it('converts valid GPS coordinates to normalized map coordinates', () => {
      // Using one of the calibration points: GPS (33.78743, -118.11441) → Map (~0.565, ~0.107)
      const result = latLngToNormalized(33.78743, -118.11441);
      expect(result.x).toBeGreaterThanOrEqual(0);
      expect(result.x).toBeLessThanOrEqual(1);
      expect(result.y).toBeGreaterThanOrEqual(0);
      expect(result.y).toBeLessThanOrEqual(1);
    });

    it('clamps coordinates outside [0,1] range', () => {
      // Test with coordinates far outside campus
      const result = latLngToNormalized(0, 0);
      expect(result.x).toBeGreaterThanOrEqual(0);
      expect(result.x).toBeLessThanOrEqual(1);
      expect(result.y).toBeGreaterThanOrEqual(0);
      expect(result.y).toBeLessThanOrEqual(1);
    });

    it('produces consistent results for same input', () => {
      const lat = 33.78474;
      const lng = -118.11429;
      const result1 = latLngToNormalized(lat, lng);
      const result2 = latLngToNormalized(lat, lng);
      expect(result1).toEqual(result2);
    });

    it('returns different coordinates for different GPS locations', () => {
      const result1 = latLngToNormalized(33.78743, -118.11441);
      const result2 = latLngToNormalized(33.78474, -118.11429);
      expect(result1.x).not.toEqual(result2.x);
      expect(result1.y).not.toEqual(result2.y);
    });
  });
});
