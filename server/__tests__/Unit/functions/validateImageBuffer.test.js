const { validateImageBuffer } = require('../../../lib/utils/validateImageBuffer');

// Minimal valid buffers using correct magic bytes (padded to 12 bytes minimum)
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
const gif = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00]);
const webp = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);

describe('validateImageBuffer', () => {
  describe('valid image types', () => {
    it('detects JPEG', () => {
      expect(validateImageBuffer(jpeg)).toBe('image/jpeg');
    });

    it('detects PNG', () => {
      expect(validateImageBuffer(png)).toBe('image/png');
    });

    it('detects GIF', () => {
      expect(validateImageBuffer(gif)).toBe('image/gif');
    });

    it('detects WebP', () => {
      expect(validateImageBuffer(webp)).toBe('image/webp');
    });
  });

  describe('invalid inputs', () => {
    it('returns null for arbitrary bytes', () => {
      expect(validateImageBuffer(Buffer.from('not an image at all!!'))).toBeNull();
    });

    it('returns null for a buffer that is too short (< 12 bytes)', () => {
      expect(validateImageBuffer(Buffer.from([0xff, 0xd8, 0xff]))).toBeNull();
    });

    it('returns null for an empty buffer', () => {
      expect(validateImageBuffer(Buffer.alloc(0))).toBeNull();
    });

    it('returns null for null', () => {
      expect(validateImageBuffer(null)).toBeNull();
    });

    it('returns null for a buffer with correct RIFF header but wrong WEBP marker', () => {
      const fakeRiff = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x41, 0x56, 0x49, 0x20]);
      expect(validateImageBuffer(fakeRiff)).toBeNull();
    });
  });
});
