import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Radio, RadioGroup, FormControlLabel, TextField, Button, Divider, Checkbox, FormGroup, List, ListItem, ListItemIcon, ListItemText, useTheme
} from '@mui/material';
import { useChartsToReport } from './ChartsToReportContext';

const SECTION_OPTIONS = [
  { key: 'overview', label: 'Overview' },
  { key: 'dataQuality', label: 'Data Quality Summary' },
  { key: 'cleaning', label: 'Cleaning Summary' },
  { key: 'outlier', label: 'Outlier Detection Summary' },
  { key: 'visualisations', label: 'Visualisations' },
  { key: 'insights', label: 'Final Insights' },
];

function parseChartKey(key) {
  const parts = key.split(':');
  const type = parts[0] || '';
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
  reportFormat,
  onFormatChange,
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

  // Local state for downloadCleaned, includedSections, and reportTitle
  const [localDownloadCleaned, setLocalDownloadCleaned] = useState(false);
  const [localIncludedSections, setLocalIncludedSections] = useState({
    overview: true,
    dataQuality: true,
    cleaning: true,
    outlier: true,
    visualisations: true,
    insights: true,
  });
  const [localReportTitle, setLocalReportTitle] = useState('EDA Report');
  const [noDataset, setNoDataset] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('cleaningSession');
    if (stored) {
      const session = JSON.parse(stored);
      setHasCleaned(session.hasCleaned || false);
      setCleanedData(session.cleanedData || null);
      setCleaningSummary(session.cleaningSummary || []);
    } else {
      // Fallback: check with backend if any dataset is present
      fetch('http://localhost:5001/analysis', { credentials: 'include' })
        .then(res => {
          if (!res.ok) throw new Error('No dataset');
          return res.json();
        })
        .then(data => {
          if (!data || !data.columns || data.columns.length === 0) {
            setNoDataset(true);
          }
        })
        .catch(() => setNoDataset(true));
    }
  }, []);

  if (noDataset) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 5 }}>
        <Paper sx={{ p: 4, borderRadius: 2, textAlign: 'center', maxWidth: 400 }} elevation={3}>
          <Typography variant="h5" color="error" sx={{ mb: 2 }}>
            No dataset uploaded
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Please upload a dataset before exporting a report.
          </Typography>
          <Button variant="contained" color="primary" href="/upload" sx={{ fontWeight: 700, fontSize: 16, borderRadius: 2 }}>
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
      const { type, columns, filter, sort } = parseChartKey(key);
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

  // Build dtypeFixes from cleaningReport or cleanedData
  let dtypeFixes = [];
  if (cleanedData?.dtype_changes && Object.keys(cleanedData.dtype_changes).length > 0) {
    dtypeFixes = Object.entries(cleanedData.dtype_changes).map(
      ([col, change]) => `${col}: ${change.before} → ${change.after}`
    );
  } else if (cleaningSummary && Object.keys(cleaningSummary).length > 0) {
    dtypeFixes = Object.entries(cleaningSummary).map(
      ([col, change]) => `${col}: → ${change}`
    );
  }

  // Build cleaningActions from cleanedData.warnings or summarize actions
  let cleaningActions = [];
  if (cleanedData?.warnings && cleanedData.warnings.length > 0) {
    cleaningActions = cleanedData.warnings;
  } else {
    // Fallback: summarize from cleaningReport
    if (cleaningSummary) {
      if (cleaningSummary.duplicates > 0) cleaningActions.push(`Removed ${cleaningSummary.duplicates} duplicate rows`);
      if (cleaningSummary.nulls && Object.keys(cleaningSummary.nulls).length > 0) cleaningActions.push('Handled missing values');
      if (cleaningSummary.suggested_dtypes && Object.keys(cleaningSummary.suggested_dtypes).length > 0) cleaningActions.push('Converted columns to suggested data types');
    }
  }

  // Build cleaningTable from cleanedData before/after
  let cleaningTable = [];
  if (cleanedData?.before && cleanedData?.after) {
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
  }

  // Build outlierTable from cleanedData if available
  let outlierTable = [];
  if (cleanedData?.after?.outliers && Object.keys(cleanedData.after.outliers).length > 0) {
    outlierTable = Object.entries(cleanedData.after.outliers).map(([col, out]) => {
      // Pick the method with the most outliers as a summary
      let method = 'None', action = 'None', maxCount = 0;
      for (const m of ['winsorizing', 'iqr', 'zscore']) {
        if (out[m]?.count > maxCount) {
          method = m.charAt(0).toUpperCase() + m.slice(1);
          maxCount = out[m].count;
        }
      }
      if (maxCount > 0) action = 'Detected';
      return { column: col, method, action };
    });
  }

  // Build chart images for export (use base64 from chartsToReport)
  const charts = visualisations.map(viz => ({
    title: viz.title,
    type: viz.type,
    columns: viz.columns,
    insight: '',
    image_base64: chartsToReport[viz.id]?.image_base64 || ''
  }));

  const safeReportTitle = localReportTitle && localReportTitle.trim() ? localReportTitle : 'EDA_Report';

  const handleGeneratePreview = async () => {
    setLoading(true);
    const payload = {
      reportTitle: safeReportTitle,
      reportFormat: 'html',
      includedSections: localIncludedSections,
      charts,
      downloadCleaned: localDownloadCleaned,
      dtypeFixes,
      cleaningActions,
      cleaning_table: cleaningTable,
      outlier_table: outlierTable
    };
    // Log the payload for debugging
    console.log('Export payload:', payload);
    try {
      const response = await fetch('http://localhost:5001/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const html = await response.text();
      setPreviewHtml(html);
    } catch (err) {
      alert('Preview failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    setLoading(true);
    const payload = {
      reportTitle: safeReportTitle,
      reportFormat,
      includedSections: localIncludedSections,
      charts,
      downloadCleaned: localDownloadCleaned,
      dtypeFixes,
      cleaningActions,
      cleaning_table: cleaningTable,
      outlier_table: outlierTable
    };
    try {
      const response = await fetch('http://localhost:5001/export', {
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

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: theme.palette.background.default, color: theme.palette.text.primary, p: 5 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Export Reports
      </Typography>
      <Grid container spacing={4}>
        {/* Left: Export Options */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ bgcolor: theme.palette.background.paper, p: 4, borderRadius: 2 }}>
            {/* Report Title */}
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Report Title
            </Typography>
            <TextField
              fullWidth
              variant="filled"
              value={localReportTitle}
              onChange={e => setLocalReportTitle(e.target.value)}
              sx={{ mb: 3 }}
              InputProps={{ disableUnderline: true }}
              placeholder="EDA Report"
            />
            {/* Export Format */}
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Export Format
            </Typography>
            <RadioGroup
              value={reportFormat}
              onChange={e => onFormatChange && onFormatChange(e.target.value)}
              sx={{ mb: 2 }}
            >
              <FormControlLabel
                value="pdf"
                control={<Radio color="primary" />}
                label="PDF"
                sx={{ mb: 1 }}
              />
              <FormControlLabel
                value="html"
                control={<Radio color="primary" />}
                label="HTML"
                sx={{ mb: 1 }}
              />
            </RadioGroup>
            {/* Download Cleaned Dataset */}
            <FormControlLabel
              control={
                <Checkbox
                  color="primary"
                  checked={!!localDownloadCleaned}
                  onChange={e => setLocalDownloadCleaned(e.target.checked)}
                />
              }
              label="Download cleaned dataset"
              sx={{ mb: 2 }}
            />
            {/* Sections to Include */}
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Sections to Include
            </Typography>
            <FormGroup sx={{ mb: 2 }}>
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
                  label={section.label}
                />
              ))}
            </FormGroup>
            {/* Visualisations List */}
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Visualisations in Report
            </Typography>
            <List dense sx={{ mb: 2, maxHeight: 160, overflow: 'auto', bgcolor: 'transparent' }}>
              {/* If no visualisations, show a placeholder */}
              {visualisations.length === 0 && (
                <ListItem>
                  <ListItemText primary="No visualisations selected." />
                </ListItem>
              )}
              {/* Otherwise, list each visualisation with a checkbox to deselect */}
              {visualisations.map((viz, idx) => (
                <ListItem key={viz.id || idx} disableGutters>
                  <ListItemIcon>
                    <Checkbox
                      color="primary"
                      checked={!!chartsToReport[viz.id]?.selected}
                      onChange={() => handleVisualisationToggle(viz.id)}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <>
                        <b>{viz.title}</b> &nbsp;
                        <span style={{ color: theme.palette.text.secondary, fontSize: 13 }}>
                          [Type: {viz.type}] [Columns: {viz.columns.join(', ')}] [Filter: {viz.filter || 'None'}] [Sort: {viz.sort || 'None'}]
                        </span>
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
            {/* TEMP: Show chart images if present */}
            {visualisations.map((viz, idx) => (
              chartsToReport[viz.id]?.image_base64 ? (
                <Box key={viz.id + '-img'} sx={{ mb: 2 }}>
                  <Typography variant="caption">Chart Image Preview ({viz.title}):</Typography>
                  <img
                    src={`data:image/png;base64,${chartsToReport[viz.id].image_base64}`}
                    alt={viz.title}
                    style={{ maxWidth: '100%', maxHeight: 200, display: 'block', border: '1px solid #ccc', marginTop: 4 }}
                  />
                </Box>
              ) : null
            ))}
            {/* Generate/Download Buttons */}
            <Button
              variant="contained"
              color="primary"
              fullWidth
              sx={{ fontWeight: 700, fontSize: 16, borderRadius: 2, mt: 2 }}
              onClick={handleGeneratePreview}
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </Button>
            <Button
              variant="outlined"
              color="primary"
              fullWidth
              sx={{ fontWeight: 700, fontSize: 16, borderRadius: 2, mt: 2 }}
              onClick={handleDownload}
              disabled={loading}
            >
              {loading ? 'Downloading...' : 'Download Report'}
            </Button>
          </Paper>
        </Grid>
        {/* Right: Report Preview */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ bgcolor: theme.palette.background.paper, p: 4, borderRadius: 2, minHeight: 600, maxHeight: '90vh', overflow: 'auto' }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Report Preview
            </Typography>
            <Box
              sx={{
                bgcolor: theme.palette.background.paper,
                color: theme.palette.text.secondary,
                borderRadius: 2,
                minHeight: 500,
                p: 3,
                fontSize: 18,
                fontFamily: 'Inter, sans-serif',
                border: `1px solid ${theme.palette.divider}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'auto',
                maxHeight: '80vh',
              }}
            >
              {previewHtml ? (
                <iframe
                  title="Report Preview"
                  srcDoc={previewHtml}
                  style={{ width: '100%', minHeight: 500, height: '100%', border: 'none' }}
                />
              ) : (
                'Report preview will be rendered here.'
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ExportPage;
