import React from 'react';
import useAppBar from '../../../hooks/useAppBar.js';
import { Avatar, Box, IconButton, Menu, MenuItem, Tooltip, Typography } from '@mui/material';
import useProfileStore from '../../../stores/useProfileStore.js';
import { useAuthStore } from '../../../stores/useAuthStore.js';
import { useNotificationStore } from '../../../stores/useNotificationStore.js';
import { Badge } from '@mui/material';

export default function UserMenu({ anchorElUser, userMenuItems, setAnchorElNav, setAnchorElUser }) {
  const { isAuthenticated, email } = useAuthStore();
  const { profilePicture } = useProfileStore();

  const { handleOpenUserMenu, handleCloseUserMenu } = useAppBar({
    setAnchorElNav,
    setAnchorElUser,
  });
  const unreadCount = useNotificationStore((state) => state.unreadCount);

  return (
    <>
      {isAuthenticated ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            width: '40px',
          }}
        >
          <Tooltip title="Open settings">
            <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
              {' '}
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
                <Avatar
                  alt={email.toUpperCase()}
                  src={`${profilePicture}`}
                  sx={{
                    border: unreadCount > 0 ? 'solid 2px green' : '',
                    boxShadow: unreadCount > 0 ? '0 0 5px 1px white' : '',
                  }}
                />
              </Badge>
            </IconButton>
          </Tooltip>
          <Menu
            disableScrollLock={true}
            id="user-appbar"
            anchorEl={anchorElUser}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            open={Boolean(anchorElUser)}
            onClose={handleCloseUserMenu}
          >
            {userMenuItems.map((setting) => (
              <MenuItem key={setting} value={setting} onClick={(e) => handleCloseUserMenu(e)}>
                <Typography
                  textAlign="center"
                  className={unreadCount > 0 && setting === `Messages (${unreadCount})` ? 'shimmer' : ''}
                  sx={{
                    fontWeight: unreadCount > 0 && setting === `Messages (${unreadCount})` ? 'bold' : '',
                    color: unreadCount > 0 && setting === `Messages (${unreadCount})` ? 'secondary.light' : '',
                    textShadow: unreadCount > 0 && setting === `Messages (${unreadCount})` ? '0 0 1px black' : '',
                  }}
                >
                  {setting}
                </Typography>
                {unreadCount > 0 && setting === 'Messages' ? (
                  <Typography
                    variant="span"
                    sx={{
                      color: unreadCount > 0 && setting === 'Messages' ? 'lightgreen' : '',
                      fontWeight: unreadCount > 0 && setting === 'Messages' ? 'bold' : '',
                      marginLeft: '.5rem',
                    }}
                  >
                    ({unreadCount})
                  </Typography>
                ) : (
                  ''
                )}
              </MenuItem>
            ))}
          </Menu>
        </Box>
      ) : null}
    </>
  );
}
