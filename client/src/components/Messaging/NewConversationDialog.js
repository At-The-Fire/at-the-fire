import { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Autocomplete } from '@mui/material';
import { useNotificationStore } from '../../stores/useNotificationStore.js';
import { searchUsers } from '../../services/fetch-users.js';

export default function NewConversationDialog({
  open,
  onClose,
  onStartConversation,
  followers = [],
  conversations,
  setMobileOpen,
}) {
  const { setActiveConversationId } = useNotificationStore();
  const setSelectedConversation = useNotificationStore((state) => state.setSelectedConversation);

  const [selectedUsers, setSelectedUsers] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const handleClose = () => {
    setSelectedUsers([]);
    onClose();
    setInputValue('');
    setSearchResults([]);
  };

  const handleSubmit = async () => {
    if (selectedUsers.length === 0) return;

    // Create unique identifiers for users based on name
    const selectedUserIds = selectedUsers.map((user) => `${user.firstName}-${user.lastName}`);

    const existingConversation = conversations.find((conversation) => {
      const participantIds = conversation.participants.map((p) => `${p.firstName}-${p.lastName}`);
      return participantIds.length === 2 && selectedUserIds.every((id) => participantIds.includes(id));
    });

    if (existingConversation) {
      setSelectedConversation(existingConversation);
      setActiveConversationId(existingConversation);
      setMobileOpen(false);
    } else {
      try {
        await onStartConversation(selectedUsers);
      } catch (error) {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          console.error('Error starting conversation:', error);
        }
      }
    }

    handleClose();
  };

  useEffect(() => {
    if (!inputValue) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const data = await searchUsers(inputValue);

        setSearchResults(Array.isArray(data) ? data : []);
      } catch (e) {
        if (process.env.REACT_APP_APP_ENV === 'development') {
          console.error('Error fetching search results:', e);
        }
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue]);

  // Filter out options without an id
  const options = (inputValue ? searchResults : followers || []).filter((option) => option?.id || option?.displayName);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionProps={{
        onExited: () => {
          if (document.activeElement?.blur) {
            document.activeElement.blur();
          }
        },
      }}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>New Conversation</DialogTitle>
      <DialogContent>
        <Autocomplete
          aria-hidden={false}
          multiple
          options={options}
          filterOptions={(opts) => opts}
          value={selectedUsers}
          onChange={(_, newValue) => setSelectedUsers(newValue)}
          onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          getOptionLabel={(option) => {
            const userName = `${option.firstName || ''} ${option.lastName || ''}`.trim();

            return option.displayName ? `${userName} (${option.displayName})` : userName;
          }}
          renderOption={(props, option) => {
            const { key, ...otherProps } = props;
            return (
              <li key={option.id} {...otherProps}>
                {option.displayName
                  ? `${option.firstName} ${option.lastName} (${option.displayName})`
                  : `${option.firstName} ${option.lastName}`}
              </li>
            );
          }}
          renderInput={(params) => (
            <TextField {...params} variant="outlined" label="Search users to message" fullWidth />
          )}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={selectedUsers.length === 0} variant="contained">
          Start Conversation
        </Button>
      </DialogActions>
    </Dialog>
  );
}
