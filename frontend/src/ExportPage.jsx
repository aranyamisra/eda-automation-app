import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Radio, RadioGroup, FormControlLabel, TextField, Button, Divider, Checkbox, FormGroup, List, ListItem, ListItemIcon, ListItemText, useTheme
} from '@mui/material';

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
  downloadCleaned,
  onDownloadCleanedChange,
  includedSections,
  onSectionToggle,
  chartsToReport,
  setChartsToReport
}) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [cleaningReport, setCleaningReport] = useState(null);
  const [cleanedData, setCleanedData] = useState(null);
  const [outlierActions, setOutlierActions] = useState({});

  // Fetch cleaning report and cleaned data on mount
  useEffect(() => {
    fetch('http://localhost:5001/cleaning', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setCleaningReport(data));
    // Try to get last cleanedData from localStorage (if user has cleaned)
    const stored = localStorage.getItem('cleanedData');
    if (stored) {
      try {
        setCleanedData(JSON.parse(stored));
      } catch {}
    }
    // Try to get outlier actions from localStorage
    const outlierStored = localStorage.getItem('outlierActions');
    if (outlierStored) {
      try {
        setOutlierActions(JSON.parse(outlierStored));
      } catch {}
    }
  }, []);

  // Transform chartsToReport into visualisations array
  const visualisations = Object.keys(chartsToReport || {})
    .filter(key => chartsToReport[key])
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
    setChartsToReport && setChartsToReport(prev => ({
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
  } else if (cleaningReport?.suggested_dtypes && Object.keys(cleaningReport.suggested_dtypes).length > 0) {
    dtypeFixes = Object.entries(cleaningReport.suggested_dtypes).map(
      ([col, dtype]) => `${col}: → ${dtype}`
    );
  }

  // Build cleaningActions from cleanedData.warnings or summarize actions
  let cleaningActions = [];
  if (cleanedData?.warnings && cleanedData.warnings.length > 0) {
    cleaningActions = cleanedData.warnings;
  } else {
    // Fallback: summarize from cleaningReport
    if (cleaningReport) {
      if (cleaningReport.duplicates > 0) cleaningActions.push(`Removed ${cleaningReport.duplicates} duplicate rows`);
      if (cleaningReport.nulls && Object.keys(cleaningReport.nulls).length > 0) cleaningActions.push('Handled missing values');
      if (cleaningReport.suggested_dtypes && Object.keys(cleaningReport.suggested_dtypes).length > 0) cleaningActions.push('Converted columns to suggested data types');
    }
  }

  // Build cleaningTable from cleanedData before/after or cleaningReport
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
  } else if (cleaningReport) {
    cleaningTable = [
      {
        metric: 'Total Rows',
        before: cleaningReport.dataset_info?.rows ?? '-',
        after: cleaningReport.dataset_info?.rows ?? '-'
      },
      {
        metric: 'Null Cells',
        before: cleaningReport.quality_metrics?.null_percentage != null ? `${cleaningReport.quality_metrics.null_percentage}%` : '-',
        after: cleaningReport.quality_metrics?.null_percentage != null ? `${cleaningReport.quality_metrics.null_percentage}%` : '-'
      },
      {
        metric: 'Duplicate Rows',
        before: cleaningReport.duplicates ?? '-',
        after: cleaningReport.duplicates ?? '-'
      }
    ];
  }

  // Build outlierTable from outlierActions (localStorage) if available, else from cleaningReport
  let outlierTable = [];
  if (outlierActions && Object.keys(outlierActions).length > 0) {
    outlierTable = Object.entries(outlierActions).map(([col, actionObj]) => ({
      column: col,
      method: actionObj.method ? actionObj.method.charAt(0).toUpperCase() + actionObj.method.slice(1) : 'None',
      action: actionObj.action === 'remove' ? 'Removed' : actionObj.action === 'cap' ? 'Capped' : 'None'
    }));
  } else if (cleaningReport?.outliers && Object.keys(cleaningReport.outliers).length > 0) {
    outlierTable = Object.entries(cleaningReport.outliers).map(([col, out]) => {
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

  const safeReportTitle = reportTitle && reportTitle.trim() ? reportTitle : 'EDA_Report';

  const handleGeneratePreview = async () => {
    setLoading(true);
    const payload = {
      reportTitle: safeReportTitle,
      reportFormat: 'html',
      includedSections,
      charts,
      downloadCleaned,
      dtypeFixes,
      cleaningActions,
      cleaningTable,
      outlierTable
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
      includedSections,
      charts,
      downloadCleaned,
      dtypeFixes,
      cleaningActions,
      cleaningTable,
      outlierTable
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
              value={reportTitle}
              onChange={e => onTitleChange && onTitleChange(e.target.value)}
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
                  checked={!!downloadCleaned}
                  onChange={e => onDownloadCleanedChange && onDownloadCleanedChange(e.target.checked)}
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
                      checked={!!includedSections?.[section.key]}
                      onChange={() => onSectionToggle && onSectionToggle(section.key)}
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
