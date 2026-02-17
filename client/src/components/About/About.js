import React, { useEffect } from 'react';
import { Card, CardContent, Typography, Grid, Container, Button, Box, useMediaQuery, Paper } from '@mui/material';
import FlamePipe from '../FlamePipe/FlamePipe.js';
import './About.css';
import LaunchOutlinedIcon from '@mui/icons-material/LaunchOutlined';
import { useTheme } from '@emotion/react';
import { useAuthStore } from '../../stores/useAuthStore.js';
import { useNavigate } from 'react-router-dom';

const url = 'https://d5fmwpj8iaraa.cloudfront.net/atf-assets/';
const jake = `${url}jacob.jpg`;
const kevin = `${url}kevin.jpg`;
const tyler = `${url}tyler.jpg`;

const developers = [
  {
    id: 1,
    name: 'Jake Doherty',
    role: 'Full Stack Developer',
    description: 'Full Stack Software Engineer | Musician | Maker | Renaissance Man',
    avatar: jake,
    link: 'https://www.linkedin.com/in/jacob-doherty1',
  },
  {
    id: 2,
    name: 'Kevin Nail',
    role: 'Full Stack Developer',
    description: 'Glass Artist | Full Stack Software Engineer | Drummer | Dudeist Priest',
    avatar: kevin,
    link: 'https://www.linkedin.com/in/kevinnail',
  },
  {
    id: 3,
    name: 'Tyler Watson',
    role: 'Full Stack Developer',
    description: 'Full-Stack Software Engineer | 𝔽𝕖𝕝𝕚𝕟𝕖 𝔽𝕒𝕥𝕙𝕖𝕣',
    avatar: tyler,
    link: 'https://www.linkedin.com/in/tylerwatson91',
  },
];

