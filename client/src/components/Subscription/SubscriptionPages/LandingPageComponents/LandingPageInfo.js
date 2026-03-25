import React from 'react';
import { Container, Link, Typography, Grid, Box, Paper, Button } from '@mui/material';
import { useAuthStore } from '../../../../stores/useAuthStore.js';
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
            Plans at a glance
          </Typography>
          <Typography variant="h5" gutterBottom sx={{ mt: 3, textAlign: 'left' }}>
            Free vs Premium
          </Typography>
          <Box sx={{ pl: 2, textAlign: 'left' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Free Account:
            </Typography>
            <Typography paragraph>
              Create your profile, publish gallery posts, build inventory snapshots, follow artists, message, browse
              auctions, and use the marketplace-facing side of the platform.
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Premium Subscription:
            </Typography>
            <Box sx={{ pl: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 1 }}>
                Orders:
              </Typography>
              <Typography paragraph>
                Manage order status, customer handoff, and fulfillment workflow in one place
              </Typography>

              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Products:
              </Typography>
              <Typography paragraph>Organize products, pricing, inventory state, and snapshot history</Typography>

              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Calendar:
              </Typography>
              <Typography paragraph>
                See production pace and sales activity over time with a clearer scheduling view
              </Typography>

              <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                Analysis:
              </Typography>
              <Typography paragraph>
                Review trends, totals, and performance data that help you make better selling decisions
              </Typography>
            </Box>
          </Box>
        </Paper>
      </Container>{' '}
      <Paper sx={{ padding: '15px 20px', mt: '0px' }}>
        <Typography variant="body1" textAlign="left" sx={{ letterSpacing: '.1rem' }}>
          Premium is not the price of entry anymore. It is the upgrade for sellers who need the full workspace after
          they have already started posting, tracking, and building an audience for free.
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
                  Upgrade to Premium
                </Button>
              ) : (
                <Button color="primary" variant="contained" onClick={handleSignInToSubscribe}>
                  Create Account to Upgrade
                </Button>
              )}
            </Box>
          </Grid>
        </Grid>
      )}
      <Typography sx={{ textAlign: 'center', width: '100%' }}>
        Premium billing is handled securely through{' '}
        <Link href="https://stripe.com/" target="_blank" rel="noopener" sx={{ textDecoration: 'none' }}>
          Stripe
        </Link>
        .
      </Typography>
    </Container>
  );
}
