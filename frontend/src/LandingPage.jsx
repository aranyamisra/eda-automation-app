import { Typography, Button, Box, Container, Grid, Paper } from '@mui/material';
import { Link } from 'react-router-dom';

function LandingPage() {
  return (
    <Container
      maxWidth="md"
      sx={{
        mt: 8,
        textAlign: 'center',
        py: 4,
        borderRadius: 2,
      }}
    >
      <Typography variant="h3" gutterBottom>
        Welcome to our EDA Automation App
      </Typography>
      <Typography variant="h6" color="text.secondary" paragraph>
        Start by uploading your dataset to begin the analysis process.
      </Typography>
      <Box sx={{ mt: 4 }}>
        <Button
          variant="contained"
          color="secondary"
          component={Link}
          to="/upload"
          sx={{ px: 4, py: 2, fontSize: '1.1rem' }}
        >
          Upload
        </Button>
      </Box>

      {/* Feature Highlights */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" gutterBottom>
          Why Choose Us?
        </Typography>
        <Grid container spacing={2} justifyContent="center">
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6">Effortless Uploads</Typography>
              <Typography color="text.secondary">
                Quickly upload datasets in various formats.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6">Interactive Visualizations</Typography>
              <Typography color="text.secondary">
                Generate insightful charts and graphs.
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6">Data Cleaning</Typography>
              <Typography color="text.secondary">
                Clean and preprocess your data with ease.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}

export default LandingPage; 
