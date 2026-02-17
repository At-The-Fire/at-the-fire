const BASE_URL = process.env.REACT_APP_BASE_URL;

export async function getFollowerCount(userId) {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/followers/count/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const data = await response.json();

    return data;
  } catch (e) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Error in fetch-followers: ', e);
    }
    throw e;
  }
}

export async function getFollowerList(userId) {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/followers/followers/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const data = await response.json();

    return data;
  } catch (e) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Error in fetch-followers: ', e);
    }
    throw e;
  }
}

export async function getFollowingList(userId) {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/followers/following/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    const data = await response.json();

    return data;
  } catch (e) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Error in fetch-followers: ', e);
    }
    throw e;
  }
}

export async function getUniqueFollowersAndFollowing(userId) {
  try {
    const [followersData, followingData] = await Promise.all([getFollowerList(userId), getFollowingList(userId)]);

    // Merge and filter duplicates based on 'sub'
    return Array.from(
      new Map([...followersData.followers, ...followingData.following].map((user) => [user.sub, user])).values()
    );
  } catch (e) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      console.error('Error getting unique followers and following:', e);
    }
    throw e;
  }
}

export async function fetchFollowStatus(userId) {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/followers/${userId}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    const data = await response.json();

    return data;
  } catch (e) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      console.error('Error fetching follow status:', e);
    }
  }
}

export async function followUser(userId) {
  try {
    await fetch(`${BASE_URL}/api/v1/followers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ followedId: userId }),
    });
  } catch (error) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      console.error('Follow user error:', error);
    }
    throw error;
  }
}

export async function unfollowUser(userId) {
  try {
    await fetch(`${BASE_URL}/api/v1/followers/${userId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
  } catch (error) {
    console.error('Unfollow user error:', error);
    throw error;
  }
}

export async function fetchAllFollowers(userId) {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/followers/followers/${userId}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch followers');

    const data = await response.json();
    return data.followers;
  } catch (e) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      console.error('Error fetching followers:', e);
    }
    throw e;
  }
}

export async function fetchAllFollowing(userId) {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/followers/following/${userId}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch following');

    const data = await response.json();
    return data.following;
  } catch (e) {
    if (process.env.REACT_APP_APP_ENV === 'development') {
      console.error('Error fetching following list');
    }
  }
}
