import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Radio, RadioGroup, FormControlLabel, TextField, Button, Divider, Checkbox, FormGroup, List, ListItem, ListItemIcon, ListItemText, useTheme, Card, CardContent, Chip, LinearProgress, Alert
} from '@mui/material';
import { 
  FileDownload, 
  Preview, 
  Article, 
  PictureAsPdf, 
  Code, 
  CheckCircle, 
  BarChart, 
  TableChart,
  CloudDownload,
  Settings,
  Visibility
} from '@mui/icons-material';
import { useChartsToReport } from './ChartsToReportContext';

const SECTION_OPTIONS = [
  { key: 'overview', label: 'Overview' },
  { key: 'dataQuality', label: 'Data Quality Summary' },
  { key: 'cleaning', label: 'Cleaning Summary' },
  { key: 'visualisations', label: 'Visualisations' },
  { key: 'insights', label: 'Final Insights' },
];

function parseChartKey(key) {
  const parts = key.split(':');
  const type = parts[0] || '';
  
  // Handle KPI keys (format: kpi:column:metric)
  if (type === 'kpi') {
    const column = parts[1] || '';
    const metric = parts[2] || '';
    return { type, columns: [column], filter: '', sort: '', metric };
  }
  
  // Handle chart keys (existing logic)
  const columns = parts[1] ? parts[1].split(',') : [];
  let filter = '';
  let sort = '';
  for (let i = 2; i < parts.length; i++) {
    if (parts[i].startsWith('filter=')) {
      filter = parts[i].replace('filter=', '');
    } else if (parts[i].startsWith('sort=')) {
      sort = parts[i].replace('sort=', '');
    }
  }
  return { type, columns, filter, sort };
}

