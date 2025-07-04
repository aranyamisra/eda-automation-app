import React from 'react';
import { Outlet } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';

const navItems = [
  { label: 'Upload', link: '/upload' },
  { label: 'Report', link: '/report' },
  { label: 'Cleaning', link: '/cleaning' },
  { label: 'Analysis', link: '/analysis' },
  { label: 'Export', link: '/export' },
];

function App() {
  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography
            variant="h6"
            sx={{ flexGrow: 1, cursor: 'pointer', textDecoration: 'none', color: 'inherit' }}
            component={Link}
            to="/"
          >
            EDA Automation App
          </Typography>
          {navItems.map((item) => (
            <Button
              key={item.label}
              color="primary"
              component={Link}
              to={item.link}
              sx={{ ml: 2 }}
            >
              {item.label}
            </Button>
          ))}
        </Toolbar>
      </AppBar>
      {/* This renders the matched child route */}
      <Outlet />
    </>
  );
}

export default App;
