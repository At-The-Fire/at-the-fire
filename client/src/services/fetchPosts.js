// const BASE_URL = 'http://localhost:7890';
const BASE_URL = process.env.REACT_APP_BASE_URL;

// auth routes for dashboard
//...
/////////////////////////////////

//  public routes for gallery
// fetch all posts
export const fetchGalleryPosts = async () => {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/gallery-posts`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    const result = await resp.json();

    if (!resp.ok) {
      // Preserve the full error structure
      throw {
        code: result.code || resp.status,
        message: result.message || `Error fetching gallery posts: Status ${resp.status}`,
        type: result.type || 'UnknownError',
      };
    }

    return result;
  } catch (error) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error(error);
    }
    throw error;
  }
};

export const fetchFollowingFeed = async (userSub) => {
  const response = await fetch(`${BASE_URL}/api/v1/gallery-posts/feed/${userSub}`);
  const result = await response.json();

  if (!response.ok) {
    throw {
      code: result.code || response.status,
      message: result.message || `Error fetching gallery posts: Status ${response.status}`,
      type: result.type || 'UnknownError',
    };
  }
  return result;
};

// public route for post detail
export async function getGalleryPostDetail(id) {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/gallery-posts/${id}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    const msg = await resp.json();

    if (!resp.ok) {
      // Preserve the full error structure
      throw {
        code: msg.code || resp.status,
        message: msg.message || `Error fetching gallery post detail: Status ${resp.status}`,
        type: msg.type || 'UnknownError',
      };
    }

    return msg;
  } catch (error) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error(error);
    }
    throw error;
  }
}
export const getAdditionalImageUrlsPublicIdsGallery = async (id) => {
  try {
    const resp = await fetch(`${BASE_URL}/api/v1/gallery-posts/urls/${id}`, {
      method: 'GET',
    });

    const result = await resp.json();

    if (!resp.ok) {
      // Preserve the full error structure
      throw {
        code: result.code || resp.status,
        message: result.message || `Error fetching additional gallery image data: Status ${resp.status}`,
        type: result.type || 'UnknownError',
      };
    }
    return result;
  } catch (error) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error(error);
    }
    throw error;
  }
};
