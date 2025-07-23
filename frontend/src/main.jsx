import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App.jsx';
import LandingPage from './LandingPage';
import UploadPage from './UploadPage';
import ReportPage from './ReportPage';
import CleaningPage from './CleaningPage';
import AnalysisPage from './AnalysisPage';
import ExportPage from './ExportPage';
import { ChartsToReportProvider } from './ChartsToReportContext';
import { ThemeModeProvider, useThemeMode } from './ThemeContext';

function MainRouter() {
  const { theme } = useThemeMode();
  const [chartsToReport, setChartsToReport] = useState({});
  const [includedSections, setIncludedSections] = useState({
    overview: true,
    dataQuality: true,
    cleaning: true,
    outlier: true,
    visualisations: true,
    insights: true,
  });
  const [downloadCleaned, setDownloadCleaned] = useState(false);
  const [reportTitle, setReportTitle] = useState('EDA Report');

  const handleSectionToggle = (key) => {
    setIncludedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleDownloadCleanedChange = (checked) => {
    setDownloadCleaned(checked);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />}>
            <Route index element={<LandingPage />} />
            <Route path="upload" element={<UploadPage />} />
            <Route path="report" element={<ReportPage />} />
            <Route path="cleaning" element={<CleaningPage />} />
            <Route path="analysis" element={<AnalysisPage />} />
            <Route path="export" element={<ExportPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ChartsToReportProvider>
      <ThemeModeProvider>
        <MainRouter />
      </ThemeModeProvider>
    </ChartsToReportProvider>
  </React.StrictMode>
);