const ExportPage = ({
  reportData,
  reportTitle,
  onTitleChange,
  // downloadCleaned,
  // onDownloadCleanedChange,
  // includedSections,
  // onSectionToggle
}) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [cleaningSummary, setCleaningSummary] = useState([]);
  const [hasCleaned, setHasCleaned] = useState(false);
  const [cleanedData, setCleanedData] = useState(null);
  const [outlierActions, setOutlierActions] = useState({});
  const { chartsToReport, setChartsToReport } = useChartsToReport();
  const [originalDatasetInfo, setOriginalDatasetInfo] = useState(null);
  const [originalColumns, setOriginalColumns] = useState([]);

  // Local state for downloadCleaned, includedSections, reportTitle, and reportFormat
  const [localIncludedSections, setLocalIncludedSections] = useState({
    overview: true,
    dataQuality: true,
    cleaning: true,
    visualisations: true,
    insights: true,
  });
  const [localReportTitle, setLocalReportTitle] = useState('EDA Report');
  const [noDataset, setNoDataset] = useState(false);
  const [reportFormat, setReportFormat] = useState('');

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
    
    const stored = localStorage.getItem('cleaningSession');
    if (stored) {
      const session = JSON.parse(stored);
      setHasCleaned(session.hasCleaned || false);
      setCleanedData(session.cleanedData || null);
      setCleaningSummary(session.cleaningSummary || []);
    } else {
              // If no cleaning session, fetch both original dataset info and column info for the report
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
        Promise.all([
        fetch(`${backendUrl}/cleaning`, { credentials: 'include' }),
        fetch(`${backendUrl}/analysis`, { credentials: 'include' })
        ])
        .then(responses => {
          if (!responses[0].ok || !responses[1].ok) throw new Error('No dataset');
          return Promise.all([responses[0].json(), responses[1].json()]);
        })
        .then(([cleaningData, analysisData]) => {
          if (!cleaningData || !cleaningData.dataset_info || !analysisData || !analysisData.columns) {
            setNoDataset(true);
          } else {
            // Store original dataset info and columns for use in report
            setOriginalDatasetInfo(cleaningData);
            setOriginalColumns(analysisData.columns);
            setHasCleaned(false);
          }
        })
        .catch(() => setNoDataset(true));
    }
  }, []);

  if (noDataset) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        bgcolor: theme.palette.mode === 'dark' 
          ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
          : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        p: 5 
      }}>
        <Paper sx={{ 
          p: 4, 
          borderRadius: 3, 
          textAlign: 'center', 
          maxWidth: 400,
          boxShadow: theme.palette.mode === 'dark'
            ? '0 8px 32px rgba(0,0,0,0.4)'
            : '0 8px 32px rgba(0,0,0,0.1)',
          border: theme.palette.mode === 'dark'
            ? '1px solid rgba(255,255,255,0.1)'
            : '1px solid rgba(255,255,255,0.2)',
          background: theme.palette.mode === 'dark'
            ? 'rgba(30, 30, 30, 0.95)'
            : 'rgba(255,255,255,0.95)'
        }} elevation={0}>
          <Typography variant="h5" color="error" sx={{ mb: 2 }}>
            No dataset uploaded
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Please upload a dataset before exporting a report.
          </Typography>
          <Button 
            variant="contained" 
            color="primary" 
            href="/upload" 
            sx={{ 
              fontWeight: 600, 
              fontSize: 16, 
              borderRadius: 2,
              py: 1.5,
              px: 3
            }}
          >
            Go to Upload Page
          </Button>
        </Paper>
      </Box>
    );
  }

  // Transform chartsToReport into visualisations array
  const visualisations = Object.keys(chartsToReport || {})
    .filter(key => chartsToReport[key]?.selected)
    .map(key => {
      const { type, columns, filter, sort, metric } = parseChartKey(key);
      
      // Handle KPI titles differently
      if (type === 'kpi') {
        const chartData = chartsToReport[key];
        return {
          id: key,
          title: `KPI: ${metric.charAt(0).toUpperCase() + metric.slice(1).replace(/([A-Z])/g, ' $1')} of ${columns[0]}`,
          type,
          columns,
          filter,
          sort,
          metric,
          result: chartData?.result,
          formattedResult: chartData?.formattedResult,
          selected: true
        };
      }
      
      // Handle chart titles (existing logic)
      return {
        id: key,
        title: `${type.charAt(0).toUpperCase() + type.slice(1)}`,
        type,
        columns,
        filter,
        sort,
        selected: true
      };
    });

  const handleVisualisationToggle = (id) => {
    setChartsToReport(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Build dtypeFixes from suggested_dtypes in cleanedData.after (remaining suggestions only)
  let dtypeFixes = [];
  if (cleanedData?.after?.suggested_dtypes && Object.keys(cleanedData.after.suggested_dtypes).length > 0) {
    dtypeFixes = Object.entries(cleanedData.after.suggested_dtypes).map(
      ([col, dtype]) => `Column '${col}' could be converted to ${dtype}.`
    );
  }

  // Build cleaningActions from the actual cleaningSummary (actions performed)
  let cleaningActions = [];
  if (cleaningSummary && cleaningSummary.length > 0) {
    cleaningActions = cleaningSummary;
  }

  // Build cleaningTable from cleanedData before/after or original dataset info
  let cleaningTable = [];
  if (cleanedData?.before && cleanedData?.after) {
    // Use cleaned data comparison
    cleaningTable = [
      {
        metric: 'Total Rows',
        before: cleanedData.before.shape?.rows ?? '-',
        after: cleanedData.after.shape?.rows ?? '-'
      },
      {
        metric: 'Null Cells',
        before: cleanedData.before.quality_metrics?.null_percentage != null ? `${cleanedData.before.quality_metrics.null_percentage}%` : '-',
        after: cleanedData.after.quality_metrics?.null_percentage != null ? `${cleanedData.after.quality_metrics.null_percentage}%` : '-'
      },
      {
        metric: 'Duplicate Rows',
        before: cleanedData.before.duplicates ?? '-',
        after: cleanedData.after.duplicates ?? '-'
      }
    ];
  } else if (originalDatasetInfo) {
    // Use original dataset info (no cleaning performed)
    const datasetInfo = originalDatasetInfo.dataset_info;
    const qualityMetrics = originalDatasetInfo.quality_metrics;
    const nulls = originalDatasetInfo.nulls;
    const duplicates = originalDatasetInfo.duplicates;
    
    cleaningTable = [
      {
        metric: 'Total Rows',
        before: datasetInfo?.rows ?? '-',
        after: datasetInfo?.rows ?? '-'
      },
      {
        metric: 'Null Cells',
        before: qualityMetrics?.null_percentage != null ? `${qualityMetrics.null_percentage}%` : '-',
        after: qualityMetrics?.null_percentage != null ? `${qualityMetrics.null_percentage}%` : '-'
      },
      {
        metric: 'Duplicate Rows',
        before: duplicates ?? '-',
        after: duplicates ?? '-'
      }
    ];
  }

  // Build chart images for export (use base64 from chartsToReport)
  const charts = visualisations.map(viz => {
    if (viz.type === 'kpi') {
      return {
        title: viz.title,
        type: viz.type,
        columns: viz.columns,
        filter: viz.filter,
        aggregationType: '',
        sort: viz.sort,
        insight: '',
        image_base64: chartsToReport[viz.id]?.image_base64 || '',
        // Add KPI-specific fields
        metric: viz.metric,
        result: viz.result,
        formattedResult: viz.formattedResult
      };
    }
    // For charts, remove xLabel and yLabel
    return {
      title: `${viz.type.charAt(0).toUpperCase() + viz.type.slice(1)}: ${viz.columns.join(', ')}`,
      type: viz.type,
      columns: viz.columns,
      filter: viz.filter,
      aggregationType: chartsToReport[viz.id]?.aggregationType || '',
      sort: viz.sort,
      insight: '',
      image_base64: chartsToReport[viz.id]?.image_base64 || ''
    };
  });

  const safeReportTitle = localReportTitle && localReportTitle.trim() ? localReportTitle : 'EDA_Report';

  const handleGeneratePreview = async () => {
    setLoading(true);
    const payload = {
      reportTitle: safeReportTitle,
      reportFormat: 'html',
      includedSections: localIncludedSections,
      charts,
      dtypeFixes,
      cleaningActions,
      cleaning_table: cleaningTable,
      // Include original dataset info if no cleaning was performed
      originalDatasetInfo: !hasCleaned ? originalDatasetInfo : null,
      originalColumns: !hasCleaned ? originalColumns : null
    };
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
      const response = await fetch(`${backendUrl}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const html = await response.text();
      setPreviewHtml(html);
      
      // Scroll to preview section after successful generation
      setTimeout(() => {
        const previewSection = document.querySelector('[data-preview-section]');
        if (previewSection) {
          previewSection.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
          });
        }
      }, 100);
    } catch (err) {
      alert('Preview failed.');
    } finally {
      setLoading(false);
    }
  };


  const handleDownload = async () => {
    if (!reportFormat) {
      alert("Please select export format.");
      return;
    }
    setLoading(true);
    const payload = {
      reportTitle: safeReportTitle,
      reportFormat,
      includedSections: localIncludedSections,
      charts,
      dtypeFixes,
      cleaningActions,
      cleaning_table: cleaningTable,
      // Include original dataset info if no cleaning was performed
      originalDatasetInfo: !hasCleaned ? originalDatasetInfo : null,
      originalColumns: !hasCleaned ? originalColumns : null
    };
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
      const response = await fetch(`${backendUrl}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = safeReportTitle + (reportFormat === 'pdf' ? '.pdf' : '.html');
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Download failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCleaned = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
      const response = await fetch(`${backendUrl}/download-cleaned`, {
        method: 'GET',
        credentials: 'include'
      });
      if (!response.ok) {
        alert('No cleaned dataset found.');
        return;
      }
      const disposition = response.headers.get('Content-Disposition');
      let filename = 'cleaned_dataset';
      if (disposition && disposition.indexOf('filename=') !== -1) {
        filename = disposition.split('filename=')[1].replace(/['"]/g, '');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Download failed.');
    }
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: theme.palette.mode === 'dark' 
        ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
        : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', 
      color: theme.palette.text.primary, 
      p: { xs: 3, sm: 4, md: 6 }
    }}>
      {/* Hero Section */}
      <Box sx={{ 
        textAlign: 'center', 
        mb: 6, 
        py: 2.5,
        background: theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, #2d1b69 0%, #11998e 100%)'
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: 3,
        color: 'white',
        boxShadow: theme.palette.mode === 'dark'
          ? '0 8px 25px rgba(45, 27, 105, 0.3)'
          : '0 8px 25px rgba(102, 126, 234, 0.25)'
      }}>
        <FileDownload sx={{ fontSize: 36, mb: 1, opacity: 0.9 }} />
        <Typography variant="h5" sx={{ 
          mb: 1, 
          fontWeight: 600,
          textShadow: '0 1px 3px rgba(0,0,0,0.3)'
        }}>
          Export Reports
        </Typography>
        <Typography variant="body1" sx={{ 
          mb: 0, 
          opacity: 0.85,
          maxWidth: 450,
          mx: 'auto',
          fontSize: '0.95rem'
        }}>
          Generate professional reports from your analysis
        </Typography>
      </Box>
      <Box sx={{ width: '100%' }}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 4,
            mb: 6,
            width: '100%',
            justifyContent: 'space-between',
          }}
        >
          {/* Report Configuration Card */}
          <Box sx={{ flex: '1 1 300px', minWidth: 300, maxWidth: 400, display: 'flex' }}>
            <Card sx={{ borderRadius: 3, width: '100%', boxShadow: theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.1)', border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)', background: theme.palette.mode === 'dark' ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255,255,255,0.95)' }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                  <Settings sx={{ mr: 2, color: 'primary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Report Configuration
                  </Typography>
                </Box>
                
                {/* Report Title */}
                <Typography variant="subtitle2" sx={{ mb: 3, fontWeight: 600, color: 'text.secondary' }}>
                  Report Title
                </Typography>
                <TextField
                  fullWidth
                  variant="outlined"
                  value={localReportTitle}
                  onChange={e => setLocalReportTitle(e.target.value)}
                  sx={{ 
                    mb: 5,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      backgroundColor: theme.palette.mode === 'dark'
                        ? 'rgba(255,255,255,0.05)'
                        : 'rgba(0,0,0,0.02)',
                      '&:hover': {
                        backgroundColor: theme.palette.mode === 'dark'
                          ? 'rgba(255,255,255,0.08)'
                          : 'rgba(0,0,0,0.04)',
                      }
                    }
                  }}
                  placeholder="Enter your report title"
                />
                
                {/* Export Format */}
                <Typography variant="subtitle2" sx={{ mb: 3, fontWeight: 600, color: 'text.secondary' }}>
                  Export Format
                </Typography>
                <RadioGroup
                  value={reportFormat}
                  onChange={e => setReportFormat(e.target.value)}
                  sx={{ mb: 3 }}
                >
                  <FormControlLabel
                    value="pdf"
                    control={<Radio color="primary" />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PictureAsPdf sx={{ mr: 1, color: 'error.main' }} />
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          PDF Document
                        </Typography>
                      </Box>
                    }
                    sx={{ 
                      mb: 2,
                      p: 3,
                      borderRadius: 2,
                      border: reportFormat === 'pdf' ? '2px solid' : '1px solid',
                      borderColor: reportFormat === 'pdf' ? 'primary.main' : 'divider',
                      backgroundColor: reportFormat === 'pdf' 
                        ? (theme.palette.mode === 'dark' ? 'rgba(144, 202, 249, 0.16)' : 'rgba(25, 118, 210, 0.08)')
                        : 'transparent',
                      '&:hover': { 
                        backgroundColor: theme.palette.mode === 'dark'
                          ? 'rgba(255,255,255,0.08)'
                          : 'rgba(0,0,0,0.04)' 
                      }
                    }}
                  />
                  <FormControlLabel
                    value="html"
                    control={<Radio color="primary" />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Code sx={{ mr: 1, color: 'success.main' }} />
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          HTML Web Page
                        </Typography>
                      </Box>
                    }
                    sx={{ 
                      p: 3,
                      borderRadius: 2,
                      border: reportFormat === 'html' ? '2px solid' : '1px solid',
                      borderColor: reportFormat === 'html' ? 'primary.main' : 'divider',
                      backgroundColor: reportFormat === 'html' 
                        ? (theme.palette.mode === 'dark' ? 'rgba(144, 202, 249, 0.16)' : 'rgba(25, 118, 210, 0.08)')
                        : 'transparent',
                      '&:hover': { 
                        backgroundColor: theme.palette.mode === 'dark'
                          ? 'rgba(255,255,255,0.08)'
                          : 'rgba(0,0,0,0.04)' 
                      }
                    }}
                  />
                </RadioGroup>
              </CardContent>
            </Card>
          </Box>
          {/* Sections Card */}
          <Box sx={{ flex: '1 1 300px', minWidth: 300, maxWidth: 400, display: 'flex' }}>
            <Card sx={{ borderRadius: 3, width: '100%', boxShadow: theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.1)', border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)', background: theme.palette.mode === 'dark' ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255,255,255,0.95)' }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                  <Article sx={{ mr: 2, color: 'primary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Report Sections
                  </Typography>
                </Box>
                
                <Typography variant="body2" sx={{ mb: 4, color: 'text.secondary' }}>
                  Choose which sections to include in your final report
                </Typography>
                
                <FormGroup sx={{ gap: 2 }}>
                  {SECTION_OPTIONS.map(section => (
                    <FormControlLabel
                      key={section.key}
                      control={
                        <Checkbox
                          color="primary"
                          checked={!!localIncludedSections[section.key]}
                          onChange={() => setLocalIncludedSections(prev => ({
                            ...prev,
                            [section.key]: !prev[section.key]
                          }))}
                        />
                      }
                      label={
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {section.label}
                        </Typography>
                      }
                      sx={{
                        m: 0,
                        p: 3,
                        borderRadius: 2,
                        border: localIncludedSections[section.key] ? '2px solid' : '1px solid',
                        borderColor: localIncludedSections[section.key] ? 'primary.main' : 'divider',
                        backgroundColor: localIncludedSections[section.key] 
                          ? (theme.palette.mode === 'dark' ? 'rgba(144, 202, 249, 0.16)' : 'rgba(25, 118, 210, 0.08)')
                          : 'transparent',
                        '&:hover': { 
                          backgroundColor: theme.palette.mode === 'dark'
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(0,0,0,0.04)' 
                        }
                      }}
                    />
                  ))}
                </FormGroup>
              </CardContent>
            </Card>
          </Box>
          {/* Visualizations Card */}
          <Box sx={{ flex: '1 1 300px', minWidth: 300, maxWidth: 400, display: 'flex' }}>
            <Card sx={{ borderRadius: 3, width: '100%', boxShadow: theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.1)', border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)', background: theme.palette.mode === 'dark' ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255,255,255,0.95)' }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                  <BarChart sx={{ mr: 2, color: 'primary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Visualizations
                  </Typography>
                  <Chip 
                    label={visualisations.length} 
                    size="small" 
                    color="primary" 
                    sx={{ ml: 'auto' }}
                  />
                </Box>
                
                <Box sx={{ mb: 4 }}>
                  {visualisations.length === 0 && (
                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                      No visualizations selected. Go to Analysis page to create charts.
                    </Alert>
                  )}
                  
                  {visualisations.map((viz, idx) => (
                    <Box
                      key={viz.id || idx}
                      sx={{
                        p: 3,
                        mb: 3,
                        borderRadius: 2,
                        border: chartsToReport[viz.id]?.selected ? '2px solid' : '1px solid',
                        borderColor: chartsToReport[viz.id]?.selected ? 'primary.main' : 'divider',
                        backgroundColor: chartsToReport[viz.id]?.selected 
                          ? (theme.palette.mode === 'dark' ? 'rgba(144, 202, 249, 0.16)' : 'rgba(25, 118, 210, 0.08)')
                          : (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'),
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        minHeight: 80,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        '&:hover': { 
                          backgroundColor: theme.palette.mode === 'dark'
                            ? 'rgba(255,255,255,0.12)'
                            : 'rgba(0,0,0,0.08)' 
                        }
                      }}
                      onClick={() => handleVisualisationToggle(viz.id)}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Checkbox
                          color="primary"
                          checked={!!chartsToReport[viz.id]?.selected}
                          onChange={() => handleVisualisationToggle(viz.id)}
                          sx={{ p: 0, mr: 3 }}
                        />
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {viz.title}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        <Chip label={viz.type} size="small" variant="outlined" />
                        {viz.type === 'kpi' ? (
                          <>
                            <Chip label={viz.columns[0]} size="small" variant="outlined" />
                            <Chip label={viz.metric} size="small" variant="outlined" color="primary" />
                            {viz.formattedResult && <Chip label={viz.formattedResult} size="small" variant="outlined" color="success" />}
                          </>
                        ) : (
                          <>
                            <Chip label={viz.columns.join(', ')} size="small" variant="outlined" />
                            {viz.filter && <Chip label={`Filter: ${viz.filter}`} size="small" variant="outlined" />}
                          </>
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Box>
          {/* Action Buttons Card */}
          <Box sx={{ flex: '1 1 300px', minWidth: 300, maxWidth: 400, display: 'flex' }}>
            <Card sx={{ borderRadius: 3, width: '100%', boxShadow: theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.1)', border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)', background: theme.palette.mode === 'dark' ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255,255,255,0.95)' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 4 }}>
                  Actions
                </Typography>
                
                {loading && (
                  <Box sx={{ mb: 4 }}>
                    <LinearProgress sx={{ borderRadius: 1, height: 6 }} />
                    <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
                      Processing your request...
                    </Typography>
                  </Box>
                )}
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    startIcon={<Visibility />}
                    onClick={handleGeneratePreview}
                    disabled={loading}
                    sx={{
                      py: 3,
                      borderRadius: 3,
                      fontWeight: 600,
                      fontSize: '1.1rem',
                      background: theme.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, #2d1b69 0%, #11998e 100%)'
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      boxShadow: theme.palette.mode === 'dark'
                        ? '0 8px 32px rgba(45, 27, 105, 0.4)'
                        : '0 8px 32px rgba(102, 126, 234, 0.4)',
                      textTransform: 'none',
                      '&:hover': {
                        background: theme.palette.mode === 'dark'
                          ? 'linear-gradient(135deg, #3d2b79 0%, #21a89e 100%)'
                          : 'linear-gradient(135deg, #7c92ff 0%, #8a5fb7 100%)',
                        transform: 'translateY(-2px)',
                        boxShadow: theme.palette.mode === 'dark'
                          ? '0 12px 40px rgba(45, 27, 105, 0.6)'
                          : '0 12px 40px rgba(102, 126, 234, 0.6)',
                      },
                      '&:disabled': {
                        background: theme.palette.mode === 'dark'
                          ? 'rgba(255,255,255,0.12)'
                          : 'rgba(0,0,0,0.12)',
                      }
                    }}
                  >
                    {loading ? 'Generating Preview...' : 'Generate Preview'}
                  </Button>
                  
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    startIcon={<FileDownload />}
                    onClick={handleDownload}
                    disabled={loading || !reportFormat}
                    sx={{
                      py: 3,
                      borderRadius: 3,
                      fontWeight: 600,
                      fontSize: '1.1rem',
                      background: theme.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, #0f4c3a 0%, #1a7a5e 100%)'
                        : 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                      boxShadow: theme.palette.mode === 'dark'
                        ? '0 8px 32px rgba(15, 76, 58, 0.4)'
                        : '0 8px 32px rgba(17, 153, 142, 0.4)',
                      textTransform: 'none',
                      '&:hover': {
                        background: theme.palette.mode === 'dark'
                          ? 'linear-gradient(135deg, #1f5c4a 0%, #2a8a6e 100%)'
                          : 'linear-gradient(135deg, #0f7b70 0%, #2dd4bf 100%)',
                        transform: 'translateY(-2px)',
                        boxShadow: theme.palette.mode === 'dark'
                          ? '0 12px 40px rgba(15, 76, 58, 0.6)'
                          : '0 12px 40px rgba(17, 153, 142, 0.6)',
                      },
                      '&:disabled': {
                        background: theme.palette.mode === 'dark'
                          ? 'rgba(255,255,255,0.12)'
                          : 'rgba(0,0,0,0.12)',
                      }
                    }}
                  >
                    {loading ? 'Downloading...' : 'Download Report'}
                  </Button>
                  
                  <Button
                    variant="outlined"
                    size="large"
                    fullWidth
                    startIcon={<CloudDownload />}
                    onClick={handleDownloadCleaned}
                    disabled={loading}
                    sx={{
                      py: 3,
                      borderRadius: 3,
                      fontWeight: 600,
                      fontSize: '1rem',
                      textTransform: 'none',
                      borderWidth: 2,
                      '&:hover': {
                        borderWidth: 2,
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                      }
                    }}
                  >
                    Download Cleaned Dataset
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
        {/* Full width preview below */}
        <Card 
          data-preview-section
          sx={{ width: '100%', borderRadius: 3, boxShadow: theme.palette.mode === 'dark' ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 32px rgba(0,0,0,0.1)', border: theme.palette.mode === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.2)', background: theme.palette.mode === 'dark' ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255,255,255,0.95)', minHeight: 600, height: 'fit-content' }}
        >
          <CardContent sx={{ p: 5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
              <Preview sx={{ mr: 2, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Live Preview
              </Typography>
              {previewHtml && (
                <Chip 
                  icon={<CheckCircle />}
                  label="Ready" 
                  size="small" 
                  color="success" 
                  sx={{ ml: 'auto' }}
                />
              )}
            </Box>
            
            <Box
              sx={{
                borderRadius: 3,
                minHeight: 800,
                maxHeight: '85vh',
                border: '2px dashed',
                borderColor: previewHtml ? 'primary.main' : 'divider',
                backgroundColor: previewHtml 
                  ? (theme.palette.mode === 'dark' ? 'rgba(40, 40, 40, 1)' : 'rgba(255,255,255,1)')
                  : (theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative',
                transition: 'all 0.3s ease',
                minWidth: 600
              }}
            >
              {previewHtml ? (
                <iframe
                  title="Report Preview"
                  srcDoc={previewHtml}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    minHeight: '780px',
                    border: 'none',
                    borderRadius: '12px'
                  }}
                />
              ) : (
                <Box sx={{ textAlign: 'center', p: 6 }}>
                  <Preview sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                    Preview Not Generated
                  </Typography>
                  <Typography variant="body2" color="text.disabled">
                    Click "Generate Preview" to see your report here
                  </Typography>
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default ExportPage;