function About() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const navigate = useNavigate();
  const { authenticateUser, isAuthenticated, error, signingOut, checkTokenExpiry } = useAuthStore();

  // authenticate and check tokens
  useEffect(() => {
    if (!isAuthenticated && !error && !signingOut) {
      authenticateUser();
    } else if (isAuthenticated) {
      // If we are authenticated, check token expiry
      checkTokenExpiry();
    }
  }, [isAuthenticated, error, authenticateUser, signingOut, checkTokenExpiry]);

  function handleProjectInfoClick(e) {
    e.preventDefault();

    const button = e.currentTarget;
    const originalPosition = button.getBoundingClientRect();

    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: #000;
      opacity: 0;
      z-index: 9000;
      pointer-events: none;
    `;
    document.body.appendChild(overlay);

    // Create Matrix canvas
    const canvas = document.createElement('canvas');
    canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 9500;
      opacity: 0;
      transition: opacity 0.3s ease-in-out;
      pointer-events: none;
    `;
    document.body.appendChild(canvas);

    // Set canvas size to match window
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Setup Matrix effect
    const ctx = canvas.getContext('2d');
    const matrixChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$#&@*+?!';
    const drops = [];
    const fontSize = 16;
    const columns = canvas.width / fontSize;

    const speeds = [];

    // Initialize drops at different heights for a fuller initial effect
    for (let i = 0; i < columns; i++) {
      // Start some drops from top and others partially down to create a fuller effect faster
      drops[i] = Math.floor((Math.random() * canvas.height) / fontSize) - canvas.height / fontSize;

      // Assign random speed to each column
      speeds[i] = 1 + Math.random() * 1; // Speed between 1 and 2.5
    }

    // Matrix drawing function
    function drawMatrix() {
      // Semi-transparent black background to show trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#0F0'; // Matrix green
      ctx.font = fontSize + 'px monospace';

      for (let i = 0; i < drops.length; i++) {
        // Random character
        const char = matrixChars[Math.floor(Math.random() * matrixChars.length)];
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);

        // Reset if drops get to the bottom or randomly to create randomness
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        // Move drops down
        drops[i] += speeds[i];
      }
    }

    // Clone the button for animation
    const clone = button.cloneNode(true);
    clone.style.cssText = `
      position: fixed;
      top: ${originalPosition.top}px;
      left: ${originalPosition.left}px;
      width: ${originalPosition.width}px;
      height: ${originalPosition.height}px;
      z-index: 10000;
      background-color: inherit;
      color: inherit;
      font-size: inherit;
      padding: inherit;
      border: inherit;
      cursor: pointer;
      pointer-events: none;
      text-decoration: underline;
    `;
    document.body.appendChild(clone);

    // Hide the original button
    button.style.visibility = 'hidden';

    // Animation durations
    const buttonDuration = 2000; // Keep original button duration
    const matrixDuration = 3500; // Longer duration for Matrix effect
    const startTime = performance.now();
    let matrixInterval = null;
    let matrixStarted = false;
    let navigationTriggered = false;

    function animate(currentTime) {
      const elapsed = currentTime - startTime;
      const buttonProgress = Math.min(elapsed / buttonDuration, 1);

      if (buttonProgress < 1) {
        // Fade in the overlay during the latter part of the animation
        if (buttonProgress > 0.6) {
          overlay.style.opacity = ((buttonProgress - 0.6) / 0.4).toFixed(2);
        }

        // Start Matrix effect around the 30% mark of button animation
        if (buttonProgress > 0.3 && !matrixStarted) {
          matrixStarted = true;
          canvas.style.opacity = '1';
          matrixInterval = setInterval(drawMatrix, 50); // Faster updates for smoother rain

          // Schedule the end of Matrix animation and navigation
          setTimeout(() => {
            // Fade out matrix
            canvas.style.opacity = '0';

            // Clean up matrix interval
            if (matrixInterval) {
              clearInterval(matrixInterval);
              matrixInterval = null;
            }

            // Trigger navigation after matrix fade-out
            setTimeout(() => {
              if (!navigationTriggered) {
                navigationTriggered = true;
                navigate('/about-project');
                // Clean up
                document.body.removeChild(overlay);
                document.body.removeChild(clone);
                document.body.removeChild(canvas);
                button.style.visibility = 'visible';
              }
            }, 300); // Time for matrix fade-out
          }, matrixDuration);
        }

        // Create a smooth continuous path with phase-based properties
        // Base movement that ensures continuity throughout the animation
        // Using continuous sine and cosine with different frequencies
        const continuousX = window.innerWidth * 0.5 + Math.sin(buttonProgress * Math.PI * 4) * window.innerWidth * 0.3;
        const continuousY =
          window.innerHeight * 0.5 + Math.cos(buttonProgress * Math.PI * 3) * window.innerHeight * 0.3;

        let scale, rotation;

        // Phase-based scale and rotation changes while keeping position continuous
        if (buttonProgress < 0.17) {
          // Phase 1: Growing larger
          const phaseProgress = buttonProgress / 0.25;
          scale = 1 + phaseProgress * 0.6; // Scale up to 1.6
          rotation = buttonProgress * 720; // Continuous rotation throughout
        } else if (buttonProgress < 0.44) {
          // Phase 2: Maintain larger size with slight variation
          const phaseProgress = (buttonProgress - 0.25) / 0.25;
          scale = 1.6 - phaseProgress * 0.1; // Slight decrease from 1.6 to 1.5
          rotation = buttonProgress * 720; // Continuous rotation throughout
        } else if (buttonProgress < 0.5) {
          // Phase 3: Start decreasing size
          const phaseProgress = (buttonProgress - 0.5) / 0.25;
          scale = 1.5 - phaseProgress * 0.5; // Decrease from 1.5 to 1.0
          rotation = buttonProgress * 720; // Continuous rotation throughout
        } else {
          // Phase 4: Final shrinking phase
          const phaseProgress = (buttonProgress - 0.51) / 0.25;

          // For the final phase, we'll add a spiral effect by reducing the amplitude
          // while maintaining continuity with the previous path
          const adjustedX =
            window.innerWidth * 0.5 +
            Math.sin(buttonProgress * Math.PI * 4) * window.innerWidth * 0.3 * (1 - phaseProgress);
          const adjustedY =
            window.innerHeight * 0.5 +
            Math.cos(buttonProgress * Math.PI * 3) * window.innerHeight * 0.3 * (1 - phaseProgress);

          // Blend between the continuous path and the adjusted path
          // for a smooth transition into the spiral
          const x = adjustedX;
          const y = adjustedY;

          scale = 1.0 - phaseProgress; // Shrink from 1.0 to 0
          rotation = buttonProgress * 720; // Continuous rotation throughout

          // Apply transforms directly in this branch for the final phase
          const opacity = buttonProgress > 0.8 ? 1 - (buttonProgress - 0.8) * 5 : 1;

          clone.style.transform = `translate(${x - originalPosition.left}px, ${
            y - originalPosition.top
          }px) scale(${scale}) rotate(${rotation}deg)`;
          clone.style.opacity = opacity;

          requestAnimationFrame(animate);
          return; // Exit early after applying transforms for the final phase
        }

        // Calculate opacity for fade-out effect near the end
        const opacity = buttonProgress > 0.8 ? 1 - (buttonProgress - 0.8) * 5 : 1;

        // Apply transforms using the continuous path for phases 1-3
        clone.style.transform = `translate(${continuousX - originalPosition.left}px, ${
          continuousY - originalPosition.top
        }px) scale(${scale}) rotate(${rotation}deg)`;
        clone.style.opacity = opacity;

        requestAnimationFrame(animate);
      } else if (!navigationTriggered) {
        // If button animation ends but navigation hasn't happened yet (matrix still running)
        // Let matrix animation handle the navigation via its timeout
        clone.style.opacity = '0'; // Hide the button
      }
    }

    requestAnimationFrame(animate);
  }

  return (
    <Container maxWidth="lg" sx={{ pt: 10 }}>
      <Typography variant="h4" gutterBottom sx={{ textAlign: 'left' }}>
        About the Developers
      </Typography>
      <Grid container spacing={1}>
        {developers.map((dev) => (
          <Grid item xs={12} sm={6} md={4} key={dev.id}>
            <Card
              variant="outlined"
              sx={{
                display: 'flex',
                flexDirection: 'column',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: (theme) => theme.palette.primary.light,
                borderRadius: (theme) => theme.spacing(1),
                gap: (theme) => theme.spacing(2),
                height: '100%',
                '& .MuiCardContent-root:last-child': {
                  padding: '0px',
                },
                animation: `cardfadeIn 2s ease-in-out ${dev.id - 1}s forwards`,
                opacity: 0,
              }}
            >
              <CardContent sx={{ padding: '0px' }}>
                <Box sx={{ display: 'flex' }}>
                  <Box
                    component="img"
                    sx={{
                      width: 100,
                      height: 100,
                      borderRadius: 0,
                    }}
                    src={dev.avatar}
                    alt={dev.name}
                  />
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'flex-start',
                      ml: 1,
                      width: '100%',
                    }}
                  >
                    <Button href={dev.link} target="_blank" rel="noopener noreferrer" endIcon={<LaunchOutlinedIcon />}>
                      <Typography
                        variant="h6"
                        sx={{
                          fontSize: '1.2rem',
                          textAlign: 'left',
                          lineHeight: '.5rem',
                          width: '100%',
                          mt: '8px',
                        }}
                      >
                        {dev.name}
                      </Typography>
                    </Button>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        lineHeight: '1.5rem',
                        paddingLeft: 1,
                        textAlign: 'left',
                        color: 'text.secondary',
                      }}
                    >
                      {dev.role}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.7rem',
                        paddingLeft: 1,
                        textAlign: 'left',
                      }}
                    >
                      {dev.description}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {/* About Section */}
        <Grid item xs={12}>
          <Card
            variant="outlined"
            sx={{
              display: 'flex',
              flexDirection: 'column',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: (theme) => theme.palette.primary.light,
              borderRadius: (theme) => theme.spacing(1),
              gap: (theme) => theme.spacing(2),
              width: 'min(100%)',
              mt: '16px',
            }}
          >
            <CardContent>
              <Box
                sx={{
                  border: '2px solid rgba(46, 125, 50, 0.3)',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                  padding: '15px',
                  borderRadius: '15px',
                  margin: 'auto',
                }}
              >
                {isMobile ? (
                  <>
                    {' '}
                    {/* Fragment for mobile view */}
                    <Typography
                      variant="h4"
                      sx={{
                        textAlign: 'left',
                        mb: 2,
                        position: 'relative',
                        '::after': {
                          content: '""',
                          width: '50px',
                          height: '3px',
                          backgroundColor: 'green',
                          position: 'absolute',
                          bottom: '-8px',
                          left: 0,
                        },
                      }}
                    >
                      Our Story
                    </Typography>
                    <Typography
                      variant="span"
                      style={{
                        opacity: 0,
                        marginLeft: '0px',
                        fontSize: '1rem',
                        letterSpacing: '.2rem',
                        textAlign: 'left',
                        display: 'inline-block',
                        color: 'green',
                        fontWeight: 'bold',
                        textShadow: '2px 2px 2px #FFFFFF20',
                      }}
                      className="welcome-text"
                    >
                      {' '}
                      Crisis is often opportunity...
                    </Typography>
                  </>
                ) : (
                  <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <Typography
                      variant="h4"
                      sx={{
                        textAlign: 'left',
                        mb: 2,
                        position: 'relative',
                        '::after': {
                          content: '""',
                          width: '50px',
                          height: '3px',
                          backgroundColor: 'green',
                          position: 'absolute',
                          bottom: '-8px',
                          left: 0,
                        },
                      }}
                    >
                      Our Story
                    </Typography>
                    <Typography
                      variant="span"
                      style={{
                        opacity: 0,
                        marginLeft: '40px',
                        fontSize: '1.5rem',
                        letterSpacing: '.2rem',
                        textAlign: 'left',
                        display: 'inline-block',
                        color: 'green',
                        position: 'relative',
                        textShadow: '2px 2px 2px #FFFFFF20',
                        top: '8px',
                      }}
                      className="welcome-text"
                    >
                      {' '}
                      Crisis is often opportunity...
                    </Typography>
                  </Box>
                )}
                <Typography variant="body1" paragraph align="left" sx={{ lineHeight: 1.75 }}>
                  {`The 3 of us had big dreams going to web development boot camp- then it closed on us 3/4 of the way through with no warning whatsoever. 
                  Instead of letting it get in our way, we came together to make something great.  We needed to code, the glass community needs more platforms, 
                  and this is our answer. While life/ work has taken us all down different paths for now, the work we started together remains at the heart and technical foundation 
                  of this platform. Kevin has continued to build on the shared vision and is proud to present what At The Fire has become.  `}
                </Typography>
                <Typography
                  variant="h4"
                  sx={{
                    textAlign: 'left',
                    // fontWeight: 'bold',
                    mb: 2,
                    position: 'relative',
                    '::after': {
                      content: '""',
                      width: '50px',
                      height: '3px',
                      backgroundColor: 'green',
                      position: 'absolute',
                      bottom: '-8px',
                      left: 0,
                    },
                  }}
                >
                  The Goal
                </Typography>
                <Typography variant="body1" paragraph align="left" sx={{ lineHeight: 1.75 }}>
                  {`Back in the day, we had glasspipes.org.  Every day you excitedly looked at the home page to 
                  see what was new- it fired you up for the rest of the  day.  Do you feel that way opening social media?  Neither do we.  We miss the days of
                  no algorithms, no ads- just glass.  Hence, At The Fire was born.    `}
                </Typography>
                <Typography variant="body1" paragraph align="left" sx={{ lineHeight: 1.75 }}>
                  {`We want to create a space to bring artists and collectors together while also helping artists run their 
                  business more effectively. The original team was a mix of collectors and artists and in that light, this continues to be a
                   community-driven effort to make this a place we all feel welcome at.  At The Fire is an homage to all of us glassblowers 
                   who work behind the flame, but also the welcoming space of a warm fire where everyone is invited.  `}
                </Typography>
                <Paper sx={{ padding: '1rem' }}>
                  <Typography variant="body2" paragraph align="left" sx={{ lineHeight: 1.75 }}>
                    The site is actively being worked on and is currently in Beta Testing with select users. If you wish
                    to be on the waiting list, please do so through our sign up on our{' '}
                    <span
                      onClick={() => navigate('/contact')}
                      style={{ cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Contact Page
                    </span>
                    . And please, reach out to help make this a better place. I always welcome feedback, suggestions, or
                    questions. Thank you for being here. I hope you enjoy the platform. -Kevin
                  </Typography>{' '}
                </Paper>
                {/* <Typography variant="body2" align="right">
                  For the nerds:{' '}
                  <span
                    // onClick={() => navigate('/about-project')}
                    onClick={handleProjectInfoClick}
                    className="tech-stack"
                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Tech Stack
                  </span>
                </Typography> */}
              </Box>

              <Typography
                variant="h4"
                sx={{
                  margin: {
                    xs: '40px 5%',
                    sm: '40px 10%',
                    md: '40px 20%',
                    lg: '40px 30%',
                    letterSpacing: '.6rem',
                  },
                  textAlign: 'left',
                }}
                className="shimmer-text"
              >
                Welcome to
              </Typography>
              <Typography
                className="reenie-beanie-regular"
                sx={{
                  color: '#1f8e3d',
                  fontSize: '6rem',
                  textAlign: 'center',
                  fontFamily: 'Reenie Beanie',
                  position: 'relative',
                  top: '-50px',
                  textShadow: '5px 5px 15px  #FFFFFF20',
                }}
              >
                At The
              </Typography>
              <Typography
                className="reenie-beanie-regular"
                sx={{
                  color: '#1f8e3d',
                  fontSize: '8rem',
                  textAlign: 'center',
                  fontFamily: 'Reenie Beanie',
                  position: 'relative',
                  top: '-50px',
                  lineHeight: '1rem',
                  textShadow: '5px 5px 15px  #FFFFFF40',
                }}
              >
                Fire
              </Typography>
              <div className="loading-detail">
                <FlamePipe sx={{ zIndex: '500' }} />

                <div className="firepit">
                  <div className="fire">
                    <div></div>
                    {Array.from({ length: 16 }, (_, i) => (
                      <div key={i} className="spark"></div>
                    ))}
                  </div>
                </div>
              </div>
              <Grid>
                {' '}
                <Typography variant="body2" sx={{ width: '100%', padding: '1rem' }}>
                  For the nerds:{' '}
                  <span
                    // onClick={() => navigate('/about-project')}
                    onClick={handleProjectInfoClick}
                    className="tech-stack"
                    style={{ cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Tech Stack
                  </span>
                </Typography>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}

export default About;
