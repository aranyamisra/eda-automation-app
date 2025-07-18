import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import App from './App.jsx';
import LandingPage from './LandingPage';
import UploadPage from './UploadPage';
import ReportPage from './ReportPage';
import CleaningPage from './CleaningPage';
import AnalysisPage from './AnalysisPage';
import ExportPage from './ExportPage';

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

function MainRouter() {
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
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />}>
            <Route index element={<LandingPage />} />
            <Route path="upload" element={<UploadPage />} />
            <Route path="report" element={<ReportPage />} />
            <Route path="cleaning" element={<CleaningPage />} />
            <Route path="/analysis" element={<AnalysisPage chartsToReport={chartsToReport} setChartsToReport={setChartsToReport} />} />
            <Route path="/export" element={
              <ExportPage
                chartsToReport={chartsToReport}
                setChartsToReport={setChartsToReport}
                includedSections={includedSections}
                onSectionToggle={handleSectionToggle}
                downloadCleaned={downloadCleaned}
                onDownloadCleanedChange={handleDownloadCleanedChange}
                reportTitle={reportTitle}
                onTitleChange={setReportTitle}
              />
            } />
            {/* <Route path="analysis" element={<AnalysisPage />} /> */} {/* Removed */}
            {/* Add more routes as needed */}
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <MainRouter />
);