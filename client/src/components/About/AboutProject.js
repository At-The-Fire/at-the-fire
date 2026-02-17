import React, { useEffect } from 'react';
import { Typography, Container, Box, Link, Grid } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const AboutProject = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // If the URL has a hash, remove it to prevent browser jump
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    // Scroll to the top of the page
    window.scrollTo(0, 0);
  }, []);

  return (
    <Container maxWidth="lg" sx={{ pt: 10, pb: 6 }}>
      <Box sx={{ marginBottom: '2rem' }}>
        <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', mb: 0 }}>
          <Box
            component="img"
            src="https://d5fmwpj8iaraa.cloudfront.net/atf-assets/logo-icon-6-192.png"
            alt="At The Fire Logo"
            sx={{ width: 80, height: 80, mr: 2, borderRadius: '50%' }}
          />

          <Typography
            variant="h1"
            sx={{
              fontFamily: 'Reenie Beanie',
            }}
          >
            At The Fire
          </Typography>
        </Box>

        <Box>
          <Typography variant="h5" gutterBottom borderBottom={'2px solid'} borderColor={'divider'} pb={'20px'}>
            Project Info and Tech Stack{' '}
          </Typography>
          <Typography variant="h6" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
            A Gallery, Business & Inventory Management Platform for Artists and Collectors
          </Typography>
        </Box>
      </Box>

      <Typography variant="body1" paragraph sx={{ textAlign: 'left' }}>
        <em>At The Fire</em> is a subscription-based social media, business software, and gallery site designed for
        artists to showcase their collections and offer their work for sale. Collectors are welcome to subscribe as
        well. The platform features a tiered subscription model- basic accounts are free, while a paid subscription
        unlocks business accounting and sales analysis tools. Artists can create posts, manage inventory, track sales,
        analyze production, set goals & monitor performance.
      </Typography>

      <Typography variant="h4" gutterBottom sx={{ mt: 4 }}>
        Features
      </Typography>

      <Typography variant="h5" gutterBottom sx={{ mt: 3, textAlign: 'left' }}>
        Subscription Tiers
      </Typography>
      <Box sx={{ pl: 2, textAlign: 'left' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
          Basic Account (Free):
        </Typography>
        <Typography paragraph>
          Allows users to log in and out, manage a profile, like posts & follow their favorite artists, instant message
          other users, and view galleries.
        </Typography>

        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
          Paid Subscription:
        </Typography>
        <Box sx={{ pl: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 1 }}>
            Content Posting:
          </Typography>
          <Typography paragraph>Create gallery posts that contribute to the inventory list</Typography>

          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            Inventory Management:
          </Typography>
          <Typography paragraph>View inventory snapshots and download CSV files</Typography>

          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            Orders & Goals:
          </Typography>
          <Typography paragraph>Create/manage orders, track daily/monthly production quotas, and set goals</Typography>

          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            Data Visualization:
          </Typography>
          <Typography paragraph>Access graphical and tabular data analysis for sales and production</Typography>
        </Box>
      </Box>

      <Typography variant="h4" gutterBottom sx={{ mt: 4 }}>
        Tech Stack
      </Typography>

      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom color="primary">
            Frontend
          </Typography>
          <Box sx={{ pl: 2, textAlign: 'left' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 1 }}>
              React:
            </Typography>
            <Typography paragraph>Framework for building user interfaces</Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Amazon Cognito Identity JS:
            </Typography>
            <Typography paragraph>SDK for AWS Cognito authentication and user management</Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Material-UI Lab & Date Pickers:
            </Typography>
            <Typography paragraph>Enhanced components for an improved user experience</Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Chart.js, Chart.js Annotation Plugin & React-Chartjs-2:
            </Typography>
            <Typography paragraph>
              Graphs and data visualization for inventory tracking and sales/cashflow analysis
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              React Modal:
            </Typography>
            <Typography paragraph>For displaying modals</Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              React Swipeable:
            </Typography>
            <Typography paragraph>Adds swipe features to galleries and calendars</Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Browser Image Compression:
            </Typography>
            <Typography paragraph>Client-side image compression before upload</Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              React Dropzone:
            </Typography>
            <Typography paragraph>Drag & drop file uploads</Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Zustand:
            </Typography>
            <Typography paragraph>State management for simpler handling of app state</Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              React Toastify:
            </Typography>
            <Typography paragraph>For notifications and image upload progress bars</Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Date-fns:
            </Typography>
            <Typography paragraph>For date manipulation within the application</Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              JWT Decode:
            </Typography>
            <Typography paragraph>For decoding JSON Web Tokens in authentication flow</Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Material-UI Icons:
            </Typography>
            <Typography paragraph>Comprehensive icon library for the user interface</Typography>
          </Box>
        </Grid>

        <Grid item xs={12} md={6}>
          <Typography variant="h6" gutterBottom color="primary">
            Backend
          </Typography>
          <Box sx={{ pl: 2, textAlign: 'left' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 1 }}>
              Node.js & Express using PostGres:
            </Typography>
            <Typography paragraph>
              Backend framework for handling server-side logic and requests stored in a PostGres database
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              AWS Cognito SDK:
            </Typography>
            <Typography paragraph>User authentication for secure user management</Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Stripe SDK & Webhooks:
            </Typography>
            <Typography paragraph>
              Payment processing, subscription management, and real-time updates for subscription status
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              AWS S3 (@aws-sdk/client-s3):
            </Typography>
            <Typography paragraph>For image storage and management</Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Socket IO:
            </Typography>
            <Typography paragraph>Websockets for instant messaging</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Redis:
            </Typography>
            <Typography paragraph>Caching for user data</Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              AWS CloudFront:
            </Typography>
            <Typography paragraph>
              Content delivery network (CDN) for optimized image delivery and caching reducing image data transfer loads
              by a factor of up to 500x
            </Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Multer:
            </Typography>
            <Typography paragraph>Middleware for parsing form data and facilitating image uploads</Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              CryptoJS:
            </Typography>
            <Typography paragraph>AES-256 encryption for securing sensitive user data</Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Helmet:
            </Typography>
            <Typography paragraph>Content security policies (CSP)</Typography>
          </Box>
        </Grid>
        <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 4, textAlign: 'center', width: '100%' }}>
          Testing & Code Quality
        </Typography>
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 1 }}>
              Jest:
            </Typography>
            <Typography paragraph>Unit testing for JavaScript code</Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Supertest:
            </Typography>
            <Typography paragraph>HTTP endpoint testing</Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              AWS SDK (v3):
            </Typography>
            <Typography paragraph>Modular AWS clients (e.g. S3)</Typography>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Testing Library:
            </Typography>
            <Typography paragraph>UI component testing</Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Prettier:
            </Typography>
            <Typography paragraph>For code formatting</Typography>

            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              ESLint:
            </Typography>
            <Typography paragraph>JavaScript linter for consistent coding style and heuristics</Typography>
          </Grid>
        </Grid>
      </Grid>

      <Typography variant="h4" gutterBottom sx={{ mt: 4 }}>
        Future Plans
      </Typography>
      <Box sx={{ pl: 2, textAlign: 'left' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 1 }}>
          Monetization:
        </Typography>
        <Typography paragraph>Planning to introduce a shopping cart and more ecommerce features</Typography>

        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
          Social Media Features:
        </Typography>
        <Typography paragraph>
          Implement comments on posts to boost social interaction, more tracking features and granular analysis
        </Typography>
      </Box>

      <Box sx={{ mt: 4, width: '90%', textAlign: 'left' }}>
        <Typography variant="h4" gutterBottom>
          Team & Ownership
        </Typography>
        <Typography paragraph>
          Originally created by{' '}
          <Link href="https://www.linkedin.com/in/kevinnail" target="_blank" rel="noopener">
            Kevin Nail
          </Link>{' '}
          with foundational contributions from{' '}
          <Link href="https://www.linkedin.com/in/jacob-doherty1" target="_blank" rel="noopener">
            Jake Doherty
          </Link>{' '}
          and{' '}
          <Link href="https://www.linkedin.com/in/tylerwatson91" target="_blank" rel="noopener">
            Tyler Watson
          </Link>
          , who helped establish core infrastructure including Mui implementation of design layout, AWS Cognito
          authentication, Stripe payment systems, AES-256 encryption of data in and design of the database- as well the
          name <span style={{ fontWeight: 700 }}>At The Fire</span> among many other contributions. The project
          continues to be maintained and developed by Kevin Nail as owner and lead developer.
        </Typography>
      </Box>

      <Box sx={{ mt: 4, borderTop: 1, pt: 4, borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom>
          Contact & Support
        </Typography>
        <Typography>
          For any questions, please reach out via our{' '}
          <span onClick={() => navigate('/about-project')} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
            Contact Page
          </span>
        </Typography>
      </Box>
    </Container>
  );
};

export default AboutProject;
