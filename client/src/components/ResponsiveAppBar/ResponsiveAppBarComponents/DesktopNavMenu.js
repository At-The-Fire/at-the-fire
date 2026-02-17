import { Box, ButtonBase, Typography, Button } from '@mui/material';
import React from 'react';
import useAppBar from '../../../hooks/useAppBar.js';
import { useAuthStore } from '../../../stores/useAuthStore.js';

const logo = require('../../../assets/logo-icon-6.png');

export default function DesktopNavMenu({ setAnchorElNav, setAnchorElUser, pages, type }) {
  const { isAuthenticated } = useAuthStore();
  const { handleLogoNavigation, handleCloseNavMenu } = useAppBar({
    setAnchorElNav,
    setAnchorElUser,
  });
  return (
    <>
      <Box sx={{ display: { xs: 'none', md: 'flex' }, mr: 1 }}>
        <ButtonBase onClick={handleLogoNavigation}>
          <img
            className="logo"
            width="640"
            height="360"
            src={logo}
            alt={'site logo'}
            style={{
              height: 'auto',
              objectFit: 'contain',
              maxWidth: '60px',
              borderRadius: '50%',
              scale: '1',
            }}
          />
        </ButtonBase>
      </Box>

      <ButtonBase onClick={handleLogoNavigation}>
        <Typography
          variant="h6"
          noWrap
          component="a"
          sx={{
            mr: 2,
            display: { xs: 'none', md: 'flex' },
            fontFamily: 'Reenie Beanie',
            fontWeight: 700,
            fontSize: '2.5rem',
            textShadow: '3px 3px 1px #000000',
            letterSpacing: '.3rem',
            color: (theme) => theme.palette.primary.light,
            textDecoration: 'none',
          }}
        >
          At The Fire
        </Typography>
      </ButtonBase>

      <Box
        sx={{
          flexGrow: 1,
          display: { xs: 'none', md: 'flex' },
          justifyContent: !isAuthenticated ? 'flex-end' : 'flex-start',
        }}
      >
        {pages.map((page) => {
          switch (isAuthenticated) {
            case true:
              if (page === 'Sign Up' || page === 'Sign In') return null;
              break;
            case false:
              if (
                !isAuthenticated &&
                ((page === 'Sign Up' && type === 'sign-up') || (page === 'Sign In' && type === 'sign-in'))
              ) {
                return null;
              }
              break;
            default:
              break;
          }
          return (
            <Button
              key={page}
              onClick={handleCloseNavMenu}
              sx={{
                my: 2,
                color: 'white',
                display: 'block',
              }}
            >
              {page}
            </Button>
          );
        })}
      </Box>
    </>
  );
}
