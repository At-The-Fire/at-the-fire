import React from 'react';
import useAppBar from '../../../hooks/useAppBar.js';
import { Avatar, Box, IconButton, Menu, MenuItem, Tooltip, Typography } from '@mui/material';
import useProfileStore from '../../../stores/useProfileStore.js';
import { useAuthStore } from '../../../stores/useAuthStore.js';
import { useNotificationStore } from '../../../stores/useNotificationStore.js';
import { useAuctionNotificationStore } from '../../../stores/useAuctionNotificationStore.js';
import { Badge } from '@mui/material';

export default function UserMenu({ anchorElUser, userMenuItems, setAnchorElNav, setAnchorElUser }) {
  const { isAuthenticated, email } = useAuthStore();
  const { profilePicture } = useProfileStore();

  const { handleOpenUserMenu, handleCloseUserMenu } = useAppBar({
    setAnchorElNav,
    setAnchorElUser,
  });
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const unreadWonCount = useAuctionNotificationStore((state) => state.unreadWonCount);
  const unreadOutbidCount = useAuctionNotificationStore((state) => state.unreadOutbidCount);
  const totalBadgeCount = unreadCount + unreadWonCount + unreadOutbidCount;
  // pendingShipmentsCount is embedded in the workspace string — detect by checking if it differs from plain 'Workspace'
  const isWorkspaceItemFn = (setting) => setting.startsWith('Workspace') && setting !== 'Workspace';

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
                  totalBadgeCount > 0 ? (
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {totalBadgeCount}
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
                    border: totalBadgeCount > 0 ? 'solid 2px green' : '',
                    boxShadow: totalBadgeCount > 0 ? '0 0 5px 1px white' : '',
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
            {userMenuItems.map((setting) => {
              const isMessageItem = unreadCount > 0 && setting === `Messages (${unreadCount})`;
              const isPurchasesItem = (unreadWonCount > 0 || unreadOutbidCount > 0) && setting === 'Purchases';
              const purchasesColor = unreadWonCount > 0 ? 'success.light' : 'warning.light';
              const isWorkspaceItem = isWorkspaceItemFn(setting);
              return (
                <MenuItem key={setting} value={setting} data-value={setting} onClick={(e) => handleCloseUserMenu(e)}>
                  <Typography
                    textAlign="center"
                    className={isMessageItem || isPurchasesItem || isWorkspaceItem ? 'shimmer' : ''}
                    sx={{
                      fontWeight: isMessageItem || isPurchasesItem || isWorkspaceItem ? 'bold' : '',
                      color: isMessageItem ? 'secondary.light' : isPurchasesItem ? purchasesColor : isWorkspaceItem ? 'warning.light' : '',
                      textShadow: isMessageItem || isPurchasesItem || isWorkspaceItem ? '0 0 1px black' : '',
                    }}
                  >
                    {setting}
                    {isPurchasesItem && unreadWonCount > 0 && (
                      <Typography
                        component="span"
                        sx={{ color: 'lightgreen', fontWeight: 'bold', marginLeft: '.5rem' }}
                      >
                        {unreadWonCount} won
                      </Typography>
                    )}
                    {isPurchasesItem && unreadOutbidCount > 0 && (
                      <Typography
                        component="span"
                        sx={{ color: 'orange', fontWeight: 'bold', marginLeft: '.5rem' }}
                      >
                        {unreadOutbidCount} outbid
                      </Typography>
                    )}
                  </Typography>
                  {unreadCount > 0 && setting === 'Messages' ? (
                    <Typography
                      variant="span"
                      sx={{
                        color: 'lightgreen',
                        fontWeight: 'bold',
                        marginLeft: '.5rem',
                      }}
                    >
                      ({unreadCount})
                    </Typography>
                  ) : (
                    ''
                  )}
                </MenuItem>
              );
            })}
          </Menu>
        </Box>
      ) : null}
    </>
  );
}
