import React from 'react';
import { Container, Link, Typography, Grid, Box, Paper, Button } from '@mui/material';
import { useAuthStore } from '../../../../stores/useAuthStore.js';
import venmo from '../../../../assets/Venmo_Logo_Blue.png';
export default function LandingPageInfo({ isMobile, handleSignInToSubscribe, handleStageChange, navigate }) {
  const { isAuthenticated } = useAuthStore();
  return (
    <Container
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: {
          xs: 2,
          sm: 3,
        },
        alignItems: 'flex-start',
        padding: '0px',
      }}
    >
      <Container sx={{ '&.MuiContainer-root': { padding: 0 } }}>
        <Paper sx={{ padding: '1.5rem 2rem', borderRadius: '15px' }}>
          <Typography variant="h4" gutterBottom sx={{ mt: 1 }}>
            Features
          </Typography>
          <Typography variant="h5" gutterBottom sx={{ mt: 3, textAlign: 'left' }}>
            Subscription Tiers
          </Typography>
          <Box sx={{ pl: 2, textAlign: 'left' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Basic Account (Free):
            </Typography>
            <Typography paragraph>Allows users to log in and out, manage a profile, and view galleries.</Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Paid Subscription:
            </Typography>
            <Box sx={{ pl: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 1 }}>
                Content Posting:
              </Typography>
              <Typography paragraph>Create gallery posts that contribute to the inventory list</Typography>

              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Inventory Management:
              </Typography>
              <Typography paragraph>View inventory snapshots and download CSV files</Typography>

              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Orders & Goals:
              </Typography>
              <Typography paragraph>
                Create/manage orders, track daily/monthly production quotas, and set goals
              </Typography>

              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Data Visualization:
              </Typography>
              <Typography paragraph>Access graphical and tabular data analysis for sales and production</Typography>
            </Box>
          </Box>
        </Paper>
      </Container>{' '}
      <Paper sx={{ padding: '15px 20px', mt: '0px' }}>
        <Typography variant="body1" textAlign="left" sx={{ letterSpacing: '.1rem' }}>
          Why subscribe? We designed this website to be a powerful tool for creators to help organize and run their
          businesses, so they can lighten the load of trying to keep track of everything so they can focus more on what
          matters: making art.
        </Typography>
      </Paper>
      {isMobile && (
        <Grid container sx={{ padding: '0px' }}>
          {' '}
          <Grid item xs={12} sx={{}}>
            <Box textAlign="center">
              {isAuthenticated ? (
                <Button
                  color="primary"
                  variant="contained"
                  onClick={handleStageChange}
                  sx={{ fontSize: '1.5rem', mt: '25px' }}
                >
                  Purchase a Subscription
                </Button>
              ) : (
                <Button color="primary" variant="contained" onClick={handleSignInToSubscribe}>
                  Sign-up to Subscribe
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>
      )}
      <Typography sx={{ textAlign: 'center', width: '100%' }}>
        Your subscription will be handled securely and directly through{' '}
        <Link href="https://stripe.com/" target="_blank" rel="noopener" sx={{ textDecoration: 'none' }}>
          Stripe
        </Link>
        .
      </Typography>
    </Container>
  );
}
