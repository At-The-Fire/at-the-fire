import { Box, Button, Grid, Paper, Typography, useTheme } from '@mui/material';
import React from 'react';
import { Pie } from 'react-chartjs-2';

export default function PieChart({
  isMobile,
  isTablet,
  pieChartView,
  handlePieViewToggle,
  pieChartData,
  pieOptions,
  tableData,
}) {
  const theme = useTheme(); // This is needed to access the default theme

  return (
    <Grid item xs={12} md={6} lg={4} sx={{ margin: isMobile ? '5px 0px' : 'auto', '&.MuiGrid-item': { padding: 0 } }}>
      <Paper sx={{ p: 2, height: isTablet ? 300 : 550, display: 'flex', flexDirection: 'column', width: '100%' }}>
        {/* Title and Toggle Bar */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 'medium', color: theme.palette.text.primary }}>
            {pieChartView === 'category'
              ? 'Category Distribution (Most Recent)'
              : 'Price Range Distribution (Most Recent)'}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={handlePieViewToggle}
            sx={{
              fontSize: isMobile ? '0.7rem' : '0.8rem',
              py: 0.5,
              textTransform: 'none',
              borderRadius: 4,
            }}
          >
            View by {pieChartView === 'category' ? 'Price' : 'Category'}
          </Button>
        </Box>

        {/* Chart Area */}
        <Box sx={{ flex: 1, position: 'relative' }}>
          {Object.keys(tableData).length > 0 ? (
            <Pie data={pieChartData} options={pieOptions} />
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
