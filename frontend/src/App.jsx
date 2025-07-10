import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, IconButton, Box } from '@mui/material';
import { Link } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import InsightsIcon from '@mui/icons-material/Insights';
import SaveAltIcon from '@mui/icons-material/SaveAlt';

const navItems = [
  { label: 'Upload', link: '/upload', icon: <UploadFileIcon /> },
  { label: 'Report', link: '/report', icon: <AssessmentIcon /> },
  { label: 'Cleaning', link: '/cleaning', icon: <CleaningServicesIcon /> },
  { label: 'Analysis', link: '/analysis', icon: <InsightsIcon /> },
  { label: 'Export', link: '/export', icon: <SaveAltIcon /> },
];

function App() {
  const location = useLocation();

  return (
    <>
      <AppBar position="static" sx={{ backgroundColor: '#004d40', boxShadow: 'none' }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            sx={{
              flexGrow: 1,
              cursor: 'pointer',
              textDecoration: 'none',
              color: 'inherit',
              fontWeight: 'bold',
            }}
            component={Link}
            to="/"
          >
            EDA Automation App
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {navItems.map((item) => (
              <Button
                key={item.label}
                color={location.pathname === item.link ? 'secondary' : 'inherit'}
                component={Link}
                to={item.link}
                startIcon={item.icon}
                sx={{
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: location.pathname === item.link ? 'bold' : 'normal',
                  backgroundColor: location.pathname === item.link ? '#80cbc4' : 'transparent',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  '&:hover': {
                    backgroundColor: '#004d40',
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
        </Toolbar>
      </AppBar>
      {/* This renders the matched child route */}
      <Outlet />
    </>
  );
}

export default App;
