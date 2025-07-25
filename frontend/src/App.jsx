import React, { useState, createContext } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, IconButton, Box } from '@mui/material';
import { Link } from 'react-router-dom';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import InsightsIcon from '@mui/icons-material/Insights';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { useThemeMode } from './ThemeContext';

export const CleaningSummaryContext = createContext();

const navItems = [
  { label: 'Upload', link: '/upload', icon: <UploadFileIcon /> },
  { label: 'Report', link: '/report', icon: <AssessmentIcon /> },
  { label: 'Cleaning', link: '/cleaning', icon: <CleaningServicesIcon /> },
  { label: 'Analysis', link: '/analysis', icon: <InsightsIcon /> },
  { label: 'Export', link: '/export', icon: <SaveAltIcon /> },
];

function App() {
  const location = useLocation();
  const [cleaningSummary, setCleaningSummary] = useState([]);
  const { mode, toggleTheme } = useThemeMode();

  return (
    <CleaningSummaryContext.Provider value={{ cleaningSummary, setCleaningSummary }}>
      <AppBar 
        position="static" 
        sx={{ 
          background: 'linear-gradient(135deg, #004d40 0%, #00695c 100%)',
          boxShadow: '0 4px 20px rgba(0, 77, 64, 0.3)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <Toolbar sx={{ minHeight: '70px', padding: '0 24px' }}>
          <Typography
            variant="h5"
            sx={{
              flexGrow: 1,
              cursor: 'pointer',
              textDecoration: 'none',
              color: 'inherit',
              fontWeight: '700',
              fontSize: '1.5rem',
              letterSpacing: '0.5px',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'translateY(-1px)',
                textShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
              },
            }}
            component={Link}
            to="/"
          >
            📊 EDA Automation App
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {navItems.map((item) => (
              <Button
                key={item.label}
                color="inherit"
                component={Link}
                to={item.link}
                startIcon={item.icon}
                sx={{
                  textTransform: 'none',
                  fontSize: '0.95rem',
                  fontWeight: location.pathname === item.link ? '600' : '500',
                  backgroundColor: location.pathname === item.link 
                    ? 'rgba(255, 255, 255, 0.15)' 
                    : 'transparent',
                  borderRadius: '12px',
                  padding: '8px 16px',
                  minWidth: '110px',
                  height: '44px',
                  border: location.pathname === item.link 
                    ? '1px solid rgba(255, 255, 255, 0.2)' 
                    : '1px solid transparent',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(45deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05))',
                    opacity: location.pathname === item.link ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                    zIndex: 0,
                  },
                  '& > *': {
                    position: 'relative',
                    zIndex: 1,
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    '&:before': {
                      opacity: 1,
                    },
                  },
                  '&:active': {
                    transform: 'translateY(0px)',
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
            <IconButton 
              sx={{ 
                ml: 2, 
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  transform: 'translateY(-2px) rotate(180deg)',
                  boxShadow: '0 8px 25px rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                },
              }} 
              color="inherit" 
              onClick={toggleTheme}
            >
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      {/* This renders the matched child route */}
      <Outlet />
    </CleaningSummaryContext.Provider>
  );
}

export default App;
