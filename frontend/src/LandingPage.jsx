import { AppBar, Toolbar, Typography, Button, Box, Container } from '@mui/material';
import { Link } from 'react-router-dom';

const navItems = [
  { label: 'Upload', link: '/upload' },
  { label: 'Report', link: '/report' },
  { label: 'Cleaning', link: '/cleaning' },
  { label: 'Analysis', link: '/analysis' },
  { label: 'Export', link: '/export' },
];

function LandingPage() {
  return (
    <>
      <Container maxWidth="md" sx={{ mt: 8, textAlign: 'center' }}>
        <Typography variant="h3" gutterBottom>
          Welcome to our EDA Automation App
        </Typography>
        <Typography variant="h6" color="text.secondary" paragraph>
          Effortlessly upload your datasets, generate reports, clean data, analyze, and export results—all in one place.
        </Typography>
        <Box sx={{ mt: 4 }}>
          {navItems.map((item) => (
            <Button
              key={item.label}
              variant="contained"
              color="secondary"
              component={Link}
              to={item.link}
              sx={{ m: 1, px: 4, py: 2, fontSize: '1.1rem' }}
            >
              {item.label}
            </Button>
          ))}
        </Box>
      </Container>
    </>
  );
}

export default LandingPage;