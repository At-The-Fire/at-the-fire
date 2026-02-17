import { Box, ButtonBase, IconButton, Menu, MenuItem, Typography } from '@mui/material';
import React from 'react';
import MenuIcon from '@mui/icons-material/Menu';
import useAppBar from '../../../hooks/useAppBar.js';
import { useAuthStore } from '../../../stores/useAuthStore.js';

const logo = require('../../../assets/logo-icon-6.png');

export default function MobileNavMenu({
  anchorElNav,
  pages,
  type,
  setAnchorElNav,
  setAnchorElUser,
}) {
  const { isAuthenticated } = useAuthStore();
  const { handleOpenNavMenu, handleCloseNavMenu, handleLogoNavigation } = useAppBar({
    setAnchorElNav,
    setAnchorElUser,
  });
  return (
    <>
      <Box
        sx={{
          flexGrow: 1,
          display: { xs: 'flex', md: 'none' },
        }}
      >
        <ButtonBase onClick={handleLogoNavigation}>
          <img
            src={logo}
            width="640"
            height="360"
            alt={'site logo'}
            style={{
              height: 'auto',
              objectFit: 'contain',
              maxWidth: '60px',
              borderRadius: '50%',
              scale: '.9',
            }}
          />
        </ButtonBase>
        <IconButton
          size="large"
          aria-label="account of current user"
          aria-controls="menu-appbar"
          aria-haspopup="true"
          onClick={handleOpenNavMenu}
          color="inherit"
        >
          <MenuIcon />
        </IconButton>
        <Menu
          disableScrollLock={true}
          id="menu-appbar"
          anchorEl={anchorElNav}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          keepMounted
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          open={Boolean(anchorElNav)}
          onClose={handleCloseNavMenu}
          sx={{
            display: { xs: 'block', md: 'none' },
          }}
        >
          {pages.map((page) => {
            if (isAuthenticated && (page === 'Sign Up' || page === 'Sign In')) {
              return null;
            }
            if (
              !isAuthenticated &&
              ((page === 'Sign Up' && type === 'sign-up') ||
                (page === 'Sign In' && type === 'sign-in'))
            ) {
              return null;
            }
            return (
              <MenuItem key={page} onClick={handleCloseNavMenu}>
                <Typography textAlign="center">{page}</Typography>
              </MenuItem>
            );
          })}
        </Menu>
      </Box>
      <Box
        sx={{
          justifyContent: 'center',
          display: { xs: 'flex', md: 'none' },
        }}
      ></Box>

      <ButtonBase
        disableRipple
        disableTouchRipple
        onClick={handleLogoNavigation}
        sx={{
          display: { xs: 'flex', md: 'none' },
          width: 'fit-content',
        }}
      >
        <Typography
          variant="h5"
          noWrap
          sx={{
            display: { xs: 'flex', md: 'none' },
            fontFamily: 'monospace',
            width: 'fit-content',
            fontWeight: 700,
            letterSpacing: '.3rem',
            color: 'inherit',
            textDecoration: 'none',
          }}
        ></Typography>
      </ButtonBase>
      {isAuthenticated ? (
        ''
      ) : (
        <Box
          sx={{
            width: '40px',
            flexGrow: 1,
            display: { xs: 'flex', md: 'none' },
          }}
        ></Box>
      )}
    </>
  );
}
