import { useState, useEffect, useRef } from 'react';
import { Box, Paper, Grid, CircularProgress, useMediaQuery, IconButton, Typography } from '@mui/material';
import { Badge } from '@mui/material';
import { ChatBubbleOutline as ChatIcon, Close as CloseIcon } from '@mui/icons-material';
import ConversationsList from './ConversationsList';
import MessageWindow from './MessageWindow';
import { useAuthStore } from '../../stores/useAuthStore.js';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../../stores/useNotificationStore.js';
import { useTheme } from '@emotion/react';
import { useParams } from 'react-router-dom';
import { createConversations, fetchConversations } from '../../services/fetch-conversations.js';
import { getUniqueFollowersAndFollowing } from '../../services/fetch-followers.js';
import { useConversations } from '../../hooks/useConversations.js';

export default function MessagingContainer() {
  const { setConversations, conversations, handleSendMessage, handleDeleteConversation } = useConversations();

  const { markConversationAsRead, fetchUnreadCount, unreadCount, setActiveConversationId, selectedConversation } =
    useNotificationStore();

  const setSelectedConversation = useNotificationStore((state) => state.setSelectedConversation);

  const [loading, setLoading] = useState();
  const [followers, setFollowers] = useState([]);
  const mobileOpen = useNotificationStore((state) => state.mobileOpen);
  const setMobileOpen = useNotificationStore((state) => state.setMobileOpen);

  const theme = useTheme();
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const BASE_URL = process.env.REACT_APP_BASE_URL;
  const navigate = useNavigate();

  const { isAuthenticated, error, user, authenticateUser, signingOut, checkTokenExpiry } = useAuthStore();
  // auth check
  useEffect(() => {
    if (!isAuthenticated && !error && !signingOut) {
      authenticateUser();
    } else if (isAuthenticated) {
      checkTokenExpiry();
    }
  }, [isAuthenticated, error, signingOut, authenticateUser, checkTokenExpiry]);
  // auth redirect
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth/sign-in');
      return;
    }
  }, [isAuthenticated, navigate, error]);

  const toggleMobileMenu = async () => {
    setMobileOpen(!mobileOpen);
    setSelectedConversation(null);
    setActiveConversationId(null);
    if (selectedConversation.last_message === null) {
      await handleDeleteConversation(selectedConversation.id);
      setConversations((prev) => prev.filter((conv) => conv.id !== selectedConversation.id));
      if (selectedConversation && selectedConversation.id === selectedConversation.id) {
        setSelectedConversation(null);
      }
    }
  };

  const onSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    setActiveConversationId(conversation.id);
    setMobileOpen(false);
  };

  const { sub } = useParams();

  const lastSubProcessedRef = useRef(null);

  useEffect(() => {
    if (!sub || lastSubProcessedRef.current === sub || loading) return;

    const handleSubParam = async () => {
      lastSubProcessedRef.current = sub;
      const existingConversation = conversations.find((convo) => convo.participants.some((p) => p.sub === sub));

      if (existingConversation) {
        setSelectedConversation(existingConversation);
        setActiveConversationId(existingConversation.id);
        setMobileOpen(false);
      } else {
        await handleStartConversation([{ sub }]);
      }
    };

    handleSubParam();
  }, [sub, loading, conversations, setActiveConversationId, setMobileOpen, setSelectedConversation]);

  // fetch unread once on mount- if websocket event is not during session
  useEffect(() => {
    fetchUnreadCount();
  }, []);

  // fetch conversations when unreadCount changes
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const data = await fetchConversations();

        // Filter out conversations that user created but hasn't sent first message
        const filteredData = data.filter(
          (conversation) =>
            conversation.last_message !== null ||
            (conversation.is_sender && conversation.last_message === null && !conversation.first_message_sent)
        );
        setConversations(filteredData);
      } catch (error) {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          console.error('Failed to load conversations:', error);
        }
      }
    };

    loadConversations();
  }, [BASE_URL, unreadCount, setConversations]);

  // Fetch followers
  useEffect(() => {
    if (!user) return;

    const getFollowers = async () => {
      try {
        const uniqueUsers = await getUniqueFollowersAndFollowing(user);
        setFollowers(uniqueUsers);
      } catch (e) {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          console.error('Failed to load followers:', e);
        }
      }
    };

    getFollowers();
  }, [user]);

  const handleStartConversation = async (participantSubs) => {
    const destucturedSubs = participantSubs.map((item) => item.sub);

    if (loading) return;

    try {
      setLoading(true);
      const currentConversations = await fetchConversations();

      // Check if conversation already exists in the LATEST data
      const existingConversation = currentConversations.find((convo) =>
        participantSubs.every((sub) => convo.participants.some((p) => p.sub === sub))
      );

      if (existingConversation) {
        // If it exists, just select it and update UI
        setConversations(currentConversations);
        onSelectConversation(existingConversation);
        if (sub) {
          navigate('/messages');
        }
        return;
      }

      // If we get here, we know we need to create a new conversation
      const newConvoData = await createConversations(destucturedSubs);

      // Fetch the latest conversations list to get the new conversation with its full data
      const data = await fetchConversations();
      const updatedConversations = data;

      // Find our new conversation in the updated list
      const newConversation = updatedConversations.find((conv) => conv.id === newConvoData.conversationId);

      if (!newConversation) throw new Error('New conversation not found in updated list');

      setConversations(updatedConversations);
      onSelectConversation(newConversation);

      if (sub) {
        navigate('/messages');
      }
    } catch (error) {
      if (process.env.REACT_APP_APP_ENV === 'development') {
        console.error('Error in handleStartConversation:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversation = async (conversation) => {
    //! not sure why this is here yet...2/18/25... if this is still here in a week or 2 axe it
    // if (sub) {
    //   navigate('/messages');
    // }

    onSelectConversation(conversation);
    try {
      await markConversationAsRead(conversation.id);
      await fetchUnreadCount();

      setConversations((prev) =>
        prev.map((conv) => (conv.id === conversation.id ? { ...conv, unread_count: 0 } : conv))
      );
    } catch (error) {
      if (process.env.REACT_APP_APP_ENV === 'development') {
        console.error('Error updating unread state:', error);
      }
    }
  };

  return (
    // <Box sx={{ height: 'calc(100dvh)' }}> //! just leaving JUST IN CASE this was a major fix...
    <Box sx={{ height: '100dvh' }}>
      <Paper elevation={3} sx={{ height: '100%', position: 'relative' }}>
        <Grid container sx={{ height: '100%' }}>
          {/* Mobile Menu Button */}
          {isTablet && !mobileOpen && (
            <IconButton
              onClick={toggleMobileMenu}
              sx={{
                position: 'absolute',
                top: 75,
                left: 10,
                zIndex: 10,
                boxShadow: 1,
              }}
            >
              <Badge
                badgeContent={
                  unreadCount > 0 ? (
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {unreadCount}
                    </Typography>
                  ) : null
                }
                color="secondary"
                overlap="circular"
              >
                <ChatIcon
                  sx={{
                    color: unreadCount > 0 ? 'primary.main' : '',
                    filter: unreadCount > 0 ? 'drop-shadow(0px 0px 6px white)' : 'none',
                    transition: 'filter 0.3s ease-in-out',
                  }}
                />
              </Badge>
            </IconButton>
          )}

          {/* Conversations List - Sidebar */}
          <Grid
            item
            xs={12}
            sm={12}
            md={4}
            lg={3}
            sx={{
              borderRight: 1,
              borderColor: 'divider',
              display: isTablet ? (mobileOpen ? 'block' : 'none') : 'block',
              position: isTablet ? 'absolute' : 'relative',
              width: isTablet ? '100%' : 'auto',
              height: '100%',
              backgroundColor: (theme) => theme.palette.action.focus,
              zIndex: 100,
              boxShadow: isTablet ? 3 : 0,
            }}
          >
            {isTablet && selectedConversation && (
              <IconButton
                onClick={toggleMobileMenu}
                sx={{
                  position: 'absolute',
                  top: 80,
                  right: 10,
                  zIndex: 10,
                  color: 'lightgreen',
                  boxShadow: 1,
                }}
              >
                <CloseIcon />
              </IconButton>
            )}
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <ConversationsList
                conversations={conversations}
                setConversations={setConversations}
                selectedId={selectedConversation?.id}
                followers={followers}
                onStartConversation={handleStartConversation}
                onDeleteConversation={handleDeleteConversation}
                handleSelectConversation={handleSelectConversation}
                setSelectedConversation={setSelectedConversation}
                setMobileOpen={setMobileOpen}
                sub={sub}
              />
            )}
          </Grid>

          {/* Message Window */}
          <Grid
            item
            xs={isTablet ? 12 : 8}
            sx={{
              height: '100%',
              overflow: 'hidden',
            }}
          >
            {selectedConversation && !mobileOpen ? (
              <MessageWindow
                conversation={selectedConversation}
                onSendMessage={(content) => handleSendMessage(selectedConversation.id, content)}
              />
            ) : (
              !mobileOpen && (
                <Box
                  sx={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'text.secondary',
                  }}
                >
                  Select a conversation to start messaging
                </Box>
              )
            )}
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}
