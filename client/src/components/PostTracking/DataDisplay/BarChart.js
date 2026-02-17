import { Box, Grid, Paper, Typography } from '@mui/material';
import React from 'react';
import { Bar } from 'react-chartjs-2';

export default function BarChart({ isMobile, tableData, barChartData, barOptions }) {
  return (
    <Grid item xs={12}>
      <Paper
        sx={{
          p: 2,
          height: isMobile ? 350 : 400,
          display: 'flex',
          flexDirection: 'column',
          mt: 2,
        }}
      >
        <Typography
          variant="h6"
          align="center"
          sx={{
            mb: 2,
            fontSize: isMobile ? '1rem' : '1.25rem',
          }}
        >
          Category Breakdown Over Time
        </Typography>

        <Box sx={{ flex: 1, position: 'relative' }}>
          {Object.keys(tableData).length > 0 ? (
            <Bar
              data={barChartData}
              options={{
                ...barOptions,
                plugins: {
                  ...barOptions.plugins,
                  title: {
                    ...barOptions.plugins.title,
                    display: false, // Hide internal title since we're using Typography
                  },
                },
              }}
            />
          ) : (
            <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="body1">No data available</Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </Grid>
  );
}
