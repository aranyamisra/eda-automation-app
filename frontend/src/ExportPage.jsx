import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, Radio, RadioGroup, FormControlLabel, TextField, Button, Divider, Checkbox, FormGroup, List, ListItem, ListItemIcon, ListItemText, useTheme
} from '@mui/material';
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

  // Build chart images for export (use base64 from chartsToReport)
  const charts = visualisations.map(viz => ({
    title: `${viz.type.charAt(0).toUpperCase() + viz.type.slice(1)}: ${viz.columns.join(', ')}`,
    type: viz.type,
    columns: viz.columns,
    filter: viz.filter,
    aggregationType: chartsToReport[viz.id]?.aggregationType || '',
    sort: viz.sort,
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
      dtypeFixes,
      cleaningActions,
      cleaning_table: cleaningTable
    };
    // Debug log for charts filter/sort
    console.log('Export charts:', charts.map(c => ({title: c.title, filter: c.filter, sort: c.sort, aggregationType: c.aggregationType})));
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
      cleaning_table: cleaningTable
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

  const handleDownloadCleaned = async () => {
    try {
      const response = await fetch('http://localhost:5001/download-cleaned', {
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
    <Box sx={{ minHeight: '100vh', bgcolor: theme.palette.background.default, color: theme.palette.text.primary, p: 5 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Export Reports
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Export a comprehensive EDA report with your selected visualisations, data quality summary, and cleaning actions. Choose your preferred format and customize the sections to include in your final report.
      </Typography>
      <Grid container spacing={4}>
        {/* Left: Export Options */}
        <Grid item xs={12} md={5}>
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
              onChange={e => setReportFormat(e.target.value)}
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
                        <b>{viz.title}</b>
                        <br />
                        <span style={{ color: theme.palette.text.secondary, fontSize: 13 }}>
                          [Type: {viz.type}] [Columns: {viz.columns.join(', ')}] [Filter: {viz.filter || 'None'}] [Sort: {viz.sort || 'None'}]{chartsToReport[viz.id]?.aggregationType ? ` [Aggregation: ${chartsToReport[viz.id].aggregationType}]` : ''}
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
            <Button
              variant="outlined"
              color="secondary"
              size="medium"
              fullWidth
              sx={{ fontWeight: 500, fontSize: 14, borderRadius: 1, mt: 1 }}
              onClick={handleDownloadCleaned}
              disabled={loading}
            >
              Download Cleaned Dataset
            </Button>
            {/* Generate/Download Buttons */}
            <Button
              variant="contained"
              color="primary"
              size="medium"
              fullWidth
              sx={{ fontWeight: 500, fontSize: 14, borderRadius: 1, mt: 1 }}
              onClick={handleGeneratePreview}
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </Button>
            <Button
              variant="outlined"
              color="primary"
              size="medium"
              fullWidth
              sx={{ fontWeight: 500, fontSize: 14, borderRadius: 1, mt: 1 }}
              onClick={handleDownload}
              disabled={loading}
            >
              {loading ? 'Downloading...' : 'Download Report'}
            </Button>
          </Paper>
        </Grid>
        {/* Right: Report Preview */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ bgcolor: theme.palette.background.paper, p: 4, borderRadius: 2, minHeight: 600, maxHeight: '90vh', minWidth: 600, maxWidth: '100%', overflow: 'auto' }}>
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
                minWidth: 550,
                width: '100%'
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
