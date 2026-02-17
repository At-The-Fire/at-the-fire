import { useState, useEffect, useRef } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Paper,
  Typography,
  CircularProgress,
  ListItemAvatar,
  AvatarGroup,
  Avatar,
  ButtonBase,
  Grid,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '../../stores/useAuthStore.js';
import { useNotificationStore } from '../../stores/useNotificationStore.js';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { fetchMessagesForConversation } from '../../services/fetch-conversations.js';
import { useNavigate } from 'react-router-dom';

export default function MessageWindow({ conversation, onSendMessage }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef(null);

  const { user } = useAuthStore();
  const { markConversationAsRead } = useNotificationStore();
  const { unreadCount } = useNotificationStore();
  const newMessageTrigger = useNotificationStore((state) => state.newMessageTrigger);

  // Ref for your input
  const inputRef = useRef(null);

  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  };

  useEffect(() => {
    if (!conversation || !conversation.id) return;

    const fetchMarkAsRead = async () => {
      await markConversationAsRead(conversation.id);
    };

    fetchMarkAsRead();
  }, [conversation, unreadCount]);

  // snap to bottom of conversation on open
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const otherParticipants = conversation.participants.filter((p) => p.sub !== user);
  {
    otherParticipants.map((p) => `${p.firstName} ${p.lastName}`.trim()).join(', ');
  }
  const filteredParticipants =
    otherParticipants
      .map((p) => p.displayName || p.firstName || p.username?.split('@')[0] || `User ${p.sub.slice(-4)}`)
      .join(', ') || '';

  // 1) Load messages on mount/ID change
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (!conversation?.id) return;

    if (isInitialMount.current) {
      setLoading(true);
      isInitialMount.current = false;
    }

    fetchMessagesForConversation(conversation.id).then((data) => {
      setMessages(data);

      setLoading(false);
    });
  }, [conversation?.id, unreadCount, newMessageTrigger]);

  // Scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 2) Send message, then re-fetch
  async function handleSend(e) {
    e.preventDefault();
    if (!newMessage.trim()) return;

    // Create optimistic message
    const optimisticMessage = {
      id: `temp-${Date.now()}`, // temporary ID
      content: newMessage,
      created_at: new Date().toISOString(),
      sender: { sub: user }, // assuming this matches your message shape
    };

    // Add to messages immediately
    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage('');

    try {
      await onSendMessage(newMessage);
      setNewMessage('');

      setTimeout(() => {
        inputRef.current?.querySelector('input, textarea')?.focus();
      }, 50);

      const updatedMessages = await fetchMessagesForConversation(conversation.id);
      setMessages(updatedMessages);
    } catch (err) {
      if (process.env.REACT_APP_APP_ENV === 'development') {
        console.error('Error sending message:', err);
      }
    }
  }
  inputRef?.current?.querySelector('input, textarea')?.focus();

  const handleMessage = (value) => {
    if (value.length <= 400) {
      setNewMessage(value);
    } else {
      toast.warn('Limit of 400 characters', {
        theme: 'colored',
        draggable: true,
        draggablePercent: 60,
        toastId: 'confirmPass-1',
        autoClose: true,
      });
    }
  };

  const handleNavigateProfile = async () => {
    if (conversation.participants.length > 2) return;

    const otherParticipant = conversation.participants?.find((p) => p.sub !== user);
    if (otherParticipant) {
      navigate(`/profile/${otherParticipant.sub}`);
    }
  };

  useEffect(() => {
    if (conversation?.id) {
      // Small delay to ensure component is fully mounted
      setTimeout(() => {
        inputRef.current?.querySelector('input, textarea')?.focus();
      }, 100);
    }
  }, [conversation?.id]);

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        borderRight: '1px solid ',
        borderColor: 'divider',
        flexGrow: 1,
      }}
    >
      <Box>
        <Box
          sx={{
            display: 'block',
            minHeight: '70px',
            backgroundColor: 'background.paper',
          }}
        ></Box>

        <Grid sx={{ display: 'grid', gridTemplateColumns: '50px 1fr', gridTemplateRows: '1fr' }}>
          <Box sx={{ backgroundColor: 'background.paper' }}></Box>
          <Box
            sx={{
              zIndex: 1,
              backgroundColor: 'background.paper',
              borderBottom: '1px solid',
              borderColor: 'divider',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '65px',
              gridColumnStart: 2,
            }}
          >
            {conversation.participants.length === 2 ? (
              <ButtonBase
                onClick={handleNavigateProfile}
                sx={{
                  padding: '0 15px',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                  '&:active': {
                    backgroundColor: 'primary.dark',
                  },
                }}
              >
                <ListItemAvatar sx={{ margin: '-5px 15px ' }}>
                  <AvatarGroup
                    max={3}
                    sx={{
                      '& .MuiAvatar-root': {
                        border: conversation.unread_count > 0 ? '3px solid green' : '',
                      },
                    }}
                  >
                    {conversation.participants
                      .filter((p) => p.sub !== user)
                      .map((p, idx) => {
                        const firstInitial = p.firstName ? p.firstName[0].toUpperCase() : '';
                        const lastInitial = p.lastName ? p.lastName[0].toUpperCase() : '';
                        const initial = firstInitial || lastInitial;

                        return (
                          <Avatar
                            key={idx}
                            src={p.logoImage || p.userAvatar}
                            sx={{
                              boxShadow: conversation.unread_count > 0 ? '0 0 5px 1px white' : '',
                            }}
                          >
                            {initial}
                          </Avatar>
                        );
                      })}
                  </AvatarGroup>
                </ListItemAvatar>
                <Typography>{filteredParticipants}</Typography>
              </ButtonBase>
            ) : (
              <>
                <ListItemAvatar sx={{ margin: '-5px 15px ' }}>
                  <AvatarGroup
                    max={3}
                    sx={{
                      '& .MuiAvatar-root': {
                        border: conversation.unread_count > 0 ? '3px solid green' : '',
                      },
                    }}
                  >
                    {conversation.participants
                      .filter((p) => p.sub !== user)
                      .map((p, idx) => {
                        const firstInitial = p.firstName ? p.firstName[0].toUpperCase() : '';
                        const lastInitial = p.lastName ? p.lastName[0].toUpperCase() : '';
                        const initial = firstInitial || lastInitial;

                        return (
                          <Avatar
                            key={idx}
                            src={p.logoImage || p.userAvatar}
                            sx={{
                              boxShadow: conversation.unread_count > 0 ? '0 0 5px 1px white' : '',
                            }}
                          >
                            {initial}
                          </Avatar>
                        );
                      })}
                  </AvatarGroup>
                </ListItemAvatar>
                <Typography variant="h6">{filteredParticipants}</Typography>
              </>
            )}
          </Box>
        </Grid>
      </Box>
      <Box
        sx={{
          overflowY: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          messages.map((message) => (
            <Box
              key={message.id}
              sx={{
                alignSelf: message.sender.sub === user ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                marginTop: '25px',
                borderRadius: '150px',
              }}
            >
              <Paper
                elevation={1}
                sx={{
                  p: 1,
                  backgroundColor: message.sender.sub === user ? 'primary.dark' : 'secondary.main',
                  borderRadius: '10px',
                }}
              >
                <Typography variant="body1" sx={{ textAlign: 'left' }}>
                  {message.content}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {formatDistanceToNow(new Date(message.created_at), {
                    addSuffix: true,
                  })}
                </Typography>
              </Paper>
            </Box>
          ))
        )}
        <div ref={messagesEndRef} />
      </Box>

      <Box
        component="form"
        onSubmit={handleSend}
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          gap: 1,
          backgroundColor: 'background.paper',
          position: 'sticky',
          bottom: 0,
        }}
      >
        <TextField
          inputRef={inputRef}
          multiline
          autoFocus
          maxRows={8}
          fullWidth
          variant="outlined"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => handleMessage(e.target.value)}
          size="small"
          // onBlur={() => {
          //   // Add this if you want auto-dismiss when tapping away
          //   inputRef.current?.blur();
          // }}
        />
        <IconButton color="primary" type="submit" disabled={!newMessage.trim()} sx={{ marginRight: '20px' }}>
          <SendIcon />
        </IconButton>
      </Box>
    </Box>
  );
}
