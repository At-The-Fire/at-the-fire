import { Container, Typography, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import React from 'react';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

export default function PurchaseFormInfo() {
  return (
    <Container maxWidth="sm">
      <Typography variant="h4" gutterBottom>
        Upgrade to Premium
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
        Premium plans start with a <strong>60-day free trial</strong>.
      </Typography>
      <List sx={{ mb: 2 }}>
        <ListItem alignItems="flex-start">
          <ListItemIcon>
            <CheckCircleIcon color="success" />
          </ListItemIcon>
          <ListItemText
            primary={
              <span>
                <strong>Free stays free:</strong> Your gallery posting and snapshot workflow remain available without a
                Premium subscription.
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
                <strong>Premium unlocks the workspace:</strong> Orders, Products, Calendar, and Analysis are the paid
                tools you are upgrading into.
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
                <strong>Easy management:</strong> Update your billing info or subscription anytime in the{' '}
                <strong>Stripe Customer Portal</strong> from your <strong>Workspace &gt; Dashboard</strong>.
              </span>
            }
          />
        </ListItem>
      </List>
      <Typography variant="body2" sx={{ textAlign: 'center', color: 'gray' }}>
        Beta access remains free, and when billing begins you still receive the full 60-day trial before any charge.
      </Typography>
    </Container>
  );
}
