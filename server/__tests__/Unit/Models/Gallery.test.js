const Gallery = require('../../../lib/models/Gallery.js');
const pool = require('../../../lib/utils/pool.js');

jest.mock('../../../lib/utils/pool');

describe('Gallery Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a gallery instance from a row', () => {
    const row = {
      id: 1,
      created_at: '2024-01-01T00:00:00Z',
      title: 'Test Gallery',
      description: 'Test Description',
      image_url: 'http://test.com/image.jpg',
      category: 'art',
      price: 100,
      customer_id: 'cust_123',
      public_id: 'pub_123',
      num_imgs: 5,
      display_name: 'Test User',
      logo_image_url: 'http://test.com/logo.jpg',
      sub: 'sub_123',
    };

    const gallery = new Gallery(row);
    expect(gallery).toEqual(row);
  });

  describe('getGalleryPosts', () => {
    it('returns all gallery posts with joined data', async () => {
      const mockRows = [
        {
          id: 1,
          title: 'Post 1',
          customer_id: 'cust_123',
          display_name: 'Test User',
          logo_image_url: 'logo.jpg',
        },
      ];

      pool.query.mockResolvedValueOnce({ rows: mockRows });

      const results = await Gallery.getGalleryPosts();

      expect(results).toHaveLength(1);
      expect(results[0]).toBeInstanceOf(Gallery);
      expect(results[0].title).toBe('Post 1');
      expect(results[0].display_name).toBe('Test User');
      expect(pool.query).toHaveBeenCalledTimes(1);
    });

    it('returns empty array when no posts exist', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const results = await Gallery.getGalleryPosts();

      expect(results).toHaveLength(0);
    });
  });

  describe('getGalleryPostsByStripeId', () => {
    it('returns posts for specific customer', async () => {
      const mockRows = [
        {
          id: 1,
          customer_id: 'cust_123',
          title: 'Customer Post',
          sub: 'sub_123',
        },
      ];

      pool.query.mockResolvedValueOnce({ rows: mockRows });

      const results = await Gallery.getGalleryPostsByStripeId('cust_123');

      expect(results[0].customer_id).toBe('cust_123');
      expect(pool.query).toHaveBeenCalledWith(expect.any(String), ['cust_123']);
    });

    it('returns empty array when customer has no posts', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const results = await Gallery.getGalleryPostsByStripeId('cust_456');

      expect(results).toHaveLength(0);
    });
  });

  describe('getGalleryPostById', () => {
    it('returns single post by id', async () => {
      const mockRow = {
        id: 1,
        title: 'Test Post',
        customer_id: 'cust_123',
      };

      pool.query.mockResolvedValueOnce({ rows: [mockRow] });

      const result = await Gallery.getGalleryPostById(1);

      expect(result).toBeInstanceOf(Gallery);
      expect(result.id).toBe(1);
      expect(pool.query).toHaveBeenCalledWith(expect.any(String), [1]);
    });

    it('returns null when post not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const result = await Gallery.getGalleryPostById(999);

      expect(result).toBeNull();
    });
  });

  describe('getGalleryImagesByPostId', () => {
    it('returns array of images for post', async () => {
      const mockRows = [
        {
          id: 1,
          post_id: 123,
          image_url: 'image1.jpg',
        },
        {
          id: 2,
          post_id: 123,
          image_url: 'image2.jpg',
        },
      ];

      pool.query.mockResolvedValueOnce({ rows: mockRows });

      const results = await Gallery.getGalleryImagesByPostId(123);

      expect(results).toHaveLength(2);
      expect(results[0]).toBeInstanceOf(Gallery);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('posts_imgs'),
        [123]
      );
    });

    it('returns empty array when post has no images', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const results = await Gallery.getGalleryImagesByPostId(123);

      expect(results).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('handles database errors', async () => {
      pool.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(Gallery.getGalleryPosts()).rejects.toThrow('Database error');
    });
  });
});
