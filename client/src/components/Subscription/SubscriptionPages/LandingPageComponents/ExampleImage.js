import { Box, Container } from '@mui/material';
import React from 'react';

export default function ExampleImages() {
  //TODO just keeping this around for a quick component to throw some example images into if I
  {
    /* want to again- which I do want more guides/ a scribe/ etc. showing it well */
  }
  return (
    <Container className="example-images-wrapper" maxWidth="lg">
      <Box
        width="100%"
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: (theme) => theme.spacing(2),
        }}
      >
        Dopest content goes here.
      </Box>
    </Container>
  );
}
