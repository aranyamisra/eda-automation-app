import { Typography, Button, Box, Container, Grid, Paper } from '@mui/material';
import { Link } from 'react-router-dom';
import TextType from './TextType';
import DotGrid from './DotGrid';
import { useEffect } from 'react';

function LandingPage() {
  useEffect(() => {
    document.body.style.background = '#181526';
    const root = document.getElementById('root');
    if (root) root.style.background = '#181526';
    return () => {
      document.body.style.background = '';
      if (root) root.style.background = '';
    };
  }, []);

  return (
    <Box sx={{
      position: 'relative',
      width: '100%',
      minHeight: '100vh',
      overflow: 'hidden',
      background: '#181526',
      borderRadius: '24px',
      color: '#e0e0e0',
    }}>
      {/* DotGrid Background */}
      <Box sx={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <DotGrid
          dotSize={8}
          gap={22}
          baseColor="#28243d"
          activeColor="#6c63ff"
          proximity={100}
          shockRadius={200}
          shockStrength={4}
          resistance={900}
          returnDuration={1.5}
        />
      </Box>
      {/* Main Content Overlay */}
      <Container
        maxWidth="md"
        sx={{
          mt: 8,
          textAlign: 'center',
          py: 4,
          borderRadius: 2,
          position: 'relative',
          zIndex: 1,
          color: '#e0e0e0',
        }}
      >
        {/* Animated Welcome Message */}
        <Box sx={{ minHeight: 80 }}>
          <TextType
            text={["Welcome to our EDA Automation App", "Start your data journey", "Happy analyzing!"]}
            typingSpeed={75}
            pauseDuration={1500}
            showCursor={true}
            cursorCharacter="|"
            as="h1"
            className="landing-typing"
          />
        </Box>
        <Typography variant="h6" sx={{ color: '#bdbdbd' }} paragraph>
          Start by uploading your dataset to begin the analysis process.
        </Typography>
        <Box sx={{ mt: 4 }}>
          <Button
            variant="contained"
            component={Link}
            to="/upload"
            sx={{
              px: 4,
              py: 2,
              fontSize: '1.1rem',
              background: '#6c63ff',
              color: '#fff',
              '&:hover': { background: '#7d75ff' }
            }}
          >
            Upload
          </Button>
        </Box>

        {/* Feature Highlights */}
        <Box sx={{ mt: 6 }}>
          <Typography variant="h5" gutterBottom sx={{ color: '#e0e0e0' }}>
            Why Choose Us?
          </Typography>
          <Grid container spacing={2} justifyContent="center">
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, background: '#23203a', color: '#e0e0e0' }}>
                <Typography variant="h6" sx={{ color: '#fff' }}>Effortless Uploads</Typography>
                <Typography sx={{ color: '#bdbdbd' }}>
                  Quickly upload datasets in various formats.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, background: '#23203a', color: '#e0e0e0' }}>
                <Typography variant="h6" sx={{ color: '#fff' }}>Interactive Visualizations</Typography>
                <Typography sx={{ color: '#bdbdbd' }}>
                  Generate insightful charts and graphs.
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, background: '#23203a', color: '#e0e0e0' }}>
                <Typography variant="h6" sx={{ color: '#fff' }}>Data Cleaning</Typography>
                <Typography sx={{ color: '#bdbdbd' }}>
                  Clean and preprocess your data with ease.
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
  );
}

export default LandingPage; 
