import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { createTheme } from '@mui/material/styles';

const ThemeModeContext = createContext();

const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#009688' },
    secondary: { main: '#e91e63' },
    background: {
      default: '#f5f5f5',
      paper: '#fff',
    },
  },
});

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#009688' },
    secondary: { main: '#e91e63' },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
});

export function ThemeModeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('themeMode') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  const theme = useMemo(() => (mode === 'dark' ? darkTheme : lightTheme), [mode]);
  const toggleTheme = () => setMode((prev) => (prev === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeModeContext.Provider value={{ mode, toggleTheme, theme }}>
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode() {
  return useContext(ThemeModeContext);
} 