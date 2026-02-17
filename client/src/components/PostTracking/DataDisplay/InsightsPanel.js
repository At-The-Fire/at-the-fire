import { Box, Divider, Grid, LinearProgress, Paper, Tooltip, Typography, useTheme } from '@mui/material';
import React from 'react';
import TimelineIcon from '@mui/icons-material/Timeline';
import CategoryIcon from '@mui/icons-material/Category';

export default function InsightsPanel({ isMobile, catalogInsights, tableData, getTrendColor }) {
  const theme = useTheme(); // This is needed to access the default theme

  const getTextColor = ({ catalogInsights, type }) => {
    let percentChange;

    if (type === 'recent') {
      percentChange = catalogInsights.catalogGrowth.recent.percentChange;
    } else if (type === 'overall') {
      percentChange = catalogInsights.catalogGrowth.overall.percentChange;
    }

    if (percentChange > 0) {
      return 'success.main';
    } else if (percentChange < 0) {
      return 'success.error';
    } else {
      return 'text.primary';
    }
  };

  return (
    <Grid item xs={12} md={6} lg={4}>
      <Paper
        sx={{
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '4px solid',
          borderColor: theme.palette.primary.main,
        }}
      >
        <Typography variant="h6" gutterBottom sx={{ fontSize: isMobile ? '1rem' : '1.25rem' }}>
          Catalog Insights
        </Typography>

        {Object.keys(tableData).length === 0 ? (
          <Box sx={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No snapshot data available
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Catalog Summary Stats */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Total Value
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  ${catalogInsights.latestTotal.toLocaleString()}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Categories
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {catalogInsights.categoryCount}
                </Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Tracking Period
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {catalogInsights.timespan} days
                </Typography>
              </Box>
            </Box>

            <Divider />

            {/* Overall Growth - Only show if we have more than one date */}
            {catalogInsights.timespan > 0 && (
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TimelineIcon color="primary" fontSize="small" />
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    Catalog Growth
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Overall Growth
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 'medium',
                      color: getTextColor({ catalogInsights, type: 'overall' }),
                    }}
                  >
                    {catalogInsights.catalogGrowth.overall.percentChange > 0 ? '+' : ''}
                    {catalogInsights.catalogGrowth.overall.percentChange.toFixed(1)}%
                  </Typography>
                </Box>

                {catalogInsights.catalogGrowth.recent.percentChange !== 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">
                      Recent Change
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 'medium',
                        color: getTextColor({ catalogInsights, type: 'recent' }),
                      }}
                    >
                      {catalogInsights.catalogGrowth.recent.percentChange > 0 ? '+' : ''}
                      {catalogInsights.catalogGrowth.recent.percentChange.toFixed(1)}%
                    </Typography>
                  </Box>
                )}

                {/* New categories since tracking began */}
                {catalogInsights.categoriesAdded > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      New Categories Added
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'success.main' }}>
                      +{catalogInsights.categoriesAdded}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            {/* Category Diversity */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CategoryIcon color="primary" fontSize="small" />
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    Category Distribution
                  </Typography>
                </Box>

                <Tooltip title="Higher score means more evenly distributed categories" arrow>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      Diversity:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      {catalogInsights.diversityScore}/100
                    </Typography>
                  </Box>
                </Tooltip>
              </Box>

              <LinearProgress
                variant="determinate"
                value={catalogInsights.diversityScore}
                sx={{
                  my: 1,
                  height: 8,
                  borderRadius: 1,
                  backgroundColor: 'rgba(0, 0, 0, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: theme.palette.primary.main,
                  },
                }}
              />

              {/* Top Categories */}
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Top Categories
              </Typography>

              {catalogInsights.categoryInsights.slice(0, 4).map((catInsight, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    py: 0.5,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: index === 0 ? 'bold' : 'medium',
                      maxWidth: '60%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {catInsight.category}
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2">{catInsight.percentOfTotal.toFixed(1)}%</Typography>

                    {catInsight.growthTrend !== 'neutral' && (
                      <Typography variant="caption" sx={{ color: getTrendColor(catInsight.growthTrend) }}>
                        {catInsight.growthTrend === 'new'
                          ? 'NEW'
                          : `${catInsight.growth > 0 ? '+' : ''}${catInsight.growth.toFixed(0)}%`}
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}

              {catalogInsights.categoryInsights.length > 4 && (
                <Typography variant="caption" color="text.secondary" align="center" sx={{ display: 'block', mt: 1 }}>
                  +{catalogInsights.categoryInsights.length - 4} more categories
                </Typography>
              )}
            </Box>

            {/* Timestamp */}
            <Typography variant="caption" color="text.secondary" sx={{ mt: 'auto', textAlign: 'center' }}>
              Based on data from {new Date(catalogInsights.latestDate).toLocaleDateString()}
              {catalogInsights.timespan > 0 &&
                ` (tracking since ${new Date(catalogInsights.earliestDate).toLocaleDateString()})`}
            </Typography>
          </Box>
        )}
      </Paper>
    </Grid>
  );
}
