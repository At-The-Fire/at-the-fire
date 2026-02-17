const pool = require('../../../lib/utils/pool');
const setup = require('../../../data/setup');
const request = require('supertest');
const app = require('../../../lib/app');

describe('posts/ post details/ cloudinary routes', () => {
  beforeEach(() => {
    return setup(pool);
  });

  afterAll(() => {
    jest.clearAllMocks();
    pool.end();
  });
  it('GET/gallery-posts should return all posts', async () => {
    const data = await request(app).get('/api/v1/gallery-posts');
    expect(data.status).toBe(200);

    expect(data.body).toBeInstanceOf(Array);
    expect(data.body.length).toBeGreaterThan(0);

    // Check structure for each post.
    data.body.forEach((post) => {
      let displayName;
      let logoImageUrl;
      post.display_name === null ? (displayName = null) : (displayName = expect.any(String));
      post.logo_image_url === null ? (logoImageUrl = null) : (logoImageUrl = expect.any(String));
      expect(post).toEqual({
        category: expect.any(String),
        created_at: expect.any(String),
        customer_id: expect.any(String),
        description: expect.any(String),
        id: expect.any(String),
        image_url: expect.any(String),
        num_imgs: expect.any(String),
        price: expect.any(String),
        public_id: expect.any(String),
        title: expect.any(String),
        display_name: displayName,
        logo_image_url: logoImageUrl,
        sold: expect.any(Boolean),
      });

      if (post.logo_image_url !== null) {
        expect(typeof post.logo_image_url).toBe('string');
      } else {
        expect(post.logo_image_url).toBeNull();
      }
    });
  });

  it('GET/gallery-posts/:id should return a single post', async () => {
    const data = await request(app).get('/api/v1/gallery-posts/1');
    expect(data.status).toBe(200);

    expect(data.body).toEqual({
      category: 'SampleCategory1',
      created_at: expect.any(String),
      customer_id: 'stripe-customer-id_noProfile',
      description: 'SampleDescription1',
      display_name: null,
      id: '1',
      image_url: 'sample_image_url_path_1',
      logo_image_url: null,
      num_imgs: '1',
      price: 'SamplePrice1',
      public_id: 'publicID_post_1',
      sold: false,
      sub: 'sub_customerNoProfile',
      title: 'SampleTitle1',
    });
  });

  it('GET/gallery-posts/urls/:id should return all img urls for a post', async () => {
    const data = await request(app).get('/api/v1/gallery-posts/urls/1');
    expect(data.status).toBe(200);
    expect(data.body).toEqual([]);
  });

  it('should return a feed of posts for a valid user', async () => {
    const response = await request(app).get('/api/v1/gallery-posts/feed/sub_withProfile');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeLessThanOrEqual(50);
    response.body.forEach((post) => {
      expect(post).toHaveProperty('id');
      expect(post).toHaveProperty('title');
      expect(post).toHaveProperty('image_url');
    });
  });

  it('should return an empty array if user follows no one', async () => {
    const response = await request(app).get('/api/v1/gallery-posts/feed/sub_noFollows');

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('should return 500 if database query fails', async () => {
    // Allow user authentication to pass
    jest.spyOn(pool, 'query').mockImplementation(async (query) => {
      if (query.includes('FROM cognito_users')) {
        // Allow authentication query to run successfully
        return { rows: [{ sub: 'sub_withProfile' }] };
      }
      throw new Error('Database error'); // Mock failure only for post fetching
    });

    const response = await request(app).get('/api/v1/gallery-posts/feed/sub_withProfile');

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('Database error');

    pool.query.mockRestore();
  });
});
