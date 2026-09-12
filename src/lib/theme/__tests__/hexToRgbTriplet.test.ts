import { hexToRgbTriplet } from '../hexToRgbTriplet';

describe('hexToRgbTriplet', () => {
  it('converts a hex color to a space-separated rgb triplet', () => {
    expect(hexToRgbTriplet('#2563eb')).toBe('37 99 235');
  });

  it('converts pure white and black (edge cases)', () => {
    expect(hexToRgbTriplet('#ffffff')).toBe('255 255 255');
    expect(hexToRgbTriplet('#000000')).toBe('0 0 0');
  });
});
