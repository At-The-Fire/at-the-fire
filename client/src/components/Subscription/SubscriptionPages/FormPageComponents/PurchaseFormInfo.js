import { Container, Typography, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import React from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function PurchaseFormInfo() {
  return (
    <Container maxWidth="sm">
      <Typography variant="h4" gutterBottom>
        Purchase Subscription
      </Typography>
      <Typography
        variant="body1"
        sx={{
          textAlign: 'center',
          mb: 2,
          backgroundColor: 'transparent',
          border: '1px solid green',
          fontWeight: '900',
          fontSize: '1.2rem',
          padding: '0.5rem',
          borderRadius: '0.5rem',
          width: '100%',
          margin: '0 auto 1rem auto',
          color: 'white',
        }}
      >
        All new signups receive a <strong>60-day free trial</strong>!
      </Typography>
      <List sx={{ mb: 2 }}>
        <ListItem alignItems="flex-start">
          <ListItemIcon>
            <CheckCircleIcon color="success" />
          </ListItemIcon>
          <ListItemText
            primary={
              <span>
                <strong>First in line:</strong> Beta users get early access to new features and updates.
              </span>
            }
          />
        </ListItem>
        <ListItem alignItems="flex-start">
          <ListItemIcon>
            <CheckCircleIcon color="success" />
          </ListItemIcon>
          <ListItemText
            primary={
              <span>
                <strong>No charge during Beta:</strong> Beta testers will not be charged while we are in beta. When beta
                ends, you will still get your full 60-day free trial before any charges.
              </span>
            }
          />
        </ListItem>
        <ListItem alignItems="flex-start">
          <ListItemIcon>
            <CheckCircleIcon color="success" />
          </ListItemIcon>
          <ListItemText
            primary={
              <span>
                <strong>Easy management:</strong> Update your info or subscription anytime in the{' '}
                <strong>Stripe Customer Portal</strong> from your <strong>Workspace &gt; Dashboard</strong>.
              </span>
            }
          />
        </ListItem>
      </List>
      <Typography variant="body2" sx={{ textAlign: 'center', color: 'gray' }}>
        You&apos;ll be notified before any charges occur when your free trial ends.
      </Typography>
    </Container>
  );
}
