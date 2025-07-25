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
            text={["Welcome to our EDA Automation App", "Start your data journey"]}
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
        <Box sx={{ mt: 4, position: 'relative' }}>
          <Button
            variant="contained"
            component={Link}
            to="/upload"
            sx={{
              px: 8,
              py: 3.5,
              fontSize: '1.3rem',
              fontWeight: '700',
              fontFamily: '"Inter", "Poppins", "Segoe UI", system-ui, -apple-system, sans-serif',
              textTransform: 'none',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #004d40 0%, #00695c 50%, #26a69a 100%)',
              color: '#fff',
              boxShadow: '0 20px 60px rgba(0, 77, 64, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
              border: '2px solid transparent',
              backgroundClip: 'padding-box',
              position: 'relative',
              overflow: 'hidden',
              minWidth: '220px',
              letterSpacing: '0.5px',
              transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              '&:before': {
                content: '""',
                position: 'absolute',
                top: '-2px',
                left: '-2px',
                right: '-2px',
                bottom: '-2px',
                background: 'linear-gradient(45deg, #004d40, #00695c, #26a69a, #4db6ac, #80cbc4, #b2dfdb)',
                borderRadius: '22px',
                zIndex: -1,
                opacity: 0,
                transition: 'opacity 0.4s ease',
                backgroundSize: '400% 400%',
                animation: 'gradientShift 3s ease infinite',
              },
              '&:after': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
                transition: 'left 0.5s ease',
                zIndex: 1,
              },
              '& > span': {
                position: 'relative',
                zIndex: 2,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              },
              '@keyframes gradientShift': {
                '0%': { backgroundPosition: '0% 50%' },
                '50%': { backgroundPosition: '100% 50%' },
                '100%': { backgroundPosition: '0% 50%' },
              },
              '@keyframes pulse': {
                '0%': { transform: 'scale(1)' },
                '50%': { transform: 'scale(1.05)' },
                '100%': { transform: 'scale(1)' },
              },
              '&:hover': { 
                background: 'linear-gradient(135deg, #00695c 0%, #26a69a 50%, #4db6ac 100%)',
                transform: 'translateY(-6px) scale(1.03)',
                boxShadow: '0 25px 80px rgba(0, 105, 92, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                '&:before': {
                  opacity: 1,
                },
                '&:after': {
                  left: '100%',
                },
                animation: 'pulse 1.5s ease-in-out infinite',
              },
              '&:active': {
                transform: 'translateY(-4px) scale(1.01)',
                transition: 'all 0.1s ease',
              },
            }}
          >
            <span>
              🚀 Start Analysing
            </span>
          </Button>
          {/* Floating particles effect */}
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '300px',
            height: '300px',
            background: 'radial-gradient(circle, rgba(0, 77, 64, 0.1) 0%, transparent 70%)',
            borderRadius: '50%',
            zIndex: -1,
            animation: 'float 6s ease-in-out infinite',
            '@keyframes float': {
              '0%, 100%': { transform: 'translate(-50%, -50%) scale(1)' },
              '50%': { transform: 'translate(-50%, -50%) scale(1.1)' },
            },
          }} />
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
