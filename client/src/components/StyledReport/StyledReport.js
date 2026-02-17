import React from 'react';
import { Box, Paper, Typography, Divider, Grid, useTheme, useMediaQuery } from '@mui/material';

const StyledReport = ({ title, sections }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        maxWidth: '1200px',
        margin: '0 auto',
        backgroundColor: theme.palette.background.paper,
      }}
    >
      {/* Report Title */}
      <Typography
        variant="h4"
        component="h1"
        sx={{
          color: theme.palette.primary.main,
          fontWeight: 'bold',
          textAlign: 'center',
          mb: 2,
          fontSize: isMobile ? '1.5rem' : '2rem',
        }}
      >
        {title}
      </Typography>

      {/* Report Sections */}
      {sections.map((section, index) => (
        <Box
          key={index}
          sx={{
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          {/* Section Header */}
          <Box
            sx={{
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              p: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontSize: isMobile ? '1.1rem' : '1.25rem',
                fontWeight: 'bold',
              }}
            >
              {section.title}
            </Typography>
          </Box>

          {/* Section Content */}
          <Box sx={{ p: 2 }}>
            {typeof section.content === 'string' ? (
              <Typography
                variant="body1"
                sx={{
                  whiteSpace: 'pre-wrap',
                  fontSize: isMobile ? '0.9rem' : '1rem',
                  lineHeight: 1.6,
                  textAlign: 'left',
                }}
              >
                {section.content}
              </Typography>
            ) : (
              <Grid container spacing={2}>
                {section.content}
              </Grid>
            )}
          </Box>
        </Box>
      ))}
    </Paper>
  );
};

export default StyledReport;
