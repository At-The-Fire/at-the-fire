// UserGallery.js
import React from 'react';
import { Box, Container, Grid, List } from '@mui/material';
import GalleryCard from './GalleryCard.js';

const UserGallery = ({ data }) => {
  if (!data) {
    return <div>Loading gallery...</div>;
  }

  return (
    <Box className={'gallery-wrapper'}>
      <Container
        maxWidth="xl"
        className={'gallery-container'}
        sx={{ '&.MuiContainer-root ': { paddingLeft: '0px', paddingRight: '0px' } }}
      >
        <List
          sx={{
            width: '100%',
            position: 'relative',
            overflow: 'auto',
            padding: '0 8px',
          }}
        >
          <Grid container spacing={1}>
            {data.map((item) => (
              <GalleryCard key={item.id} {...{ item }} />
            ))}
          </Grid>
        </List>
      </Container>
    </Box>
  );
};

export default UserGallery;
