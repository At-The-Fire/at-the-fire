import { Box, Button } from '@mui/material';
import React from 'react';

export default function SubscriptionButtons({ handleClickSubscribe }) {
  const monthlyPriceId = process.env.REACT_APP_TEST_MONTHLY || process.env.REACT_APP_LIVE_MONTHLY;
  const yearlyPriceId = process.env.REACT_APP_TEST_YEARLY || process.env.REACT_APP_LIVE_YEARLY;

  return (
    <Box
      className={'subscription-button-wrapper'}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: (theme) => theme.spacing(2),
      }}
    >
      <Button variant="contained" color="primary" value={monthlyPriceId} onClick={handleClickSubscribe}>
        Choose Monthly Subscription $15/mth
      </Button>
      <Button variant="contained" color="primary" value={yearlyPriceId} onClick={handleClickSubscribe}>
        Choose Yearly Subscription $150/yr
      </Button>
    </Box>
  );
}
