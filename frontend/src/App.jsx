import React, { useState, createContext } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  IconButton, 
  Box, 
  LinearProgress,
  useMediaQuery,
  Menu,
  MenuItem,
  Divider,
  Snackbar,
  Alert,
  Chip,
  Tooltip,
  Fade,
  Slide,
  Zoom,
  CircularProgress,
} from '@mui/material';
import { Link } from 'react-router-dom';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CleaningServicesIcon from '@mui/icons-material/CleaningServices';
import InsightsIcon from '@mui/icons-material/Insights';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import MenuIcon from '@mui/icons-material/Menu';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import TimelineIcon from '@mui/icons-material/Timeline';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useThemeMode } from './ThemeContext';


export const CleaningSummaryContext = createContext();

const navItems = [
  { label: 'Upload', link: '/upload', icon: <UploadFileIcon />, step: 0, description: 'Upload your dataset' },
  { label: 'Report', link: '/report', icon: <AssessmentIcon />, step: 1, description: 'View data quality report' },
  { label: 'Cleaning', link: '/cleaning', icon: <CleaningServicesIcon />, step: 2, description: 'Clean and process data' },
  { label: 'Analysis', link: '/analysis', icon: <InsightsIcon />, step: 3, description: 'Analyze and visualize' },
  { label: 'Export', link: '/export', icon: <SaveAltIcon />, step: 4, description: 'Export results' },
];

const getStepStatus = (pathname) => {
  const currentItem = navItems.find(item => item.link === pathname);
  if (!currentItem) return -1;
  return currentItem.step;
};

const getBreadcrumbs = (pathname) => {
  const breadcrumbs = [
    { label: 'Home', link: '/', icon: <HomeIcon sx={{ fontSize: 16 }} /> }
  ];
  
  const currentItem = navItems.find(item => item.link === pathname);
  if (currentItem) {
    breadcrumbs.push({
      label: currentItem.label,
      link: currentItem.link,
      icon: React.cloneElement(currentItem.icon, { sx: { fontSize: 16 } })
    });
  }
  
  return breadcrumbs;
};

