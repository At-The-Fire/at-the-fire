import { useState } from 'react';
import { ListItemText, ListItemAvatar, Avatar, Typography, Divider, Box, Button } from '@mui/material';
import { ListItemButton } from '@mui/material';
import AvatarGroup from '@mui/material/AvatarGroup';
import AddIcon from '@mui/icons-material/Add';
import NewConversationDialog from './NewConversationDialog';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '../../stores/useAuthStore.js';
import { useNavigate } from 'react-router-dom';
import { deleteMessage } from '../../services/fetch-conversations.js';
import { useNotificationStore } from '../../stores/useNotificationStore.js';

export default function ConversationsList({
  conversations,
  setConversations,
  selectedId,
  followers,
  onStartConversation,
  onDeleteConversation,
  handleSelectConversation,
  setMobileOpen,
  sub,
}) {
  const setSelectedConversation = useNotificationStore((state) => state.setSelectedConversation);
  const { selectedConversation, decrementUnreadCount } = useNotificationStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const deleteConversation = async (conversationId) => {
    try {
      const conv = conversations.find((c) => c.id === conversationId);
      await deleteMessage(conversationId);
      setConversations((prev) => prev.filter((conv) => conv.id !== conversationId));
      if (selectedConversation && selectedConversation.id === conversationId) {
        setSelectedConversation(null);
      }
      if (conv && conv.unread_count > 0) {
        decrementUnreadCount(conv.unread_count);
      }
      onDeleteConversation(conversationId);
    } catch (error) {
      if (process.env.REACT_APP_APP_ENV === 'development') {
        console.error(error);
      }
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', marginTop: '70px' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setIsDialogOpen(true)}>
          New Message
        </Button>
      </Box>

      {conversations.map((conversation) => {
        const allNames =
          conversation.participants
            ?.filter((p) => p.sub !== user)
            ?.map(
              (p) =>
                p.displayName ||
                `${p.displayName || p.firstName || p.username?.split('@')[0] || `User ${p.sub.slice(-4)}`}`.trim()
            )
            .join(', ') || '';

        const isSelected = selectedId === conversation.id;
        const hasUnread = conversation.unread_count > 0;

        let backgroundColor = 'inherit';

        if (isSelected) {
          backgroundColor = 'action.selected';
        } else if (hasUnread) {
          backgroundColor = 'primary.dark';
        }

        return (
          <Box
            key={conversation.id || conversation.participants.map((p) => p.sub).join('-')}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <ListItemButton
              selected={selectedId === conversation.id}
              onClick={() => {
                if (sub) {
                  navigate('/messages');
                }
                handleSelectConversation(conversation);
              }}
              sx={{
                '&:hover': { backgroundColor: 'action.hover' },
                fontWeight: conversation.unread_count > 0 ? 'bold' : 'normal',
                backgroundColor,
                padding: 0,
              }}
            >
              <ListItemAvatar>
                <AvatarGroup
                  max={3}
                  sx={{
                    '& .MuiAvatar-root': {
                      marginLeft: '-15px',
                      border: conversation.unread_count > 0 ? '3px solid green' : '',
                    },
                  }}
                >
                  {conversation.participants && conversation.participants.length > 0 ? (
                    conversation.participants
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
                      })
                  ) : (
                    <Avatar />
                  )}
                </AvatarGroup>
              </ListItemAvatar>

              <ListItemText
                sx={{ marginLeft: '.5rem' }}
                primary={
                  <Box
                    sx={{
                      fontWeight: conversation.unread_count > 0 ? 'bold' : '',
                      flexWrap: 'nowrap',
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingRight: '8px',
                    }}
                  >
                    {allNames}{' '}
                    {conversation.unread_count > 0 && (
                      <Typography component="span" sx={{ ml: 1, color: 'info.main', fontWeight: 'bold' }}>
                        • {conversation.unread_count} new
                      </Typography>
                    )}
                  </Box>
                }
                secondary={
                  conversation.last_message && (
                    <>
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.primary"
                        noWrap
                        sx={{
                          fontWeight: conversation.unread_count > 0 ? 'bold' : 'normal',
                        }}
                      >
                        {`${conversation.last_message.content.slice(0, 20)}...`}
                      </Typography>{' '}
                      <Typography component="span" variant="caption" color="text.secondary">
                        {formatDistanceToNow(new Date(conversation.last_message.created_at + 'Z'), {
                          addSuffix: true,
                        })}
                      </Typography>
                    </>
                  )
                }
              />
            </ListItemButton>

            <Button
              // variant="outlined"
              onClick={(e) => {
                e.stopPropagation(); // Prevents conversation selection on delete click
                deleteConversation(conversation.id);
              }}
              sx={{
                minWidth: '75px',
                '&.MuiButtonBase-root': {
                  color: 'primary.light',
                  fontWeight: '500',
                  fontSize: '1rem',
                  textShadow: '0 0 5px black',
                },
              }}
            >
              Delete
            </Button>

            <Divider />
          </Box>
        );
      })}

      <NewConversationDialog
        open={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
        }}
        onStartConversation={onStartConversation}
        followers={followers}
        conversations={conversations}
        setSelectedConversation={setSelectedConversation}
        setMobileOpen={setMobileOpen}
      />
    </Box>
  );
}
