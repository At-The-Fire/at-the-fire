import { createContext, useContext, useEffect, useState } from 'react';
import { fetchGalleryPosts, fetchFollowingFeed } from '../services/fetchPosts.js'; // Import feed fetch function
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useAuthStore } from '../stores/useAuthStore.js';

const QueryContext = createContext();

const QueryProvider = ({ children }) => {
  const [query, setQuery] = useState('');
  const [galleryPosts, setGalleryPosts] = useState([]);
  const [followingFeedData, setFollowingFeedData] = useState([]); // Store followed users' posts
  const [error, setError] = useState(false);
  const [newPostCreated, setNewPostCreated] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [queryLoading, setQueryLoading] = useState(false);

  const [isFeedView, setIsFeedView] = useState(false); // Toggle between feed & gallery

  const { user } = useAuthStore(); // Get the logged-in user's info

  // Add this new state
  const [isGalleryView, setIsGalleryView] = useState(true);

  // Change toggleFeedView to this:
  const toggleFeedView = () => {
    setIsFeedView((prev) => !prev);
  };

  // Fetch all posts
  useEffect(() => {
    const fetchData = async () => {
      try {
        setQueryLoading(true);
        const data = await fetchGalleryPosts();
        setGalleryPosts(data);
      } catch (e) {
        setFetchError('Failed to fetch gallery posts.');
        handleFetchError(e);
      } finally {
        setQueryLoading(false);
      }
    };
    fetchData();
  }, [newPostCreated]);

  // Fetch following feed posts
  useEffect(() => {
    if (!user) return;
    const fetchFeed = async () => {
      try {
        setQueryLoading(true);
        const feedData = await fetchFollowingFeed(user);
        setFollowingFeedData(feedData);
      } catch (e) {
        setFetchError('Failed to fetch feed.');
        handleFetchError(e);
      } finally {
        setQueryLoading(false);
      }
    };
    fetchFeed();
  }, [user, newPostCreated]);

  const handleFetchError = (e) => {
    if (e.code === 401 || e.code === 403) {
      useAuthStore.getState().handleAuthError(e.code, e.message);
    } else {
      if (process.env.REACT_APP_APP_ENV === 'development') {
        console.error('Error fetching data:', e);
      }
      useAuthStore.getState().setError(e.code);
      toast.error(`Error: ${e.message}`, {
        theme: 'colored',
        draggable: true,
        toastId: 'queryContext-error',
        autoClose: false,
      });
    }
  };

  const searchQuery = (query || '').toLowerCase();

  const filteredData = (isFeedView ? followingFeedData : galleryPosts).filter((item) => {
    const itemTitle = item.title ? item.title.toLowerCase() : '';
    const itemArtist = item.display_name ? item.display_name.toLowerCase() : '';
    const itemDescription = item.description ? item.description.toLowerCase() : '';
    const itemCategory = item.category ? item.category.toLowerCase() : '';

    return (
      itemTitle.includes(searchQuery) ||
      itemArtist.includes(searchQuery) ||
      itemDescription.includes(searchQuery) ||
      itemCategory.includes(searchQuery)
    );
  });

  return (
    <QueryContext.Provider
      value={{
        query,
        error,
        setQuery,
        filteredData,
        setNewPostCreated,
        fetchError,
        setGalleryPosts,
        queryLoading,
        isFeedView,
        toggleFeedView,
        isGalleryView,
        setIsGalleryView,
      }}
    >
      {children}
    </QueryContext.Provider>
  );
};

const useQuery = () => {
  const context = useContext(QueryContext);
  if (context === undefined) {
    throw new Error('useQuery must be used within a QueryProvider');
  }
  return context;
};

export { QueryProvider, useQuery };