function App() {
  const location = useLocation();
  const [cleaningSummary, setCleaningSummary] = useState([]);
  const { mode, toggleTheme } = useThemeMode();
  const [mobileMenuAnchor, setMobileMenuAnchor] = useState(null);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [hoveredStep, setHoveredStep] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const isMobile = useMediaQuery('(max-width:900px)');
  
  const currentStep = getStepStatus(location.pathname);
  const progressValue = currentStep >= 0 ? ((currentStep + 1) / navItems.length) * 100 : 0;
  const completedSteps = navItems.filter((_, index) => index < currentStep).length;

  // Loading animation
  React.useEffect(() => {
    setIsLoaded(true);
  }, []);

  const getProgressInsight = () => {
    if (currentStep === -1) return 'Welcome! Start your EDA journey';
    if (currentStep === navItems.length - 1) return 'Almost there! One step remaining';
    if (currentStep === navItems.length) return 'Complete! Great work';
    return `${completedSteps} of ${navItems.length} steps completed`;
  };

  const handleMobileMenuOpen = (event) => {
    setMobileMenuAnchor(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchor(null);
  };

  const handleNotificationClose = () => {
    setNotification({ ...notification, open: false });
  };

  const keyboardShortcuts = [
    { key: 'Alt + 1', action: 'Go to Upload' },
    { key: 'Alt + 2', action: 'Go to Report' },
    { key: 'Alt + 3', action: 'Go to Cleaning' },
    { key: 'Alt + 4', action: 'Go to Analysis' },
    { key: 'Alt + 5', action: 'Go to Export' },
    { key: 'Ctrl + K', action: 'Search Navigation' },
    { key: 'Ctrl + D', action: 'Toggle Dark Mode' },
    { key: '?', action: 'Show Shortcuts' },
  ];

  // Keyboard shortcuts handler
  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.altKey && event.key >= '1' && event.key <= '5') {
        event.preventDefault();
        const index = parseInt(event.key) - 1;
        if (navItems[index]) {
          window.location.href = navItems[index].link;
        }
      }
      if (event.ctrlKey && event.key === 'k') {
        event.preventDefault();
        // Focus search
      }
      if (event.ctrlKey && event.key === 'd') {
        event.preventDefault();
        toggleTheme();
      }
      if (event.key === '?' && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        setShowKeyboardShortcuts(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleTheme]);

  return (
    <CleaningSummaryContext.Provider value={{ cleaningSummary, setCleaningSummary }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <AppBar 
            position="static" 
            elevation={0}
            sx={{ 
              background: mode === 'dark' 
                ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
                : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
              borderBottom: `1px solid ${mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'}`,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              backdropFilter: 'blur(20px)',
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: mode === 'dark' 
                  ? 'linear-gradient(90deg, transparent 0%, rgba(25, 118, 210, 0.03) 50%, transparent 100%)'
                  : 'linear-gradient(90deg, transparent 0%, rgba(25, 118, 210, 0.02) 50%, transparent 100%)',
                pointerEvents: 'none',
              }
            }}
          >
          <Toolbar sx={{ minHeight: '72px', padding: '0 32px', position: 'relative', zIndex: 1 }}>
              <Slide direction="right" in={isLoaded} timeout={800}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      textDecoration: 'none',
                      color: mode === 'dark' ? '#ffffff' : '#1a1a1a',
                      fontWeight: 700,
                      fontSize: '1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      letterSpacing: '-0.025em',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        color: '#1976d2',
                        transform: 'translateY(-1px)',
                      },
                    }}
                    component={Link}
                    to="/"
                  >
                    <AnalyticsIcon sx={{ 
                      fontSize: '2rem', 
                      color: '#1976d2',
                      filter: 'drop-shadow(0 2px 4px rgba(25, 118, 210, 0.3))',
                    }} />
                    EDA Automation
                  </Typography>
                  
                </Box>
              </Slide>

              {/* Spacer to maintain tab positioning */}
              {!isMobile && (
                <Box sx={{ mx: 'auto' }} />
              )}

            {/* Desktop Navigation */}
            {!isMobile ? (
              <Slide direction="left" in={isLoaded} timeout={1000}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  {navItems.map((item, index) => {
                    const isActive = location.pathname === item.link;
                    const isCompleted = currentStep > item.step;
                    
                    return (
                      <Zoom 
                        key={item.label}
                        in={isLoaded} 
                        timeout={1200 + (index * 100)}
                        style={{ transitionDelay: `${index * 50}ms` }}
                      >
                        <Box>
                          <Tooltip 
                            title={
                              <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                  {item.label}
                                </Typography>
                                <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                  {item.description}
                                </Typography>
                              </Box>
                            }
                            arrow 
                            placement="bottom"
                            enterDelay={300}
                          >
                            <Button
                              color="inherit"
                              component={Link}
                              to={item.link}
                              startIcon={item.icon}
                              onMouseEnter={() => setHoveredStep(item.step)}
                              onMouseLeave={() => setHoveredStep(null)}
                              sx={{
                                textTransform: 'none',
                                fontSize: '0.875rem',
                                fontWeight: isActive ? 700 : 500,
                                color: mode === 'dark' 
                                  ? (isActive ? '#1976d2' : '#ffffff') 
                                  : (isActive ? '#1976d2' : '#1a1a1a'),
                                background: isActive 
                                  ? (mode === 'dark' ? 'rgba(25, 118, 210, 0.15)' : 'rgba(25, 118, 210, 0.08)')
                                  : 'transparent',
                                borderRadius: '12px',
                                padding: '10px 18px',
                                minWidth: 'auto',
                                height: '44px',
                                border: isActive 
                                  ? `2px solid #1976d2`
                                  : '1px solid transparent',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                '&:hover': {
                                  background: isActive
                                    ? (mode === 'dark' ? 'rgba(25, 118, 210, 0.2)' : 'rgba(25, 118, 210, 0.12)')
                                    : (mode === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)'),
                                  transform: 'translateY(-2px)',
                                  boxShadow: isActive 
                                    ? '0 8px 25px rgba(25, 118, 210, 0.25)'
                                    : `0 4px 20px ${mode === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.1)'}`,
                                  border: isActive 
                                    ? `2px solid #1976d2`
                                    : `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`,
                                },
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {item.label}
                                {isCompleted && (
                                  <CheckCircleIcon sx={{ 
                                    fontSize: 18, 
                                    color: '#4caf50',
                                    filter: 'drop-shadow(0 1px 2px rgba(76, 175, 80, 0.3))',
                                  }} />
                                )}
                              </Box>
                            </Button>
                          </Tooltip>
                        </Box>
                      </Zoom>
                    );
                  })}
                  
                  <Zoom in={isLoaded} timeout={1600}>
                    <Tooltip title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`} arrow>
                      <IconButton 
                        sx={{ 
                          ml: 3, 
                          padding: '10px',
                          borderRadius: '12px',
                          border: `1px solid ${mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)'}`,
                          background: mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          '&:hover': {
                            background: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                            transform: 'translateY(-2px) rotate(180deg)',
                            boxShadow: `0 4px 20px ${mode === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.1)'}`,
                          },
                        }} 
                        color="inherit" 
                        onClick={toggleTheme}
                      >
                        {mode === 'dark' ? 
                          <LightModeIcon sx={{ fontSize: '1.25rem', color: '#ffd700' }} /> : 
                          <DarkModeIcon sx={{ fontSize: '1.25rem', color: '#424242' }} />
                        }
                      </IconButton>
                    </Tooltip>
                  </Zoom>
                </Box>
              </Slide>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton 
                  sx={{ 
                    padding: '8px',
                    borderRadius: '8px',
                    border: `1px solid ${mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)'}`,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      background: mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.04)' 
                        : 'rgba(0, 0, 0, 0.04)',
                    },
                  }} 
                  color="inherit" 
                  onClick={toggleTheme}
                >
                  {mode === 'dark' ? 
                    <LightModeIcon sx={{ color: '#ffd700' }} /> : 
                    <DarkModeIcon sx={{ color: '#424242' }} />
                  }
                </IconButton>
                <IconButton
                  color="inherit"
                  onClick={handleMobileMenuOpen}
                  sx={{
                    padding: '8px',
                    borderRadius: '8px',
                    border: `1px solid ${mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)'}`,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      background: mode === 'dark' 
                        ? 'rgba(255, 255, 255, 0.04)' 
                        : 'rgba(0, 0, 0, 0.04)',
                    },
                  }}
                >
                  <MenuIcon />
                </IconButton>
              </Box>
            )}
          </Toolbar>

        </AppBar>

        {/* Mobile Menu */}
        <Menu
          anchorEl={mobileMenuAnchor}
          open={Boolean(mobileMenuAnchor)}
          onClose={handleMobileMenuClose}
          slotProps={{
            paper: {
              sx: {
                mt: 1,
                borderRadius: 2,
                minWidth: 280,
                background: mode === 'dark' ? '#2a2a2a' : '#ffffff',
                border: `1px solid ${mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)'}`,
                boxShadow: mode === 'dark' 
                  ? '0 4px 20px rgba(0, 0, 0, 0.4)' 
                  : '0 4px 20px rgba(0, 0, 0, 0.1)',
              }
            }
          }}
        >
          {navItems.map((item) => {
            const isActive = location.pathname === item.link;
            const isCompleted = currentStep > item.step;
            
            return (
              <MenuItem
                key={item.label}
                component={Link}
                to={item.link}
                onClick={handleMobileMenuClose}
                sx={{
                  py: 2,
                  px: 3,
                  backgroundColor: isActive ? 'rgba(103, 126, 234, 0.1)' : 'transparent',
                  borderLeft: isActive ? '4px solid #667eea' : '4px solid transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(103, 126, 234, 0.05)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <Box sx={{ mr: 2, color: isActive ? '#667eea' : 'inherit' }}>
                    {item.icon}
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: isActive ? 600 : 400 }}>
                      {item.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.description}
                    </Typography>
                  </Box>
                  {isCompleted && (
                    <CheckCircleIcon sx={{ fontSize: 20, color: '#4caf50' }} />
                  )}
                  {isActive && !isCompleted && (
                    <RadioButtonUncheckedIcon sx={{ fontSize: 20, color: '#2196f3' }} />
                  )}
                </Box>
              </MenuItem>
            );
          })}
        </Menu>


        {/* Main Content */}
          <Box sx={{ 
            flexGrow: 1,
          }}>
            <Outlet />
          </Box>


        {/* Keyboard Shortcuts Modal */}
        <Menu
          open={showKeyboardShortcuts}
          onClose={() => setShowKeyboardShortcuts(false)}
          slotProps={{
            paper: {
              sx: {
                p: 3,
                minWidth: 320,
                borderRadius: 3,
                background: mode === 'dark' 
                  ? 'rgba(30, 30, 30, 0.95)' 
                  : 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
                position: 'absolute',
                top: '50% !important',
                left: '50% !important',
                transform: 'translate(-50%, -50%) !important',
              }
            }
          }}
        >
          <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <KeyboardIcon color="primary" />
            Keyboard Shortcuts
          </Typography>
          <Divider sx={{ mb: 2 }} />
          {keyboardShortcuts.map((shortcut, index) => (
            <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">{shortcut.action}</Typography>
              <Chip
                label={shortcut.key}
                size="small"
                variant="outlined"
                sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}
              />
            </Box>
          ))}
        </Menu>

        {/* Notification Snackbar */}
        <Snackbar
          open={notification.open}
          autoHideDuration={4000}
          onClose={handleNotificationClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <Alert 
            onClose={handleNotificationClose} 
            severity={notification.severity}
            sx={{ 
              borderRadius: 2,
            }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </Box>
    </CleaningSummaryContext.Provider>
  );
}

export default App;
