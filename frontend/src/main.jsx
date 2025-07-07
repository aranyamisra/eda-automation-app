import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App.jsx';
import LandingPage from './LandingPage';
import UploadPage from './UploadPage';
import ReportPage from './ReportPage';
import CleaningPage from './CleaningPage';
// ...other imports

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#009688' },    // teal
    secondary: { main: '#e91e63' },  // pink
    background: {
      default: '#121212',            // dark background
      paper: '#1e1e1e',              // dark card/paper
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <ThemeProvider theme={darkTheme}>
    <CssBaseline />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<LandingPage />} />
          <Route path="upload" element={<UploadPage />} />
          <Route path="report" element={<ReportPage />} />
          <Route path="cleaning" element={<CleaningPage />} />
          {/* Add more routes as needed */}
        </Route>
      </Routes>
    </BrowserRouter>
  </ThemeProvider>
);