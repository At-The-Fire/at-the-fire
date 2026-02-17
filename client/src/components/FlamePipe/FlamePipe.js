import { Box } from '@mui/material';
import React from 'react';
import pipeImage from '../../assets/pipe-logo.png';
import './FlamePipe.css';
import './FlameSparks.css';
import logs from './../../assets/logs.png';

export default function FlamePipe() {
  return (
    <>
      {' '}
      <Box
        style={{
          margin: '100px 0 0 0',
          width: '350px',
          height: '350px',
          position: 'relative',
        }}
      >
        <Box
          sx={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignContent: 'center',
            alignItems: 'center',
          }}
        >
          {' '}
          <img
            width="80px"
            height="80px"
            src={pipeImage}
            alt="pipe-logo"
            style={{
              position: 'absolute',
              display: 'block',
              zIndex: '500',
            }}
          />{' '}
          <Box className="container">
            <Box className="red4 flame"></Box>
            <Box className="red5 flame"></Box>
            <Box className="red2 flame"></Box>
            <Box className="red flame"></Box>
            <Box className="red3 flame"></Box>
            <Box className="orange2 flame"></Box>
            <Box className="orange flame"></Box>
            <Box className="orange3 flame"></Box>
            <Box className="yellow flame"></Box>
            <Box className="white flame"></Box>
            <Box
              component="img"
              src={logs}
              sx={{
                width: '120px',
                height: '120px',
                zIndex: '1',
                position: 'relative',
                top: '20px',
                right: '28px',
              }}
            />
          </Box>
        </Box>
      </Box>
    </>
  );
}
