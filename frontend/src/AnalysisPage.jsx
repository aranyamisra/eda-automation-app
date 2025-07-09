import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Tabs,
  Tab,
  Paper,
  Grid,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Button,
  Chip,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import axios from 'axios';

const chartTypeOptions = [
  { value: 'bar', label: 'Bar Chart' },
  { value: 'horizontalBar', label: 'Horizontal Bar Chart' },
  { value: 'pie', label: 'Pie Chart' },
  { value: 'donut', label: 'Donut Chart' },
  { value: 'histogram', label: 'Histogram' },
  { value: 'box', label: 'Box Plot' },
  { value: 'groupedBar', label: 'Grouped Bar Chart' },
  { value: 'stackedBar', label: 'Stacked Bar Chart' },
  { value: 'scatter', label: 'Scatter Plot' },
  { value: 'line', label: 'Line Chart' },
  { value: 'correlation', label: 'Correlation Heatmap' },
];

// Chart compatibility logic
function getCompatibleCharts(selectedColumns, columns) {
  if (!selectedColumns.length) return [];
  const colObjs = selectedColumns.map(
    (col) => columns.find((c) => c.name === col)
  );
  const num = colObjs.filter((c) => c.group === 'Numerical').length;
  const cat = colObjs.filter((c) => c.group === 'Categorical').length;
  const dt = colObjs.filter((c) => c.group === 'Date/Time').length;
  // Logic based on your mapping
  const charts = [];
  if (cat === 1 && num === 0 && dt === 0) charts.push('bar', 'horizontalBar', 'pie', 'donut');
  if (cat === 1 && num === 1) charts.push('bar', 'horizontalBar', 'pie', 'donut');
  if (num === 1 && cat === 0 && dt === 0) charts.push('histogram', 'box');
  if (cat >= 2 && num === 1) charts.push('groupedBar', 'stackedBar');
  if (num === 2 && cat === 0 && dt === 0) charts.push('scatter', 'line', 'correlation');
  if (dt === 1 && num === 1) charts.push('line');
  if (num >= 2) charts.push('correlation');
  return [...new Set(charts)];
}

function getCompatibleColumnsForChart(chartType, columns) {
  // Returns array of arrays: each array is a set of columns needed
  const numCols = columns.filter((c) => c.group === 'Numerical');
  const catCols = columns.filter((c) => c.group === 'Categorical');
  const dtCols = columns.filter((c) => c.group === 'Date/Time');
  switch (chartType) {
    case 'bar':
    case 'horizontalBar':
      return [catCols.map((c) => c.name), numCols.map((c) => c.name)];
    case 'pie':
    case 'donut':
      return [catCols.map((c) => c.name), numCols.map((c) => c.name)];
    case 'histogram':
    case 'box':
      return [numCols.map((c) => c.name)];
    case 'groupedBar':
    case 'stackedBar':
      return [catCols.map((c) => c.name), numCols.map((c) => c.name)];
    case 'scatter':
      return [numCols.map((c) => c.name)];
    case 'line':
      return [dtCols.map((c) => c.name), numCols.map((c) => c.name)];
    case 'correlation':
      return [numCols.map((c) => c.name)];
    default:
      return [];
  }
}

const groupOrder = ['Numerical', 'Categorical', 'Date/Time'];

const AnalysisPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [columns, setColumns] = useState([]);
  const [preview, setPreview] = useState([]);
  const [mode, setMode] = useState('byColumn');
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [suggestedCharts, setSuggestedCharts] = useState([]);
  const [selectedChart, setSelectedChart] = useState('');
  const [chartType, setChartType] = useState('');
  const [chartColumns, setChartColumns] = useState([]);

  useEffect(() => {
    setLoading(true);
    axios.get('http://localhost:5001/analysis', { withCredentials: true })
      .then(res => {
        setColumns(res.data.columns || []);
        setPreview(res.data.preview || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.response?.data?.error || 'Failed to load analysis metadata');
        setLoading(false);
      });
  }, []);

  // Update suggested charts when columns change
  useEffect(() => {
    if (mode === 'byColumn') {
      setSuggestedCharts(getCompatibleCharts(selectedColumns, columns));
      setSelectedChart('');
    }
  }, [selectedColumns, columns, mode]);

  // UI rendering
  if (loading) return <Box mt={4}><CircularProgress /></Box>;
  if (error) return <Box mt={4}><Alert severity="error">{error}</Alert></Box>;

  // Group columns for display
  const groupedColumns = groupOrder.map(group => ({
    group,
    cols: columns.filter(c => c.group === group)
  })).filter(g => g.cols.length > 0);

  return (
    <Box maxWidth={900} mx="auto" mt={4}>
      <Typography variant="h4" gutterBottom>Data Analysis</Typography>
      <Paper sx={{ p: 2, mb: 3 }}>
        <RadioGroup
          row
          value={mode}
          onChange={e => {
            setMode(e.target.value);
            setSelectedColumns([]);
            setSelectedChart('');
            setChartType('');
            setChartColumns([]);
          }}
        >
          <FormControlLabel value="byColumn" control={<Radio />} label="Analysis by Column" />
          <FormControlLabel value="byChart" control={<Radio />} label="Analysis by Chart Type" />
        </RadioGroup>
      </Paper>

      {mode === 'byColumn' && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6">Select Columns</Typography>
          <Grid container spacing={2}>
            {groupedColumns.map(g => (
              <Grid item xs={12} sm={4} key={g.group}>
                <Typography variant="subtitle1">{g.group}</Typography>
                {g.cols.map(col => (
                  <Chip
                    key={col.name}
                    label={`${col.name} (${col.dtype})`}
                    color={selectedColumns.includes(col.name) ? 'primary' : 'default'}
                    onClick={() => {
                      setSelectedColumns(selectedColumns.includes(col.name)
                        ? selectedColumns.filter(c => c !== col.name)
                        : [...selectedColumns, col.name]);
                    }}
                    sx={{ m: 0.5, cursor: 'pointer' }}
                  />
                ))}
              </Grid>
            ))}
          </Grid>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle1">Suggested Chart Types</Typography>
          <Box>
            {suggestedCharts.length === 0 && <Typography color="text.secondary">Select columns to see chart suggestions.</Typography>}
            {suggestedCharts.map(chart => (
              <Chip
                key={chart}
                label={chartTypeOptions.find(opt => opt.value === chart)?.label || chart}
                color={selectedChart === chart ? 'primary' : 'default'}
                onClick={() => setSelectedChart(chart)}
                sx={{ m: 0.5, cursor: 'pointer' }}
              />
            ))}
          </Box>
          {selectedChart && (
            <Button variant="contained" sx={{ mt: 2 }} onClick={() => alert('Chart rendering coming soon!')}>Generate Chart</Button>
          )}
        </Paper>
      )}

      {mode === 'byChart' && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6">Select Chart Type</Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Chart Type</InputLabel>
            <Select
              value={chartType}
              label="Chart Type"
              onChange={e => {
                setChartType(e.target.value);
                setChartColumns([]);
              }}
            >
              {chartTypeOptions.map(opt => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {chartType && (
            <>
              <Typography variant="subtitle1">Select Compatible Columns</Typography>
              <Grid container spacing={2}>
                {getCompatibleColumnsForChart(chartType, columns).map((colList, idx) => (
                  <Grid item xs={12} sm={6} key={idx}>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Column {idx + 1}</InputLabel>
                      <Select
                        value={chartColumns[idx] || ''}
                        label={`Column ${idx + 1}`}
                        onChange={e => {
                          const newCols = [...chartColumns];
                          newCols[idx] = e.target.value;
                          setChartColumns(newCols);
                        }}
                      >
                        {colList.map(colName => (
                          <MenuItem key={colName} value={colName}>{colName}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                ))}
              </Grid>
              <Button
                variant="contained"
                sx={{ mt: 2 }}
                disabled={chartColumns.length === 0 || chartColumns.includes('')}
                onClick={() => alert('Chart rendering coming soon!')}
              >
                Generate Chart
              </Button>
            </>
          )}
        </Paper>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6">Data Preview</Typography>
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col.name} style={{ borderBottom: '1px solid #444', padding: 4 }}>{col.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => (
                <tr key={i}>
                  {columns.map(col => (
                    <td key={col.name} style={{ borderBottom: '1px solid #222', padding: 4 }}>
                      {row[col.name] === null || row[col.name] === undefined ? '' : row[col.name].toString()}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Box>
      </Paper>
    </Box>
  );
};

export default AnalysisPage;
