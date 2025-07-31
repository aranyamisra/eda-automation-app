import React, { useEffect, useState, useMemo, useRef } from 'react';
import ColumnDropdowns from './ColumnDropdowns';
import { Bar, Pie, Doughnut, Line, Scatter, Chart as ChartJS2 } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend, Title } from 'chart.js';
import { MatrixController, MatrixElement } from 'chartjs-chart-matrix';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Checkbox } from '@mui/material';
import { Analytics, BarChart, Settings, FilterList, ShowChart, TableChart } from '@mui/icons-material';
import { useChartsToReport } from './ChartsToReportContext';
import { Link } from 'react-router-dom';
import html2canvas from 'html2canvas';
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
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  useTheme,
  LinearProgress,
  TextField
} from '@mui/material';
import axios from 'axios';
import Plot from 'react-plotly.js';
import { SketchPicker } from 'react-color';


// Color interpolation functions for diverging heatmap
function interpolateColor(color1, color2, t) {
  // color1 and color2 are [r,g,b]
  return `rgb(${Math.round(color1[0] + (color2[0] - color1[0]) * t)},${Math.round(color1[1] + (color2[1] - color1[1]) * t)},${Math.round(color1[2] + (color2[2] - color1[2]) * t)})`;
}
function getCorrelationColor(v) {
  // v in [-1, 1]
  const red = [255, 99, 132];
  const yellow = [255, 206, 86];
  const blue = [54, 162, 235];
  
  // Clamp v to [-1, 1] range
  v = Math.max(-1, Math.min(1, v));
  
  if (v < 0) {
    // -1 to 0: red to yellow
    // Normalize v from [-1, 0] to [0, 1] for interpolation
    const t = (v + 1); // This maps -1->0, 0->1
    return interpolateColor(red, yellow, t);
  } else {
    // 0 to 1: yellow to blue
    // v is already in [0, 1] range
    return interpolateColor(yellow, blue, v);
  }
}

// Color palette functions
function getColorPalette(palette, count) {
  const palettes = {
    default: [
      'rgba(54, 162, 235, 0.5)',
      'rgba(255, 99, 132, 0.5)',
      'rgba(255, 206, 86, 0.5)',
      'rgba(75, 192, 192, 0.5)',
      'rgba(153, 102, 255, 0.5)',
      'rgba(255, 159, 64, 0.5)'
    ],
    pastel: [
      'rgba(255, 182, 193, 0.7)',
      'rgba(173, 216, 230, 0.7)',
      'rgba(144, 238, 144, 0.7)',
      'rgba(255, 218, 185, 0.7)',
      'rgba(221, 160, 221, 0.7)',
      'rgba(255, 228, 196, 0.7)'
    ],
    bold: [
      'rgba(255, 0, 0, 0.8)',
      'rgba(0, 255, 0, 0.8)',
      'rgba(0, 0, 255, 0.8)',
      'rgba(255, 255, 0, 0.8)',
      'rgba(255, 0, 255, 0.8)',
      'rgba(0, 255, 255, 0.8)'
    ],
    dark: [
      'rgba(25, 25, 112, 0.8)',
      'rgba(139, 0, 0, 0.8)',
      'rgba(0, 100, 0, 0.8)',
      'rgba(128, 128, 0, 0.8)',
      'rgba(128, 0, 128, 0.8)',
      'rgba(0, 128, 128, 0.8)'
    ]
  };
  
  const selectedPalette = palettes[palette] || palettes.default;
  const colors = [];
  for (let i = 0; i < count; i++) {
    colors.push(selectedPalette[i % selectedPalette.length]);
  }
  return colors;
}

Chart.register(MatrixController, MatrixElement);

Chart.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend, Title);

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
  const bool = colObjs.filter((c) => c.group === 'Boolean').length;
  const cat = colObjs.filter((c) => c.group === 'Categorical' || c.group === 'Boolean').length;
  const dt = colObjs.filter((c) => c.group === 'Date/Time').length;
  const charts = [];
  // Bar, Horizontal Bar
  if ((cat === 1 && num === 0 && dt === 0) || (cat === 1 && num === 1 && dt === 0)) charts.push('bar', 'horizontalBar');
  // Pie, Donut
  if ((cat === 1 && num === 0 && dt === 0) || (num === 1 && cat === 0 && dt === 0) || (cat === 1 && num === 1 && dt === 0)) charts.push('pie', 'donut');
  // Histogram
  if (num === 1 && cat === 0 && dt === 0) charts.push('histogram');
  // Box plot
  if (num === 1 && cat === 0 && dt === 0) charts.push('box');
  // Grouped/Stacked Bar (loosened: cat >= 2 && num >= 1)
  if (cat >= 2 && num >= 1) charts.push('groupedBar', 'stackedBar');
  // Scatter plot
  if (num === 2 && cat === 0 && dt === 0) charts.push('scatter');
  // Line Chart
  if ((dt === 1 && num === 1) || (num === 1 && cat === 0 && dt === 0) || (num === 2 && cat === 0 && dt === 0)) charts.push('line');
  // Correlation heatmap - suggest if there are at least 2 numerical columns (regardless of other column types)
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
      // 1 object or 1 object + 1 numeric
      return [
        // 1 object
        [catCols.map((c) => c.name)],
        // 1 object + 1 numeric
        [catCols.map((c) => c.name), numCols.map((c) => c.name)]
      ];
    case 'pie':
    case 'donut':
      // 1 object
      // 1 numeric
      // 1 object + 1 numeric
      return [
        [catCols.map((c) => c.name)],
        [numCols.map((c) => c.name)],
        [catCols.map((c) => c.name), numCols.map((c) => c.name)]
      ];
    case 'histogram':
      // 1 numeric
      return [
        [numCols.map((c) => c.name)]
      ];
    case 'box':
      // 1 numeric
      return [
        [numCols.map((c) => c.name)]
      ];
    case 'groupedBar':
    case 'stackedBar':
      // 2 or more object + 1 numeric
      return [
        [catCols.map((c) => c.name), catCols.map((c) => c.name), numCols.map((c) => c.name)]
      ];
    case 'scatter':
      // 2 numeric
      return [
        [numCols.map((c) => c.name), numCols.map((c) => c.name)]
      ];
    case 'line':
      // 1 datetime + 1 numeric
      // 1 index + 1 numeric (treated as 1 object + 1 numeric)
      // 2 numeric
      return [
        [dtCols.map((c) => c.name), numCols.map((c) => c.name)],
        [catCols.map((c) => c.name), numCols.map((c) => c.name)],
        [numCols.map((c) => c.name), numCols.map((c) => c.name)]
      ];
    case 'correlation':
      // 2 objects + 1 numeric
      // 2+ numeric
      return [
        [catCols.map((c) => c.name), catCols.map((c) => c.name), numCols.map((c) => c.name)],
        [numCols.map((c) => c.name), numCols.map((c) => c.name)]
      ];
    default:
      return [];
  }
}

// Group columns by type
const groupOrder = ['Numerical', 'Boolean', 'Categorical', 'Date/Time'];

const AnalysisPage = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [columns, setColumns] = useState([]);
  const [preview, setPreview] = useState([]);
  const [data, setData] = useState([]); // full dataset
  const [mode, setMode] = useState('byColumn');
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [suggestedCharts, setSuggestedCharts] = useState([]);
  const [selectedChart, setSelectedChart] = useState('');
  const [chartType, setChartType] = useState('');
  const [chartColumns, setChartColumns] = useState([]);
  const [showChart, setShowChart] = useState(false);
  const { chartsToReport, setChartsToReport } = useChartsToReport();
  const [exportingChartId, setExportingChartId] = useState(null);
  const [showUncleanedDialog, setShowUncleanedDialog] = useState(false);
  const [proceedUncleaned, setProceedUncleaned] = useState(false);
  const [isCleaned, setIsCleaned] = useState(true); // Assume cleaned by default

  // KPI mode state variables
  const [selectedKPIColumn, setSelectedKPIColumn] = useState('');
  const [selectedKPIMetric, setSelectedKPIMetric] = useState('');
  const [kpiResult, setKpiResult] = useState(null);
  
  // New state variables for filtering and sorting
  const [filterTop, setFilterTop] = useState('');
  const [sortOrder, setSortOrder] = useState('none'); // Default to no sort

  // Chart refs for all chart types
  const chartRefs = useRef({});
  const kpiRef = useRef(null);
  const [aggregationType, setAggregationType] = useState('sum'); // 'sum' or 'average'
  const [chartCapturing, setChartCapturing] = useState(false);

  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [customizeChartId, setCustomizeChartId] = useState(null);
  const [customOptions, setCustomOptions] = useState({}); // { [chartId]: { title, xLabel, yLabel, legend, grid, palette, colors: [] } }
  const [tempCustomOptions, setTempCustomOptions] = useState({}); // For modal editing

  // Clean up chart refs when component unmounts
  useEffect(() => {
    return () => {
      chartRefs.current = {};
    };
  }, []);



  useEffect(() => {
    setLoading(true);
            const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
        axios.get(`${backendUrl}/analysis`, { withCredentials: true })
      .then(res => {
        // Patch: If any column has dtype 'bool' or group is missing, set group to 'Boolean'
        const patchedColumns = (res.data.columns || []).map(col => {
          if (col.dtype === 'bool' || col.group === undefined) {
            return { ...col, group: 'Boolean' };
          }
          return col;
        });
        setColumns(patchedColumns);
        setPreview(res.data.preview || []);
        setData(res.data.data || []); // set full dataset
        setLoading(false);
        // Check if the filename starts with 'cleaned_'
        if (res.data.filename && !res.data.filename.startsWith('cleaned_')) {
          setIsCleaned(false);
          setShowUncleanedDialog(true);
        } else {
          setIsCleaned(true);
        }
      })
      .catch(err => {
        console.error('Analysis page error:', err);
        console.error('Error response:', err.response);
        const errorMessage = err.response?.data?.error || err.message || 'Failed to load analysis metadata';
        
        // If the error is about no uploaded file, show a specific message
        if (err.response?.status === 400 && err.response?.data?.error?.includes('No uploaded file found')) {
          setError('No dataset found. Please upload a dataset first.');
        } else {
          setError(`Error ${err.response?.status || 'Unknown'}: ${errorMessage}`);
        }
        
        // Clear any old data to prevent showing stale analysis
        setColumns([]);
        setPreview([]);
        setData([]);
        setLoading(false);
      });
  }, []);

  // On mount, always load chartsToReport from localStorage (even if empty)
  // useEffect(() => {
  //   const storedCharts = localStorage.getItem('chartsToReport');
  //   setChartsToReport(storedCharts ? JSON.parse(storedCharts) : {});
  // }, []);

  // On every change, always save to localStorage
  // useEffect(() => {
  //   localStorage.setItem('chartsToReport', JSON.stringify(chartsToReport));
  // }, [chartsToReport]);

  // Update suggested charts when columns change
  useEffect(() => {
    if (mode === 'byColumn') {
      setSuggestedCharts(getCompatibleCharts(selectedColumns, columns));
      setSelectedChart('');
    }
  }, [selectedColumns, columns, mode]);

  // Chart data preparation
  function getChartData(type, selectedCols) {
    if (!type || !selectedCols.length) return null;
    // Find column objects
    const colObjs = selectedCols.map(col => columns.find(c => c.name === col));
    
    // Helper: aggregate numerical by category
    function aggregateByCategory(catCol, numCol) {
      const agg = {};
      const count = {};
      (data.length > 0 ? data : preview).forEach(row => {
        const cat = row[catCol];
        const num = row[numCol];
        if (cat == null || num == null || isNaN(num)) return;
        agg[cat] = (agg[cat] || 0) + Number(num);
        count[cat] = (count[cat] || 0) + 1;
      });
      const labels = Object.keys(agg);
      let dataArr;
      if (aggregationType === 'average') {
        dataArr = labels.map(l => count[l] ? agg[l] / count[l] : 0);
      } else {
        dataArr = labels.map(l => agg[l]);
      }
      return { labels, data: dataArr };
    }

    // Helper: apply filtering and sorting to chart data
    function applyFilterAndSort(labels, dataArr, sortBy = 'value') {
      // Create array of objects for sorting
      const combined = labels.map((label, index) => ({
        label,
        value: dataArr[index]
      }));

      // Sort
      if (sortBy === 'value') {
        combined.sort((a, b) => sortOrder === 'desc' ? b.value - a.value : a.value - b.value);
      } else if (sortBy === 'label') {
        combined.sort((a, b) => {
          const comparison = a.label.localeCompare(b.label);
          return sortOrder === 'desc' ? -comparison : comparison;
        });
      }

      // Apply top filter
      if (filterTop && filterTop !== '') {
        const topCount = parseInt(filterTop);
        combined.splice(topCount);
      }

      return {
        labels: combined.map(item => item.label),
        data: combined.map(item => item.value)
      };
    }

    // Bar, Pie, Donut: aggregate (single cat + num) or just category counts if only one column
    if (["bar", "horizontalBar"].includes(type)) {
      if (selectedCols.length === 1) {
        // Only category selected: show distribution (counts)
        const catCol = selectedCols[0];
        const agg = {};
        (data.length > 0 ? data : preview).forEach(row => {
          const cat = row[catCol];
          if (cat == null) return;
          agg[cat] = (agg[cat] || 0) + 1;
        });
        const labels = Object.keys(agg);
        const counts = labels.map(l => agg[l]);
        
        const { labels: filteredLabels, data: filteredData } = applyFilterAndSort(labels, counts);
        
        return {
          labels: filteredLabels,
          datasets: [{
            label: catCol + ' count',
            data: filteredData,
            backgroundColor: 'rgba(54, 162, 235, 0.5)'
          }]
        };
      } else {
        let catCol, numCol;
        console.log('DEBUG: selectedCols', selectedCols);
        console.log('DEBUG: columns', columns);
        if (columns.find(c => c.name === selectedCols[0])?.group === 'Categorical' && columns.find(c => c.name === selectedCols[1])?.group === 'Numerical') {
          catCol = selectedCols[0];
          numCol = selectedCols[1];
        } else if (columns.find(c => c.name === selectedCols[1])?.group === 'Categorical' && columns.find(c => c.name === selectedCols[0])?.group === 'Numerical') {
          catCol = selectedCols[1];
          numCol = selectedCols[0];
        } else {
          catCol = selectedCols[0];
          numCol = selectedCols[1];
        }
        console.log('DEBUG: Using catCol:', catCol, 'numCol:', numCol);
        const { labels, data } = aggregateByCategory(catCol, numCol);
        const { labels: filteredLabels, data: filteredData } = applyFilterAndSort(labels, data);
        
        return {
          labels: filteredLabels,
          datasets: [{
            label: numCol + (aggregationType === 'average' ? ' (Average)' : ' (Sum)'),
            data: filteredData,
            backgroundColor: 'rgba(54, 162, 235, 0.5)'
          }]
        };
      }
    }
    // GroupedBar/StackedBar: aggregate by two categoricals and one numerical
    if (["groupedBar", "stackedBar"].includes(type)) {
      // Expect: [catCol1, catCol2, numCol]
      const [catCol1, catCol2, numCol] = selectedCols;
      // Build: {cat1: {cat2: sum}}
      const agg = {};
      const count = {};
      (data.length > 0 ? data : preview).forEach(row => {
        const g1 = row[catCol1];
        const g2 = row[catCol2];
        const num = row[numCol];
        if (g1 == null || g2 == null || num == null || isNaN(num)) return;
        if (!agg[g1]) agg[g1] = {};
        if (!count[g1]) count[g1] = {};
        agg[g1][g2] = (agg[g1][g2] || 0) + Number(num);
        count[g1][g2] = (count[g1][g2] || 0) + 1;
      });
      const group1Labels = Object.keys(agg); // e.g., teams
      // Get all possible group2 values (e.g., all players)
      const group2Set = new Set();
      group1Labels.forEach(g1 => Object.keys(agg[g1]).forEach(g2 => group2Set.add(g2)));
      const group2Labels = Array.from(group2Set);
      
      // Apply filtering to group1Labels
      let filteredGroup1Labels = group1Labels;
      if (filterTop && filterTop !== '') {
        const topCount = parseInt(filterTop);
        // Calculate total sum for each group1 to determine top
        const group1Totals = group1Labels.map(g1 => ({
          label: g1,
          total: group2Labels.reduce((sum, g2) => sum + (agg[g1][g2] || 0), 0)
        }));
        group1Totals.sort((a, b) => sortOrder === 'desc' ? b.total - a.total : a.total - b.total);
        filteredGroup1Labels = group1Totals.slice(0, topCount).map(item => item.label);
      }
      
      // Color palette for datasets
      const palette = [
        '#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#edc949',
        '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab', '#1f77b4', '#ff7f0e',
        '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f',
        '#bcbd22', '#17becf'
      ];
      // For each group2, build a dataset (one bar per group2 value)
      const datasets = group2Labels.map((g2, i) => ({
        label: g2,
        data: filteredGroup1Labels.map(g1 => {
          if (aggregationType === 'average') {
            return count[g1][g2] ? agg[g1][g2] / count[g1][g2] : 0;
          } else {
            return agg[g1][g2] || 0;
          }
        }),
        backgroundColor: palette[i % palette.length],
      }));
      return {
        labels: filteredGroup1Labels,
        datasets
      };
    }
    if (["pie", "donut"].includes(type)) {
      if (selectedCols.length === 1) {
        const col = columns.find(c => c.name === selectedCols[0]);
        const colName = selectedCols[0];
        const isNumeric = col?.group === 'Numerical';
        const agg = {};
        const count = {};
        (data.length > 0 ? data : preview).forEach(row => {
          const val = row[colName];
          if (val == null) return;
          if (isNumeric) {
            agg[val] = (agg[val] || 0) + 1;
            count[val] = (count[val] || 0) + 1;
          } else {
            agg[val] = (agg[val] || 0) + 1;
            count[val] = (count[val] || 0) + 1;
          }
        });
        const labels = Object.keys(agg);
        let dataArr;
        if (aggregationType === 'average') {
          dataArr = labels.map(l => count[l] ? agg[l] / count[l] : 0);
        } else {
          dataArr = labels.map(l => agg[l]);
        }
        const { labels: filteredLabels, data: filteredData } = applyFilterAndSort(labels, dataArr);
        
        return {
          labels: filteredLabels,
          datasets: [{
            label: colName + ' count',
            data: filteredData,
            backgroundColor: [
              'rgba(255, 99, 132, 0.5)',
              'rgba(54, 162, 235, 0.5)',
              'rgba(255, 206, 86, 0.5)',
              'rgba(75, 192, 192, 0.5)',
              'rgba(153, 102, 255, 0.5)',
              'rgba(255, 159, 64, 0.5)'
            ]
          }]
        };
      } else {
        let catCol, numCol;
        if (columns.find(c => c.name === selectedCols[0])?.group === 'Categorical' && columns.find(c => c.name === selectedCols[1])?.group === 'Numerical') {
          catCol = selectedCols[0];
          numCol = selectedCols[1];
        } else if (columns.find(c => c.name === selectedCols[1])?.group === 'Categorical' && columns.find(c => c.name === selectedCols[0])?.group === 'Numerical') {
          catCol = selectedCols[1];
          numCol = selectedCols[0];
        } else {
          catCol = selectedCols[0];
          numCol = selectedCols[1];
        }
        const { labels, data } = aggregateByCategory(catCol, numCol);
        const { labels: filteredLabels, data: filteredData } = applyFilterAndSort(labels, data);
        
        return {
          labels: filteredLabels,
          datasets: [{
            label: numCol,
            data: filteredData,
            backgroundColor: [
              'rgba(255, 99, 132, 0.5)',
              'rgba(54, 162, 235, 0.5)',
              'rgba(255, 206, 86, 0.5)',
              'rgba(75, 192, 192, 0.5)',
              'rgba(153, 102, 255, 0.5)',
              'rgba(255, 159, 64, 0.5)'
            ]
          }]
        };
      }
    }
    if (type === "histogram") {
      // True histogram: bin the data
      const numCol = selectedCols[0];
      const arr = (data.length > 0 ? data : preview)
        .map(row => row[numCol])
        .filter(v => typeof v === 'number' && !isNaN(v));
      if (arr.length === 0) return null;
      // Calculate bins
      const min = Math.min(...arr);
      const max = Math.max(...arr);
      const binCount = 10; // Simple, predictable bin count
      const binSize = (max - min) / binCount || 1;
      const bins = Array(binCount).fill(0);
      arr.forEach(v => {
        let idx = Math.floor((v - min) / binSize);
        if (idx >= binCount) idx = binCount - 1; // edge case for max value
        bins[idx]++;
      });
      const labels = bins.map((_, i) => {
        const from = min + i * binSize;
        const to = from + binSize;
        return `${from.toFixed(1)} - ${to.toFixed(1)}`;
      });
      
      // No filtering or sorting for histogram - preserve natural distribution
      
      return {
        labels: labels,
        datasets: [{
          label: numCol,
          data: bins,
          backgroundColor: 'rgba(54, 162, 235, 0.5)'
        }]
      };
    }
    if (type === "box") {
      // Box plot: single numerical column
      const numCol = selectedCols[0];
      const arr = (data.length > 0 ? data : preview)
        .map(row => row[numCol])
        .filter(v => typeof v === 'number' && !isNaN(v));
      if (arr.length === 0) return null;
      // Calculate box plot stats
      const sorted = [...arr].sort((a, b) => a - b);
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      const q1 = quantile(sorted, 0.25);
      const median = quantile(sorted, 0.5);
      const q3 = quantile(sorted, 0.75);
      function quantile(arr, q) {
        const pos = (arr.length - 1) * q;
        const base = Math.floor(pos);
        const rest = pos - base;
        if (arr[base + 1] !== undefined) {
          return arr[base] + rest * (arr[base + 1] - arr[base]);
        } else {
          return arr[base];
        }
      }
      return {
        labels: [numCol],
        datasets: [{
          label: numCol,
          data: [{ min, q1, median, q3, max }],
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgba(54, 162, 235, 1)',
        }],
        raw: arr // <-- add raw data for Plotly
      };
    }
    if (type === "scatter") {
      // Scatter: two numerical columns
      const xCol = selectedCols[0];
      const yCol = selectedCols[1];
      let arr = (data.length > 0 ? data : preview).map(row => ({ x: row[xCol], y: row[yCol] }));
      
      // For scatter plots, we can sort by x or y values
      if (sortOrder !== 'none') {
        const sortBy = sortOrder === 'desc' ? -1 : 1;
        arr.sort((a, b) => {
          if (sortOrder.includes('x')) {
            return (a.x - b.x) * sortBy;
          } else if (sortOrder.includes('y')) {
            return (a.y - b.y) * sortBy;
          }
          return 0;
        });
      }
      
      
      return {
        datasets: [{
          label: `${xCol} vs ${yCol}`,
          data: arr,
          backgroundColor: 'rgba(255, 99, 132, 0.5)'
        }]
      };
    }
    if (type === "line") {
      const xCol = selectedCols[0];
      const yCol = selectedCols[1];
      let arr = (data.length > 0 ? data : preview)
        .filter(row => row[xCol] != null && row[yCol] != null && !isNaN(row[yCol]));
      
      // Sort line chart data
      if (sortOrder !== 'none') {
        const sortBy = sortOrder === 'desc' ? -1 : 1;
        arr.sort((a, b) => (a[xCol] - b[xCol]) * sortBy);
      }
      
      // No filtering for line charts - preserve data continuity
      
      const labels = arr.map(row => row[xCol]);
      const dataArr = arr.map(row => row[yCol]);
      return {
        labels,
        datasets: [{
          label: yCol,
          data: dataArr,
          fill: false,
          borderColor: 'rgba(75,192,192,1)'
        }]
      };
    }
    if (type === "correlation") {
      // Correlation heatmap for selected numerical columns only
      const numCols = selectedCols.filter(col => {
        const colObj = columns.find(c => c.name === col);
        return colObj && colObj.group === 'Numerical';
      });
      if (numCols.length < 2) return null;
      // Helper: Pearson correlation using only valid pairs
      function pearsonPairs(xArr, yArr) {
        const pairs = xArr.map((x, idx) => [x, yArr[idx]])
          .filter(([x, y]) => x != null && y != null && !isNaN(x) && !isNaN(y));
        if (pairs.length === 0) return 0;
        const xs = pairs.map(([x]) => x);
        const ys = pairs.map(([, y]) => y);
        const n = pairs.length;
        const meanX = xs.reduce((a, b) => a + b, 0) / n;
        const meanY = ys.reduce((a, b) => a + b, 0) / n;
        let num = 0, denomX = 0, denomY = 0;
        for (let i = 0; i < n; i++) {
          const dx = xs[i] - meanX;
          const dy = ys[i] - meanY;
          num += dx * dy;
          denomX += dx * dx;
          denomY += dy * dy;
        }
        if (denomX === 0 || denomY === 0) return 0;
        return num / Math.sqrt(denomX * denomY);
      }
      const arr = (data.length > 0 ? data : preview);
      const matrixData = [];
      const backgroundColors = [];
      for (let i = 0; i < numCols.length; i++) {
        for (let j = 0; j < numCols.length; j++) {
          const colX = numCols[i];
          const colY = numCols[j];
          const xVals = arr.map(row => row[colX]);
          const yVals = arr.map(row => row[colY]);
          const corr = pearsonPairs(xVals, yVals);
          matrixData.push({ x: colX, y: colY, v: corr });
          backgroundColors.push(getCorrelationColor(corr));
        }
      }
      
      // Debug: Log correlation values to see if they're being calculated correctly
      console.log('Correlation matrix data:', matrixData);
      console.log('Correlation values range:', {
        min: Math.min(...matrixData.map(d => d.v)),
        max: Math.max(...matrixData.map(d => d.v))
      });
      
      // Pre-calculate colors for each data point
      const colors = matrixData.map(d => getCorrelationColor(d.v));
      console.log('Pre-calculated colors:', colors);
      
      // Use the same palette as other charts
      const palette = [
        'rgba(255, 99, 132, OPACITY)',   // red
        'rgba(54, 162, 235, OPACITY)',  // blue
        'rgba(255, 206, 86, OPACITY)',  // yellow
        'rgba(75, 192, 192, OPACITY)',  // teal
        'rgba(153, 102, 255, OPACITY)', // purple
        'rgba(255, 159, 64, OPACITY)'   // orange
      ];
      return {
        labels: numCols,
        datasets: [{
          label: 'Correlation',
          data: matrixData,
          backgroundColor: colors,
          borderColor: 'white',
          borderWidth: 2,
          width: ({chart}) => {
            const cols = numCols.length;
            const rows = numCols.length;
            const chartWidth = (chart.chartArea || {}).width || 200;
            const chartHeight = (chart.chartArea || {}).height || 200;
            const cellWidth = chartWidth / cols - 2;
            const cellHeight = chartHeight / rows - 2;
            return Math.max(20, Math.min(cellWidth, cellHeight));
          },
          height: ({chart}) => {
            const cols = numCols.length;
            const rows = numCols.length;
            const chartWidth = (chart.chartArea || {}).width || 200;
            const chartHeight = (chart.chartArea || {}).height || 200;
            const cellWidth = chartWidth / cols - 2;
            const cellHeight = chartHeight / rows - 2;
            return Math.max(20, Math.min(cellWidth, cellHeight));
          },
        }]
      };
    }
    return null;
  }

  // Helper to calculate KPI metrics
  function calculateKPI(column, metric) {
    if (!column || !metric || !data.length) return null;
    
    const values = data.map(row => row[column]).filter(val => val != null);
    const numericValues = values.filter(val => !isNaN(val) && val !== '').map(val => Number(val));
    
    switch (metric) {
      case 'count':
        return values.length;
      case 'uniquecount':
        return new Set(values).size;
      case 'sum':
        return numericValues.length > 0 ? numericValues.reduce((a, b) => a + b, 0) : 0;
      case 'average':
        return numericValues.length > 0 ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length : 0;
      case 'max':
        return numericValues.length > 0 ? Math.max(...numericValues) : 0;
      case 'min':
        return numericValues.length > 0 ? Math.min(...numericValues) : 0;
      case 'median':
        if (numericValues.length === 0) return 0;
        const sorted = [...numericValues].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
      default:
        return 0;
    }
  }

  // Helper to get available KPI metrics based on column type
  function getAvailableKPIMetrics(column) {
    if (!column) return [];
    
    const colObj = columns.find(c => c.name === column);
    const isNumerical = colObj?.group === 'Numerical';
    
    const baseMetrics = ['count', 'uniquecount'];
    const numericalMetrics = ['sum', 'average', 'max', 'min', 'median'];
    
    return isNumerical ? [...baseMetrics, ...numericalMetrics] : baseMetrics;
  }

  // Helper to format KPI result
  function formatKPIResult(value, metric) {
    if (value == null) return 'N/A';
    
    if (['sum', 'average', 'max', 'min', 'median'].includes(metric)) {
      return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
    
    return Number(value).toLocaleString();
  }

  // Helper to determine if legend should be displayed
  function shouldShowLegend(type, selectedCols) {
    switch (type) {
      case 'bar':
      case 'horizontalBar':
      case 'histogram':
        return false; // Single color charts don't need legend
      case 'scatter':
      case 'line':
        return false; // Single series charts don't need legend
      case 'box':
        return false; // Box plots don't need legend
      case 'groupedBar':
      case 'stackedBar':
        return true; // Multiple series need legend
      case 'pie':
      case 'donut':
        return true; // Pie charts need legend for categories
      case 'correlation':
        return false; // Heatmap doesn't need legend
      default:
        return true;
    }
  }

  // Helper to get axis labels for charts
  function getAxisLabels(type, selectedCols) {
    if (!selectedCols || selectedCols.length === 0) return { x: '', y: '' };

    switch (type) {
      case 'bar':
      case 'horizontalBar':
        if (selectedCols.length === 1) {
          const col = selectedCols[0];
          return type === 'horizontalBar' 
            ? { x: 'Count', y: col }
            : { x: col, y: 'Count' };
        } else {
          const catCol = columns.find(c => c.name === selectedCols[0])?.group === 'Categorical' ? selectedCols[0] : selectedCols[1];
          const numCol = columns.find(c => c.name === selectedCols[0])?.group === 'Numerical' ? selectedCols[0] : selectedCols[1];
          return type === 'horizontalBar'
            ? { x: `${numCol} (${aggregationType === 'average' ? 'Average' : 'Sum'})`, y: catCol }
            : { x: catCol, y: `${numCol} (${aggregationType === 'average' ? 'Average' : 'Sum'})` };
        }
      case 'groupedBar':
      case 'stackedBar':
        const catCol1 = selectedCols[0];
        const numCol = selectedCols[2] || selectedCols[1];
        return { x: catCol1, y: `${numCol} (${aggregationType === 'average' ? 'Average' : 'Sum'})` };
      case 'scatter':
        return { x: selectedCols[0], y: selectedCols[1] };
      case 'line':
        return { x: selectedCols[0], y: selectedCols[1] };
      case 'histogram':
        return { x: `${selectedCols[0]} (Value)`, y: 'Frequency' };
      default:
        return { x: selectedCols[0] || '', y: selectedCols[1] || 'Value' };
    }
  }

  // Helper to get chartId for current chart
  function getChartId(type, cols) {
    return `${type}:${cols.join(',')}`;
  }

  // Helper to get default chart title
  function getDefaultChartTitle(type, selectedCols) {
    if (!selectedCols || selectedCols.length === 0) return '';
    
    const title = (() => {
      switch (type) {
        case 'bar':
        case 'horizontalBar':
          if (selectedCols.length === 1) {
            return `${selectedCols[0]} Distribution`;
          } else {
            const catCol = columns.find(c => c.name === selectedCols[0])?.group === 'Categorical' ? selectedCols[0] : selectedCols[1];
            const numCol = columns.find(c => c.name === selectedCols[0])?.group === 'Numerical' ? selectedCols[0] : selectedCols[1];
            return `${numCol} by ${catCol}`;
          }
        case 'pie':
        case 'donut':
          if (selectedCols.length === 1) {
            return `${selectedCols[0]} Distribution`;
          } else {
            const catCol = columns.find(c => c.name === selectedCols[0])?.group === 'Categorical' ? selectedCols[0] : selectedCols[1];
            const numCol = columns.find(c => c.name === selectedCols[0])?.group === 'Numerical' ? selectedCols[0] : selectedCols[1];
            return `${numCol} by ${catCol}`;
          }
        case 'scatter':
          return `${selectedCols[0]} vs ${selectedCols[1]}`;
        case 'line':
          return `${selectedCols[1]} over ${selectedCols[0]}`;
        case 'histogram':
          return `${selectedCols[0]} Distribution`;
        case 'box':
          return `${selectedCols[0]} Distribution`;
        case 'groupedBar':
        case 'stackedBar':
          return `${selectedCols[2] || selectedCols[1]} by ${selectedCols[0]} and ${selectedCols[1]}`;
        case 'correlation':
          return 'Correlation Heatmap';
        default:
          return selectedCols.join(' vs ');
      }
    })();
    
    console.log('Generated title:', title, 'for type:', type, 'columns:', selectedCols);
    return title;
  }

  // Helper to get Chart.js options with black text/grid for export
  function getExportChartOptions(type, selectedCols) {
    const axisLabels = getAxisLabels(type, selectedCols);
    const showLegend = shouldShowLegend(type, selectedCols);
    return {
      responsive: true,
      plugins: {
        legend: { 
          display: showLegend,
          labels: { color: '#111' } 
        },
        title: { color: '#111' },
        datalabels: { color: '#111', font: { weight: 'bold', size: 16 } }
      },
      scales: {
        x: {
          grid: { color: '#333' },
          ticks: { color: '#111' },
          title: {
            display: true,
            text: axisLabels.x,
            color: '#111',
            font: { size: 14, weight: 'bold' }
          }
        },
        y: {
          grid: { color: '#333' },
          ticks: { color: '#111' },
          title: {
            display: true,
            text: axisLabels.y,
            color: '#111',
            font: { size: 14, weight: 'bold' }
          }
        }
      }
    };
  }

  function renderChart(type, selectedCols, forExport = false, passedChartId = '') {
    const data = getChartData(type, selectedCols);
    if (!data) return null;
    
    const chartId = passedChartId || getChartId(type, selectedCols);
    const axisLabels = getAxisLabels(type, selectedCols);
    const showLegend = shouldShowLegend(type, selectedCols);
    
    // Ensure chart ref exists
    if (!chartRefs.current[chartId]) {
      chartRefs.current[chartId] = React.createRef();
    }
    
    const options = customOptions[chartId] || {};
    

    
    // Apply customization options
    const showCustomLegend = options.legend !== undefined ? options.legend : showLegend;
    const showCustomGrid = options.grid !== undefined ? options.grid : true;
    const customPalette = options.palette || 'default';
    const customColors = options.colors || [];
    
    // Apply color palette or custom colors to chart data
    // Skip this for correlation charts as they have their own color logic
    if (data.datasets && data.datasets.length > 0 && type !== 'correlation') {
      data.datasets.forEach((dataset, index) => {
        if (customColors.length > 0) {
          // Use custom colors if provided
          if (type === 'pie' || type === 'donut') {
            // For pie/donut charts, backgroundColor should be an array of colors
            dataset.backgroundColor = customColors.slice(0, dataset.data.length);
          } else {
            dataset.backgroundColor = customColors[index];
          }
        } else {
          // Use palette colors
          if (type === 'pie' || type === 'donut') {
            // For pie/donut charts, generate colors for each data point
            dataset.backgroundColor = getColorPalette(customPalette, dataset.data.length);
          } else {
            // For other charts, use one color per dataset
            const colors = getColorPalette(customPalette, data.datasets.length);
            dataset.backgroundColor = colors[index];
          }
        }
        
        // Handle border colors
        if (dataset.borderColor) {
          if (type === 'pie' || type === 'donut') {
            // For pie/donut charts, borderColor should also be an array
            const baseColors = Array.isArray(dataset.backgroundColor) ? dataset.backgroundColor : [dataset.backgroundColor];
            dataset.borderColor = baseColors.map(color => 
              color?.replace('0.5', '1').replace('0.7', '1').replace('0.8', '1')
            );
          } else {
            const baseColor = Array.isArray(dataset.backgroundColor) ? dataset.backgroundColor[0] : dataset.backgroundColor;
            dataset.borderColor = baseColor?.replace('0.5', '1').replace('0.7', '1').replace('0.8', '1');
          }
        }
      });
    }
    
    // Add data-chartid to chart props
    const chartProps = {
      ref: chartRefs.current[chartId],
      'data-chartid': chartId,
      data: data,
      options: forExport ? getExportChartOptions(type, selectedCols) : {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { 
            display: showCustomLegend,
            labels: { color: theme.palette.text.primary } 
          },
          title: { 
            color: '#ffffff',
            display: true,
            text: getDefaultChartTitle(type, selectedCols),
            font: { size: 16, weight: 'bold' },
            padding: { top: 10, bottom: 10 }
          }
        },
        scales: {
          x: {
            grid: { 
              display: showCustomGrid,
              color: theme.palette.divider 
            },
            ticks: { color: theme.palette.text.primary },
            title: {
              display: true,
              text: axisLabels.x,
              color: forExport ? '#111' : theme.palette.text.primary,
              font: { size: 14, weight: 'bold' }
            }
          },
          y: {
            grid: { 
              display: showCustomGrid,
              color: theme.palette.divider 
            },
            ticks: { color: theme.palette.text.primary },
            title: {
              display: true,
              text: axisLabels.y,
              color: forExport ? '#111' : theme.palette.text.primary,
              font: { size: 14, weight: 'bold' }
            }
          }
        }
      }
    };
    
    // Debug: Log the title configuration
    console.log('Chart title config:', chartProps.options.plugins.title);
    console.log('Chart type:', type);
    console.log('Chart options:', chartProps.options);
    
    if (type === 'stackedBar') {
      return (
        <Box sx={{ height: '400px', width: '100%' }}>
          <Bar
            {...chartProps}
            options={{
              ...chartProps.options,
              plugins: {
                ...chartProps.options.plugins,
                title: { 
                  ...chartProps.options.plugins.title, 
                  display: true,
                  text: getDefaultChartTitle(type, selectedCols)
                }
              },
              scales: {
                ...chartProps.options.scales,
                x: { 
                  ...chartProps.options.scales.x, 
                  stacked: true,
                  title: {
                    display: true,
                    text: axisLabels.x,
                    color: forExport ? '#111' : '#fff',
                    font: { size: 14, weight: 'bold' }
                  }
                },
                y: { 
                  ...chartProps.options.scales.y, 
                  stacked: true,
                  title: {
                    display: true,
                    text: axisLabels.y,
                    color: forExport ? '#111' : '#fff',
                    font: { size: 14, weight: 'bold' }
                  }
                }
              }
            }}
          />
        </Box>
      );
    }
    if (type === 'groupedBar') {
      return (
        <Box sx={{ height: '400px', width: '100%' }}>
          <Bar {...chartProps} options={{
            ...chartProps.options,
                          plugins: {
                ...chartProps.options.plugins,
                title: { 
                  ...chartProps.options.plugins.title, 
                  display: true,
                  text: getDefaultChartTitle(type, selectedCols)
                }
              },
            scales: {
              ...chartProps.options.scales,
              x: {
                ...chartProps.options.scales.x,
                title: {
                  display: true,
                  text: axisLabels.x,
                  color: forExport ? '#111' : '#fff',
                  font: { size: 14, weight: 'bold' }
                }
              },
              y: {
                ...chartProps.options.scales.y,
                title: {
                  display: true,
                  text: axisLabels.y,
                  color: forExport ? '#111' : '#fff',
                  font: { size: 14, weight: 'bold' }
                }
              }
            }
          }} />
        </Box>
      );
    }
    if (type === 'correlation') {
      if (!data || !data.datasets || !data.datasets[0].data.length) return null;
      const matrixOptions = {
        responsive: true,
        layout: {
          padding: {
            top: 40,    
            bottom: 5  
          }
        },
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'Correlation Heatmap',
            font: { size: 14 },
            padding: { top: 20, bottom: 20 },
            color: forExport ? '#111' : theme.palette.text.primary
          },
          tooltip: { enabled: false },
          datalabels: {
            display: true,
            color: forExport ? '#111' : (theme.palette.mode === 'dark' ? 'white' : 'black'),
            font: { weight: 'bold', size: 12 },
            formatter: (value, ctx) => (ctx.raw && typeof ctx.raw.v === 'number' ? ctx.raw.v.toFixed(2) : ''),
          },
        },
        scales: {
          x: {
            type: 'category',
            labels: data.labels,
            position: 'bottom', // ensures labels are below the chart
            offset: true,      // adds spacing if needed
            title: { 
              display: true, 
              text: 'Features', 
              font: { size: 12 }, 
              color: forExport ? '#111' : theme.palette.text.primary 
            },
            grid: { display: false },
            ticks: { 
              font: { size: 10 }, 
              color: forExport ? '#111' : theme.palette.text.primary, 
              autoSkip: false, 
              maxRotation: 45, 
              minRotation: 45, 
              padding: 20 
            }
          },
          y: {
            type: 'category',
            labels: data.labels,
            title: { 
              display: true, 
              text: 'Features', 
              font: { size: 12 }, 
              color: forExport ? '#111' : theme.palette.text.primary 
            },
            grid: { display: false },
            ticks: { 
              font: { size: 10 }, 
              color: forExport ? '#111' : theme.palette.text.primary, 
              autoSkip: false 
            }
          }
        }
      };
      return (
        <Box sx={{ width: '100%', minHeight: '950px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box sx={{ height: '800px', width: '100%', mb: 0, overflow: 'visible', pb: 0 }}>  
            <ChartJS2 {...chartProps} type="matrix" options={matrixOptions} plugins={[ChartDataLabels]} />
          </Box>
          {/* Color legend for correlation heatmap */}
          <Box display="flex" flexDirection="column" alignItems="center" sx={{ mt: -2, width: '100%' }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5, fontWeight: 'bold' }}>
              Correlation Strength
            </Typography>

            <Box
              sx={{
                width: 300,
                height: 16,
                background: 'linear-gradient(to right, rgb(255,99,132) 0%, rgb(255,206,86) 50%, rgb(54,162,235) 100%)',
                borderRadius: 2,
                border: '1px solid #ccc',
                mx: 2
              }}
            />
            <Box mt={0.5} width={320} display="flex" flexDirection="row" justifyContent="space-between">
              <Typography variant="caption" sx={{ 
                color: forExport ? '#111' : theme.palette.text.primary, 
                fontWeight: 'bold' 
              }}>-1 (Strong Negative)</Typography>
              <Typography variant="caption" sx={{ 
                color: forExport ? '#111' : theme.palette.text.primary, 
                fontWeight: 'bold' 
              }}>0 (No Correlation)</Typography>
              <Typography variant="caption" sx={{ 
                color: forExport ? '#111' : theme.palette.text.primary, 
                fontWeight: 'bold' 
              }}>+1 (Strong Positive)</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1, mb: 2 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Settings />}
              onClick={() => handleOpenCustomize(chartId)}
            >
              Customize
            </Button>
          </Box>
        </Box>
      );
    }
    switch (type) {
      case 'bar':
        return (
          <Box sx={{ height: '400px', width: '100%' }}>
            <Bar {...chartProps} />
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1, mb: 2 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Settings />}
                onClick={() => handleOpenCustomize(chartId)}
              >
                Customize
              </Button>
            </Box>
          </Box>
        );
      case 'horizontalBar':
        return (
          <Box sx={{ height: '400px', width: '100%' }}>
            <Bar {...chartProps} options={{ 
              ...chartProps.options, 
              indexAxis: 'y',
              plugins: {
                ...chartProps.options.plugins,
                title: {
                  display: true,
                  text: getDefaultChartTitle(type, selectedCols)
                }
              },
              scales: {
                ...chartProps.options.scales,
                x: {
                  ...chartProps.options.scales.x,
                  title: {
                    display: true,
                    text: axisLabels.x,
                    color: forExport ? '#111' : '#fff',
                    font: { size: 14, weight: 'bold' }
                  }
                },
                y: {
                  ...chartProps.options.scales.y,
                  title: {
                    display: true,
                    text: axisLabels.y,
                    color: forExport ? '#111' : '#fff',
                    font: { size: 14, weight: 'bold' }
                  }
                }
              }
            }} />

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1, mb: 2 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Settings />}
                onClick={() => handleOpenCustomize(chartId)}
              >
                Customize
              </Button>
            </Box>
          </Box>
        );
      case 'pie':
        return (
          <Box sx={{ height: '400px', width: '100%' }}>
            <Pie {...chartProps} options={{
              ...chartProps.options,
              plugins: {
                ...chartProps.options.plugins,
                title: {
                  display: true,
                  text: getDefaultChartTitle(type, selectedCols)
                },
                datalabels: { color: forExport ? '#111' : theme.palette.text.primary, font: { weight: 'bold', size: 16 } }
              }
            }} plugins={[ChartDataLabels]} />
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1, mb: 2 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Settings />}
                onClick={() => handleOpenCustomize(chartId)}
              >
                Customize
              </Button>
            </Box>
          </Box>
        );
      case 'donut':
        return (
          <Box sx={{ height: '400px', width: '100%' }}>
            <Doughnut {...chartProps} options={{
              ...chartProps.options,
              plugins: {
                ...chartProps.options.plugins,
                title: {
                  display: true,
                  text: getDefaultChartTitle(type, selectedCols)
                },
                datalabels: { color: forExport ? '#111' : theme.palette.text.primary, font: { weight: 'bold', size: 16 } }
              }
            }} plugins={[ChartDataLabels]} />

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1, mb: 2 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Settings />}
                onClick={() => handleOpenCustomize(chartId)}
              >
                Customize
              </Button>
            </Box>
          </Box>
        );
      case 'histogram':
        return (
          <Box sx={{ height: '400px', width: '100%' }}>
            <Bar {...chartProps} options={{
              ...chartProps.options,
              plugins: {
                ...chartProps.options.plugins,
                title: {
                  display: true,
                  text: getDefaultChartTitle(type, selectedCols)
                }
              },
              scales: {
                ...chartProps.options.scales,
                x: {
                  ...chartProps.options.scales.x,
                  title: {
                    display: true,
                    text: axisLabels.x,
                    color: forExport ? '#111' : '#fff',
                    font: { size: 14, weight: 'bold' }
                  }
                },
                y: {
                  ...chartProps.options.scales.y,
                  title: {
                    display: true,
                    text: axisLabels.y,
                    color: forExport ? '#111' : '#fff',
                    font: { size: 14, weight: 'bold' }
                  }
                }
              }
            }} />
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1, mb: 2 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Settings />}
                onClick={() => handleOpenCustomize(chartId)}
              >
                Customize
              </Button>
            </Box>
          </Box>
        );
      case 'box':
        return (
          <Box sx={{ height: '400px', width: '100%' }}>
            <div data-chart-type="box" data-chart-id={chartId}>
              <Plot
                data={[ 
                  {
                    y: data.raw,
                    type: 'box',
                    name: data.labels[0],
                    boxpoints: 'outliers',
                    marker: { color: 'rgba(54, 162, 235, 0.5)' },
                    text: data.raw.map(() => ''),
                    hoverinfo: 'y+name',
                    hovertemplate: 
                      '<b>%{fullData.name}</b><br>' +
                      'Value: %{y}<br>' +
                      '<extra></extra>'
                  }
                ]}

                       layout={{
                title: {
                  text: getDefaultChartTitle(type, selectedCols),
                  font: { size: 16, color: theme.palette.text.primary }
                },
                xaxis: { title: axisLabels.x || 'Distribution' },
                yaxis: { title: axisLabels.y || `${data.labels[0]} (Value)` },
                  paper_bgcolor: 'transparent',
                  plot_bgcolor: 'transparent',
                  font: { color: theme.palette.text.primary },
                  annotations: [
                    {
                      x: 0.5,
                      y: 1.02,
                      xref: 'paper',
                      yref: 'paper',
                      text: `Min: ${Math.min(...data.raw).toFixed(2)} | Q1: ${data.datasets[0].data[0].q1.toFixed(2)} | Median: ${data.datasets[0].data[0].median.toFixed(2)} | Q3: ${data.datasets[0].data[0].q3.toFixed(2)} | Max: ${Math.max(...data.raw).toFixed(2)}`,
                      showarrow: false,
                      font: { 
                        size: 12, 
                        color: theme.palette.text.primary 
                      },
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)',
                      bordercolor: theme.palette.divider,
                      borderwidth: 1
                    }
                  ]
                }}
                style={{ width: '100%', height: 400 }}
                config={{ displayModeBar: false }}
              />
            </div>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1, mb: 2 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Settings />}
                onClick={() => handleOpenCustomize(chartId)}
              >
                Customize
              </Button>
            </Box>
          </Box>
        );
      case 'scatter':
        return (

          <Box sx={{ height: '450px', width: '100%' }}>
            <Scatter {...chartProps} options={{
              ...chartProps.options,
              plugins: {
                ...chartProps.options.plugins,
                title: {
                  display: true,
                  text: getDefaultChartTitle(type, selectedCols),
                  color: '#ffffff',
                  font: { size: 16, weight: 'bold' },
                  padding: { top: 10, bottom: 10 }
                }
              },
              scales: {
                ...chartProps.options.scales,
                x: {
                  ...chartProps.options.scales.x,
                  title: {
                    display: true,
                    text: axisLabels.x,
                    color: forExport ? '#111' : '#fff',
                    font: { size: 14, weight: 'bold' }
                  }
                },
                y: {
                  ...chartProps.options.scales.y,
                  title: {
                    display: true,
                    text: axisLabels.y,
                    color: forExport ? '#111' : '#fff',
                    font: { size: 14, weight: 'bold' }
                  }
                }
              }
            }} />
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1, mb: 2 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Settings />}
                onClick={() => handleOpenCustomize(chartId)}
              >
                Customize
              </Button>
            </Box>
          </Box>
        );
      case 'line':
        return (
          <Box sx={{ height: '400px', width: '100%' }}>
            <Line {...chartProps} options={{
              ...chartProps.options,
              plugins: {
                ...chartProps.options.plugins,
                title: {
                  display: true,
                  text: getDefaultChartTitle(type, selectedCols)
                }
              },
              scales: {
                ...chartProps.options.scales,
                x: {
                  ...chartProps.options.scales.x,
                  title: {
                    display: true,
                    text: axisLabels.x,
                    color: forExport ? '#111' : '#fff',
                    font: { size: 14, weight: 'bold' }
                  }
                },
                y: {
                  ...chartProps.options.scales.y,
                  title: {
                    display: true,
                    text: axisLabels.y,
                    color: forExport ? '#111' : '#fff',
                    font: { size: 14, weight: 'bold' }
                  }
                }
              }
            }} />
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1, mb: 2 }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Settings />}
                onClick={() => handleOpenCustomize(chartId)}
              >
                Customize
              </Button>
            </Box>
          </Box>
        );
      default:
        return null;
    }
  }

  // Add KPI to Report handler
  function handleAddKPIToReport(column, metric, result, checked) {
    const kpiId = `kpi:${column}:${metric}`;
    
    if (checked) {
      // Capture KPI card screenshot
      setChartCapturing(true);
      setExportingChartId(kpiId);
      
      setTimeout(() => {
        if (kpiRef.current) {
          html2canvas(kpiRef.current, {
            backgroundColor: null,
            scale: 2,
            useCORS: true,
            allowTaint: true
          }).then(canvas => {
            const image_base64 = canvas.toDataURL('image/png');
            let clean_base64 = image_base64;
            if (clean_base64.startsWith('data:image/png;base64,')) {
              clean_base64 = clean_base64.replace('data:image/png;base64,', '');
            }
            
            setChartsToReport({
              ...chartsToReport,
              [kpiId]: {
                selected: true,
                type: 'kpi',
                column: column,
                metric: metric,
                result: result,
                formattedResult: formatKPIResult(result, metric),
                recordCount: data.length,
                image_base64: clean_base64
              }
            });
          }).catch(error => {
            console.error('Error capturing KPI screenshot:', error);
            alert('Failed to capture KPI image. Please try again.');
          }).finally(() => {
            setChartCapturing(false);
            setExportingChartId(null);
          });
        } else {
          setChartCapturing(false);
          setExportingChartId(null);
          alert('KPI card not found. Please make sure the KPI is visible.');
        }
      }, 300); // Small delay to ensure the card is fully rendered
    } else {
      setChartsToReport({
        ...chartsToReport,
        [kpiId]: {
          selected: false
        }
      });
    }
  }

  // Add to Report handler for all chart types
  function handleAddToReport(type, selectedCols, checked) {
    const chartId = getChartId(type, selectedCols);
    const chartCustomOptions = customOptions[chartId] || {};
    if (checked) {
      setChartCapturing(true);
      setExportingChartId(chartId);
      setTimeout(async () => {
        try {
          let image_base64 = '';
          const ref = chartRefs.current[chartId];
          let chartInstance = ref?.current;
          
          // Handle Plotly charts (like boxplot) differently
          if (type === 'box') {
            try {
              // Find the specific Plotly chart container by chartId
              const plotlyContainer = document.querySelector(`[data-chart-id="${chartId}"]`) || 
                                    document.querySelector('[data-chart-type="box"]') ||
                                    document.querySelector('.js-plotly-plot');
              
              if (plotlyContainer) {
                console.log('Found Plotly container for chart:', chartId);
                const canvas = await html2canvas(plotlyContainer, {
                  backgroundColor: null,
                  scale: 2,
                  logging: false,
                  useCORS: true,
                  allowTaint: true
                });
                image_base64 = canvas.toDataURL('image/png');
                console.log('Successfully captured Plotly chart');
              } else {
                console.error('Could not find Plotly container for chart:', chartId);
              }
            } catch (e) {
              console.error('Plotly capture error:', e);
            }
          } else {
            // Try multiple methods to get the canvas for Chart.js charts
            let canvas = null;
            if (chartInstance?.canvas) {
              canvas = chartInstance.canvas;
            } else if (chartInstance?.chartInstance?.canvas) {
              canvas = chartInstance.chartInstance.canvas;
            } else if (ref?.current?.canvas) {
              canvas = ref.current.canvas;
            } else {
              // Try to find the canvas directly in the DOM
              const canvasElement = document.querySelector(`canvas[data-chartid="${chartId}"]`);
              if (canvasElement) {
                canvas = canvasElement;
              }
            }

            if (canvas) {
              try {
                image_base64 = canvas.toDataURL('image/png');
              } catch (e) {
                console.error('Canvas capture error:', e);
              }
            }
          }

          if (!image_base64 || image_base64 === 'data:image/png;base64,' || image_base64.length < 100) {
            alert('Failed to capture chart image. Please make sure the chart is visible before adding to report.');
            setChartsToReport({
              ...chartsToReport,
              [chartId]: {
                selected: false,
                image_base64: ''
              }
            });
          } else {
            let clean_base64 = image_base64;
            if (clean_base64.startsWith('data:image/png;base64,')) {
              clean_base64 = clean_base64.replace('data:image/png;base64,', '');
            }
            setChartsToReport({
              ...chartsToReport,
              [chartId]: {
                selected: checked,
                image_base64: clean_base64,
                type,
                columns: selectedCols,
                aggregationType: ['bar', 'horizontalBar', 'groupedBar', 'stackedBar', 'pie', 'donut'].includes(type) && selectedCols.filter(Boolean).length >= 1 ? aggregationType : undefined
              }
            });
          }
        } catch (error) {
          console.error('Error capturing chart:', error);
          alert('Failed to capture chart image. Please try again.');
        } finally {
          setExportingChartId(null);
          setChartCapturing(false);
        }
      }, 1000);
    } else {
      setChartsToReport({
        ...chartsToReport,
        [chartId]: {
          selected: false,
          image_base64: ''
        }
      });
    }
  }

  function handleOpenCustomize(chartId) {
    setCustomizeChartId(chartId);
    const existingOptions = customOptions[chartId] || {};
    
    // Only initialize colors if they were previously set
    let colors = existingOptions.colors || [];
    
    setTempCustomOptions({ 
      ...existingOptions,
      colors: colors
    });
    setCustomizeOpen(true);
  }
  function handleCloseCustomize() {
    setCustomizeOpen(false);
    setCustomizeChartId(null);
    setTempCustomOptions({});
  }
  function handleCustomizeChange(field, value) {
    setTempCustomOptions(prev => ({
      ...prev,
      [field]: value
    }));
  }
  function handleColorChange(index, color) {
    setTempCustomOptions(prev => {
      const colors = prev.colors ? [...prev.colors] : [];
      colors[index] = color;
      return { ...prev, colors };
    });
  }
  function handleSaveCustomize() {
    setCustomOptions(prev => ({
      ...prev,
      [customizeChartId]: tempCustomOptions
    }));
    setCustomizeOpen(false);
    setCustomizeChartId(null);
    setTempCustomOptions({});
  }

  // UI rendering
  if (loading) return <Box mt={4}><CircularProgress /></Box>;
  if (error) {
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
            Analysis Error
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            {error}
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
            Upload Dataset
          </Button>
        </Paper>
      </Box>
    );
  }

  // Show confirmation dialog if data is not cleaned and user hasn't confirmed
  if (showUncleanedDialog && !proceedUncleaned) {
    return (
      <Dialog open={showUncleanedDialog}>
        <DialogTitle>Proceed Without Cleaning?</DialogTitle>
        <DialogContent>
          <Typography>
            Your data has not been cleaned yet. Do you still wish to proceed to the Analysis page?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { window.location.href = '/cleaning'; }}>Go to Cleaning</Button>
          <Button onClick={() => { setProceedUncleaned(true); setShowUncleanedDialog(false); }} variant="contained" color="primary">Proceed to Analysis</Button>
        </DialogActions>
      </Dialog>
    );
  }

  // Group columns for display
  // Only allow numerical columns to be selected for correlation heatmap
  const filteredColumns = selectedChart === 'correlation'
    ? columns.filter(c => c.group === 'Numerical')
    : columns;
  const groupedColumns = groupOrder.map(group => ({
    group,
    cols: filteredColumns.filter(c => c.group === group)
  })).filter(g => g.cols.length > 0);

  // Compute isValidSelection for non-correlation chart types in byChart mode
  let isValidSelection = false;
  if (chartType && chartType !== 'correlation') {
    const combos = getCompatibleColumnsForChart(chartType, columns);
    isValidSelection = combos.some(combo => {
      if (combo.length !== chartColumns.length) return false;
      return combo.every((slot, idx) => slot.includes(chartColumns[idx]));
    });
    // Special logic for bar, pie, donut, etc. (if needed)
    let slotOptions = combos.reduce((a, b) => (a.length > b.length ? a : b), []);
    if (["bar", "horizontalBar", "pie", "donut"].includes(chartType)) {
      if (slotOptions.length === 1) {
        const catSlot = slotOptions[0];
        const numSlot = columns.filter(c => c.group === 'Numerical').map(c => c.name);
        slotOptions = [catSlot, numSlot];
      }
    }
    if (["bar", "horizontalBar"].includes(chartType)) {
      if (
        chartColumns.length === 2 &&
        chartColumns[0] &&
        (!chartColumns[1] || chartColumns[1] === '') &&
        slotOptions[0].includes(chartColumns[0])
      ) {
        isValidSelection = true;
      }
    }
    if (["pie", "donut"].includes(chartType)) {
      if (chartColumns.length === 2) {
        const validSingleCols = new Set([
          ...combos.flatMap(combo => combo.length === 1 ? combo[0] : []),
          ...combos.flatMap(combo => combo.length === 2 ? [combo[0], combo[1]] : []).flat()
        ]);
        if (
          (chartColumns[0] && (!chartColumns[1] || chartColumns[1] === '') && validSingleCols.has(chartColumns[0])) ||
          (chartColumns[1] && (!chartColumns[0] || chartColumns[0] === '') && validSingleCols.has(chartColumns[1]))
        ) {
          isValidSelection = true;
        }
      }
    }
  }

  const shouldShowChart = showChart || chartCapturing;

  // Helper function to check if correlation heatmap can be generated
  function canGenerateCorrelationHeatmap(selectedCols, cols) {
    const numCols = selectedCols.filter(col => {
      const colObj = cols.find(c => c.name === col);
      return colObj && colObj.group === 'Numerical';
    });
    return numCols.length >= 2;
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: theme.palette.mode === 'dark' 
        ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
        : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', 
      color: theme.palette.text.primary, 
      p: { xs: 2, sm: 3, md: 5 }
    }}>
      {/* Hero Section */}
      <Box sx={{ 
        textAlign: 'center', 
        mb: 4, 
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
        <Analytics sx={{ fontSize: 36, mb: 1, opacity: 0.9 }} />
        <Typography variant="h5" sx={{ 
          mb: 1, 
          fontWeight: 600,
          textShadow: '0 1px 3px rgba(0,0,0,0.3)'
        }}>
          Data Analysis
        </Typography>
        <Typography variant="body1" sx={{ 
          mb: 0, 
          opacity: 0.85,
          maxWidth: 500,
          mx: 'auto',
          fontSize: '0.95rem'
        }}>
          Explore, visualize, and analyze your dataset with interactive charts and statistical tools
        </Typography>
      </Box>
        
        {/* Remove always-visible filter/sort controls here */}

      <Card sx={{ 
        mb: 4,
        borderRadius: 3, 
        boxShadow: theme.palette.mode === 'dark'
          ? '0 8px 32px rgba(0,0,0,0.4)'
          : '0 8px 32px rgba(0,0,0,0.1)',
        border: theme.palette.mode === 'dark'
          ? '1px solid rgba(255,255,255,0.1)'
          : '1px solid rgba(255,255,255,0.2)',
        background: theme.palette.mode === 'dark'
          ? 'rgba(30, 30, 30, 0.95)'
          : 'rgba(255,255,255,0.95)'
      }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Settings sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Analysis Mode
            </Typography>
          </Box>
          <RadioGroup
            row
            value={mode}
            onChange={e => {
              setMode(e.target.value);
              setSelectedColumns([]);
              setSelectedChart('');
              setChartType('');
              setChartColumns([]);
              setSelectedKPIColumn('');
              setSelectedKPIMetric('');
              setKpiResult(null);
            }}
            sx={{ gap: 2 }}
          >
            <FormControlLabel 
              value="byColumn" 
              control={<Radio />} 
              label="Analysis by Column"
              sx={{
                p: 2,
                borderRadius: 2,
                border: mode === 'byColumn' ? '2px solid' : '1px solid',
                borderColor: mode === 'byColumn' ? 'primary.main' : 'divider',
                backgroundColor: mode === 'byColumn' 
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
              value="byChart" 
              control={<Radio />} 
              label="Analysis by Chart Type"
              sx={{
                p: 2,
                borderRadius: 2,
                border: mode === 'byChart' ? '2px solid' : '1px solid',
                borderColor: mode === 'byChart' ? 'primary.main' : 'divider',
                backgroundColor: mode === 'byChart' 
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
              value="kpi" 
              control={<Radio />} 
              label="KPI Analysis"
              sx={{
                p: 2,
                borderRadius: 2,
                border: mode === 'kpi' ? '2px solid' : '1px solid',
                borderColor: mode === 'kpi' ? 'primary.main' : 'divider',
                backgroundColor: mode === 'kpi' 
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

      {mode === 'byColumn' && (
        <Card sx={{ 
          mb: 4,
          borderRadius: 3, 
          boxShadow: theme.palette.mode === 'dark'
            ? '0 8px 32px rgba(0,0,0,0.4)'
            : '0 8px 32px rgba(0,0,0,0.1)',
          border: theme.palette.mode === 'dark'
            ? '1px solid rgba(255,255,255,0.1)'
            : '1px solid rgba(255,255,255,0.2)',
          background: theme.palette.mode === 'dark'
            ? 'rgba(30, 30, 30, 0.95)'
            : 'rgba(255,255,255,0.95)'
        }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <FilterList sx={{ mr: 2, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Select Columns
              </Typography>
              {selectedColumns.length > 0 && (
                <Chip 
                  label={`${selectedColumns.length} selected`} 
                  size="small" 
                  color="primary" 
                  sx={{ ml: 'auto' }}
                />
              )}
            </Box>
            <Grid container spacing={3}>
              {groupedColumns.map(g => (
                <Grid item xs={12} sm={6} md={3} key={g.group}>
                  <Typography variant="subtitle1" sx={{ 
                    fontWeight: 600, 
                    mb: 2,
                    color: 'text.secondary'
                  }}>
                    {g.group}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {g.cols.map(col => (
                      <Chip
                        key={col.name}
                        label={`${col.name} (${col.dtype})`}
                        color={selectedColumns.includes(col.name) ? 'primary' : 'default'}
                        variant={selectedColumns.includes(col.name) ? 'filled' : 'outlined'}
                        onClick={() => {
                          setSelectedColumns(selectedColumns.includes(col.name)
                            ? selectedColumns.filter(c => c !== col.name)
                            : [...selectedColumns, col.name]);
                          setShowChart(false); // Reset chart display when columns change
                        }}
                        sx={{ 
                          cursor: 'pointer',
                          '&:hover': {
                            transform: 'scale(1.05)',
                            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                          },
                          transition: 'all 0.2s ease'
                        }}
                      />
                    ))}
                  </Box>
                </Grid>
              ))}
            </Grid>
            <Divider sx={{ my: 3 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <ShowChart sx={{ mr: 2, color: 'primary.main' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Suggested Chart Types
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {suggestedCharts.length === 0 && (
                <Alert severity="info" sx={{ borderRadius: 2, width: '100%' }}>
                  Select columns to see chart suggestions.
                </Alert>
              )}
              {suggestedCharts.map(chart => (
                <Chip
                  key={chart}
                  label={chartTypeOptions.find(opt => opt.value === chart)?.label || chart}
                  color={selectedChart === chart ? 'primary' : 'default'}
                  variant={selectedChart === chart ? 'filled' : 'outlined'}
                  onClick={() => {
                    setSelectedChart(chart);
                    setShowChart(false); // Reset chart display when chart type changes
                  }}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'scale(1.05)',
                      boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                    },
                    transition: 'all 0.2s ease'
                  }}
                />
              ))}
            </Box>
            {/* Show filter/sort controls only if a chart is selected and columns are selected */}
            {selectedChart && selectedColumns.length > 0 && !['box', 'histogram'].includes(selectedChart) && (
              <Paper sx={{ p: 2, mt: 3, mb: 0, background: 'rgba(0,0,0,0.05)' }} elevation={0}>
                <Grid container spacing={3} alignItems="center">
                  {/* Aggregation toggle for relevant chart types */}
                {['bar', 'horizontalBar', 'groupedBar', 'stackedBar', 'pie', 'donut'].includes(selectedChart) && selectedColumns.length >= 1 && (
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth sx={{ minWidth: 200 }}>
                        <InputLabel>Aggregation</InputLabel>
                        <Select
                          value={aggregationType}
                          label="Aggregation"
                          onChange={e => {
                            setAggregationType(e.target.value);
                            setShowChart(false); // Reset chart display when aggregation changes
                          }}
                          sx={{ 
                            height: 56,
                            fontSize: '1rem'
                          }}
                        >
                          <MenuItem value="sum">Sum</MenuItem>
                          <MenuItem value="average">Average</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  )}
                  {/* Filter controls - exclude scatter plots, line charts, and correlation heatmaps */}
                  {!['scatter', 'line', 'correlation'].includes(selectedChart) && (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Filter by Top N Items"
                        type="number"
                        value={filterTop}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFilterTop(value);
                          setShowChart(false); // Reset chart display when filter changes
                        }}
                        inputProps={{ min: 1 }}
                        sx={{ minWidth: '200px' }}
                        placeholder="Number or empty for all"
                      />
                    </Grid>
                  )}
                  {/* Only show Sort Order for chart types where it makes sense (not line) */}
                  {['bar', 'horizontalBar', 'groupedBar', 'stackedBar', 'pie', 'donut'].includes(selectedChart) && (
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth sx={{ minWidth: '200px' }}>
                        <InputLabel>Sort Order</InputLabel>
                        <Select
                          value={sortOrder}
                          label="Sort Order"
                          onChange={(e) => {
                            setSortOrder(e.target.value);
                            setShowChart(false); // Reset chart display when sort changes
                          }}
                        >
                          <MenuItem value="none">No Sort</MenuItem>
                          <MenuItem value="asc">Ascending</MenuItem>
                          <MenuItem value="desc">Descending</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  )}
                  {/* Sum, Average, and Count display for any single-column chart */}
                  {selectedColumns.length === 1 && (() => {
                    const chartData = getChartData(selectedChart, selectedColumns);
                    const dataArr = chartData && chartData.datasets && chartData.datasets[0] ? chartData.datasets[0].data : [];
                    if (!dataArr.length) return null;
                    const isNumeric = dataArr.every(v => typeof v === 'number' && !isNaN(v));
                    if (isNumeric) {
                      const sum = dataArr.reduce((a, b) => a + b, 0);
                      const avg = sum / dataArr.length;
                      return (
                        <Grid item xs={12} sm={12} md={12} lg={12} sx={{ mt: 2 }}>
                          <Box display="flex" gap={4} alignItems="center">
                            <Typography variant="subtitle2">Sum: <b>{sum.toLocaleString(undefined, { maximumFractionDigits: 2 })}</b></Typography>
                            <Typography variant="subtitle2">Average: <b>{avg.toLocaleString(undefined, { maximumFractionDigits: 2 })}</b></Typography>
                            <Typography variant="subtitle2">Count: <b>{dataArr.length.toLocaleString()}</b></Typography>
                          </Box>
                        </Grid>
                      );
                    } else {
                      return (
                        <Grid item xs={12} sm={12} md={12} lg={12} sx={{ mt: 2 }}>
                          <Box display="flex" gap={4} alignItems="center">
                            <Typography variant="subtitle2">Count: <b>{dataArr.length.toLocaleString()}</b></Typography>
                          </Box>
                        </Grid>
                      );
                    }
                  })()}
                </Grid>
              </Paper>
            )}
            {selectedChart && (selectedChart !== 'correlation' || canGenerateCorrelationHeatmap(selectedColumns, columns)) && (
              <Button variant="contained" sx={{ mt: 2 }} onClick={() => setShowChart(true)}>Generate Chart</Button>
            )}
            {shouldShowChart && selectedChart && selectedColumns.length > 0 && (selectedChart !== 'correlation' || canGenerateCorrelationHeatmap(selectedColumns, columns)) && (
              <Box mt={4} sx={{ 
                maxWidth: selectedChart === 'correlation' ? '1000px' : '800px', 
                minHeight: selectedChart === 'correlation' ? '800px' : 'auto',
                maxHeight: selectedChart === 'correlation' ? 'none' : '500px',
                mx: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: selectedChart === 'correlation' ? 3 : 0
              }}>
                {renderChart(selectedChart, selectedColumns, exportingChartId === getChartId(selectedChart, selectedColumns, filterTop, sortOrder), getChartId(selectedChart, selectedColumns, filterTop, sortOrder))}
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!chartsToReport[getChartId(selectedChart, selectedColumns)]?.selected}
                      onChange={e => handleAddToReport(selectedChart, selectedColumns, e.target.checked)}
                      sx={{ 
                        color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                        '&.Mui-checked': { 
                          color: theme.palette.mode === 'dark' ? '#1976d2' : '#1976d2'
                        }
                      }}
                    />
                  }
                  label="Add to Report"
                  sx={{ 
                    mt: 2,
                    color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.7)'
                  }}
                />
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {mode === 'byChart' && (
        <Card sx={{ 
          mb: 4,
          borderRadius: 3, 
          boxShadow: theme.palette.mode === 'dark'
            ? '0 8px 32px rgba(0,0,0,0.4)'
            : '0 8px 32px rgba(0,0,0,0.1)',
          border: theme.palette.mode === 'dark'
            ? '1px solid rgba(255,255,255,0.1)'
            : '1px solid rgba(255,255,255,0.2)',
          background: theme.palette.mode === 'dark'
            ? 'rgba(30, 30, 30, 0.95)'
            : 'rgba(255,255,255,0.95)'
        }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <BarChart sx={{ mr: 2, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Select Chart Type
              </Typography>
            </Box>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Chart Type</InputLabel>
              <Select
                value={chartType}
                label="Chart Type"
                onChange={e => {
                  setChartType(e.target.value);
                  setChartColumns([]);
                  setShowChart(false);
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
            {/* Correlation Heatmap: Multi-select for numerical columns only */}
            {chartType === 'correlation' ? (
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="correlation-columns-label">Numerical Columns</InputLabel>
                <Select
                  labelId="correlation-columns-label"
                  id="correlation-columns"
                  label="Numerical Columns"
                  multiple
                  value={chartColumns}
                  onChange={e => setChartColumns(e.target.value)}
                  renderValue={selected => selected.join(', ')}
                >
                  {columns.filter(c => c.group === 'Numerical').map(col => (
                    <MenuItem key={col.name} value={col.name}>
                      {col.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              // ...existing ColumnDropdowns logic for other chart types...
              <ColumnDropdowns
                chartType={chartType}
                columns={columns}
                combos={getCompatibleColumnsForChart(chartType, columns)}
                chartColumns={chartColumns}
                setChartColumns={setChartColumns}
              />
            )}
            {/* Show filter/sort controls only if chartType and columns are selected and valid */}
            {((chartType === 'correlation' && chartColumns.length >= 2) || (chartType !== 'correlation' && isValidSelection && !['box', 'histogram'].includes(chartType))) && (
              <Paper sx={{ p: 2, mt: 3, mb: 0, background: 'rgba(0,0,0,0.05)' }} elevation={0}>
                <Grid container spacing={3} alignItems="center">
                  {/* Aggregation toggle for relevant chart types */}
                  {['bar', 'horizontalBar', 'groupedBar', 'stackedBar', 'pie', 'donut'].includes(chartType) && chartColumns.filter(Boolean).length >= 1 && (
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth sx={{ minWidth: 200 }}>
                        <InputLabel>Aggregation</InputLabel>
                        <Select
                          value={aggregationType}
                          label="Aggregation"
                          onChange={e => {
                            setAggregationType(e.target.value);
                            setShowChart(false); // Reset chart display when aggregation changes
                          }}
                          sx={{ 
                            height: 56,
                            fontSize: '1rem'
                          }}
                        >
                          <MenuItem value="sum">Sum</MenuItem>
                          <MenuItem value="average">Average</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  )}
                  {/* Filter controls - exclude scatter plots, line charts, and correlation heatmaps */}
                  {!['scatter', 'line', 'correlation'].includes(chartType) && (
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        label="Filter by Top N Items"
                        type="number"
                        value={filterTop}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFilterTop(value);
                          setShowChart(false); // Reset chart display when filter changes
                        }}
                        inputProps={{ min: 1 }}
                        sx={{ minWidth: '200px' }}
                        placeholder="Number or empty for all"
                      />
                    </Grid>
                  )}
                  {/* Only show Sort Order for chart types where it makes sense (not line) */}
                  {['bar', 'horizontalBar', 'groupedBar', 'stackedBar', 'pie', 'donut'].includes(chartType) && (
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth sx={{ minWidth: '200px' }}>
                        <InputLabel>Sort Order</InputLabel>
                        <Select
                          value={sortOrder}
                          label="Sort Order"
                          onChange={(e) => {
                            setSortOrder(e.target.value);
                            setShowChart(false); // Reset chart display when sort changes
                          }}
                        >
                          <MenuItem value="none">No Sort</MenuItem>
                          <MenuItem value="asc">Ascending</MenuItem>
                          <MenuItem value="desc">Descending</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  )}
                  {/* Sum, Average, and Count display for any single-column chart in byChart mode */}
                  {chartColumns.length === 1 && (() => {
                    const chartData = getChartData(chartType, chartColumns);
                    const dataArr = chartData && chartData.datasets && chartData.datasets[0] ? chartData.datasets[0].data : [];
                    if (!dataArr.length) return null;
                    const isNumeric = dataArr.every(v => typeof v === 'number' && !isNaN(v));
                    if (isNumeric) {
                      const sum = dataArr.reduce((a, b) => a + b, 0);
                      const avg = sum / dataArr.length;
                      return (
                        <Grid item xs={12} sm={12} md={12} lg={12} sx={{ mt: 2 }}>
                          <Box display="flex" gap={4} alignItems="center">
                            <Typography variant="subtitle2">Sum: <b>{sum.toLocaleString(undefined, { maximumFractionDigits: 2 })}</b></Typography>
                            <Typography variant="subtitle2">Average: <b>{avg.toLocaleString(undefined, { maximumFractionDigits: 2 })}</b></Typography>
                            <Typography variant="subtitle2">Count: <b>{dataArr.length.toLocaleString()}</b></Typography>
                          </Box>
                        </Grid>
                      );
                    } else {
                      return (
                        <Grid item xs={12} sm={12} md={12} lg={12} sx={{ mt: 2 }}>
                          <Box display="flex" gap={4} alignItems="center">
                            <Typography variant="subtitle2">Count: <b>{dataArr.length.toLocaleString()}</b></Typography>
                          </Box>
                        </Grid>
                      );
                    }
                  })()}
                </Grid>
              </Paper>
            )}
            <Button
              variant="contained"
              sx={{ mt: 2 }}
              disabled={chartType === 'correlation' ? chartColumns.length < 2 : !isValidSelection}
              onClick={() => {
                // Before generating the chart, add debug print
                console.log('DEBUG: chartType', chartType, 'chartColumns', chartColumns);
                setShowChart(true);
              }}
            >
              Generate Chart
            </Button>
            {shouldShowChart && chartType && ((chartType === 'correlation' && chartColumns.length >= 2) || (chartType !== 'correlation' && isValidSelection)) && (
              <Box mt={4} sx={{ maxWidth: '800px', minHeight: chartType === 'correlation' ? '700px' : 'auto', mx: 'auto' }}>
                {renderChart(chartType, chartColumns.filter(Boolean), exportingChartId === getChartId(chartType, chartColumns.filter(Boolean), filterTop, sortOrder), getChartId(chartType, chartColumns.filter(Boolean), filterTop, sortOrder))}
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!chartsToReport[getChartId(chartType, chartColumns.filter(Boolean))]?.selected}
                      onChange={e => handleAddToReport(chartType, chartColumns.filter(Boolean), e.target.checked)}
                      sx={{ 
                        color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                        '&.Mui-checked': { 
                          color: theme.palette.mode === 'dark' ? '#1976d2' : '#1976d2'
                        }
                      }}
                    />
                  }
                  label="Add to Report"
                  sx={{ 
                    mt: 2,
                    color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.7)'
                  }}
                />
              </Box>
            )}
          </>
        )}
        </CardContent>
      </Card>
      )}

      {mode === 'kpi' && (
        <Card sx={{ 
          mb: 4,
          borderRadius: 3, 
          boxShadow: theme.palette.mode === 'dark'
            ? '0 8px 32px rgba(0,0,0,0.4)'
            : '0 8px 32px rgba(0,0,0,0.1)',
          border: theme.palette.mode === 'dark'
            ? '1px solid rgba(255,255,255,0.1)'
            : '1px solid rgba(255,255,255,0.2)',
          background: theme.palette.mode === 'dark'
            ? 'rgba(30, 30, 30, 0.95)'
            : 'rgba(255,255,255,0.95)'
        }}>
          <CardContent sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Analytics sx={{ mr: 2, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Key Performance Indicators
              </Typography>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth sx={{ minWidth: 250 }}>
                  <InputLabel>Select Column</InputLabel>
                  <Select
                    value={selectedKPIColumn}
                    label="Select Column"
                    sx={{ minHeight: 56 }}
                    onChange={e => {
                      setSelectedKPIColumn(e.target.value);
                      setSelectedKPIMetric('');
                      setKpiResult(null);
                    }}
                    slotProps={{
                      paper: {
                        sx: {
                          minWidth: 400,
                          maxWidth: 600
                        }
                      }
                    }}
                  >
                    {columns.map(col => (
                      <MenuItem key={col.name} value={col.name}>
                        {col.name} ({col.group})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControl fullWidth disabled={!selectedKPIColumn} sx={{ minWidth: 250 }}>
                  <InputLabel>Performance Indicator</InputLabel>
                  <Select
                    value={selectedKPIMetric}
                    label="Performance Indicator"
                    sx={{ minHeight: 56 }}
                    onChange={e => {
                      setSelectedKPIMetric(e.target.value);
                      const result = calculateKPI(selectedKPIColumn, e.target.value);
                      setKpiResult(result);
                    }}
                    slotProps={{
                      paper: {
                        sx: {
                          minWidth: 300,
                          maxWidth: 500
                        }
                      }
                    }}
                  >
                    {getAvailableKPIMetrics(selectedKPIColumn).map(metric => (
                      <MenuItem key={metric} value={metric}>
                        {metric.charAt(0).toUpperCase() + metric.slice(1).replace(/([A-Z])/g, ' $1')}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {kpiResult !== null && selectedKPIColumn && selectedKPIMetric && (
              <Box sx={{ mt: 4 }}>
                <Card ref={kpiRef} sx={{
                  p: 4,
                  borderRadius: 3,
                  background: theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, #2d1b69 0%, #11998e 100%)'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  textAlign: 'center',
                  boxShadow: theme.palette.mode === 'dark'
                    ? '0 8px 32px rgba(45, 27, 105, 0.4)'
                    : '0 8px 32px rgba(102, 126, 234, 0.4)',
                }}>
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                    {selectedKPIMetric.charAt(0).toUpperCase() + selectedKPIMetric.slice(1).replace(/([A-Z])/g, ' $1')} of {selectedKPIColumn}
                  </Typography>
                  <Typography variant="h2" sx={{ fontWeight: 700, mb: 1 }}>
                    {formatKPIResult(kpiResult, selectedKPIMetric)}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Based on {data.length} records
                  </Typography>
                </Card>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!chartsToReport[`kpi:${selectedKPIColumn}:${selectedKPIMetric}`]?.selected}
                      onChange={e => handleAddKPIToReport(selectedKPIColumn, selectedKPIMetric, kpiResult, e.target.checked)}
                      sx={{ 
                        color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                        '&.Mui-checked': { 
                          color: theme.palette.mode === 'dark' ? '#1976d2' : '#1976d2'
                        }
                      }}
                    />
                  }
                  label="Add to Report"
                  sx={{ 
                    mt: 2,
                    color: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.7)'
                  }}
                />
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      <Card sx={{ 
        mb: 4,
        borderRadius: 3, 
        boxShadow: theme.palette.mode === 'dark'
          ? '0 8px 32px rgba(0,0,0,0.4)'
          : '0 8px 32px rgba(0,0,0,0.1)',
        border: theme.palette.mode === 'dark'
          ? '1px solid rgba(255,255,255,0.1)'
          : '1px solid rgba(255,255,255,0.2)',
        background: theme.palette.mode === 'dark'
          ? 'rgba(30, 30, 30, 0.95)'
          : 'rgba(255,255,255,0.95)'
      }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <TableChart sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Data Preview
            </Typography>
          </Box>
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
        </CardContent>
      </Card>
      <Card sx={{ 
        mb: 4,
        borderRadius: 3, 
        boxShadow: theme.palette.mode === 'dark'
          ? '0 8px 32px rgba(0,0,0,0.4)'
          : '0 8px 32px rgba(0,0,0,0.1)',
        border: theme.palette.mode === 'dark'
          ? '1px solid rgba(255,255,255,0.1)'
          : '1px solid rgba(255,255,255,0.2)',
        background: theme.palette.mode === 'dark'
          ? 'rgba(30, 30, 30, 0.95)'
          : 'rgba(255,255,255,0.95)'
      }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <BarChart sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Charts & KPIs Added to Report
            </Typography>
            <Chip 
              label={Object.keys(chartsToReport).filter(key => chartsToReport[key]?.selected).length} 
              size="small" 
              color="primary" 
              sx={{ ml: 'auto' }}
            />
          </Box>
          {Object.keys(chartsToReport).filter(key => chartsToReport[key]?.selected).length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              No charts or KPIs added yet. Create charts or calculate KPIs above and select "Add to Report" to include them.
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {Object.keys(chartsToReport).filter(key => chartsToReport[key]?.selected).map(key => {
                const item = chartsToReport[key];
                let displayText = '';
                let iconColor = 'primary.main';
                
                if (item.type === 'kpi') {
                  // Handle KPI display
                  displayText = `KPI: ${item.metric.charAt(0).toUpperCase() + item.metric.slice(1).replace(/([A-Z])/g, ' $1')} of ${item.column} = ${item.formattedResult}`;
                  iconColor = 'success.main';
                } else {
                  // Handle chart display (original logic)
                  const parts = key.split(':');
                  const chartType = parts[0];
                  const columns = parts[1]?.split(',') || [];
                  const filter = parts[2]?.replace('filter=','') || '';
                  const sort = parts[3]?.replace('sort=','') || '';
                  const agg = parts[4]?.replace('agg=','') || '';
                  
                  displayText = `Chart: ${chartType} - ${columns.join(', ')}`;
                  if (filter) displayText += ` (filter: ${filter})`;
                  if (sort) displayText += ` (sort: ${sort})`;
                  if (agg) displayText += ` (${agg})`;
                }
                
                return (
                  <Box key={key} sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: theme.palette.mode === 'dark'
                      ? 'rgba(255,255,255,0.05)'
                      : 'rgba(0,0,0,0.02)',
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <Box sx={{ 
                      width: 8, 
                      height: 8, 
                      borderRadius: '50%', 
                      backgroundColor: iconColor
                    }} />
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {displayText}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          )}
        </CardContent>
      </Card>
      {/* Button to move to Export Page */}
      <Box sx={{ mt: 6, mb: 4, textAlign: 'center' }}>
        <Button
          component={Link}
          to="/export"
          variant="contained"
          size="large"
          startIcon={<ShowChart />}
          sx={{ 
            px: 6,
            py: 2,
            borderRadius: 3,
            fontWeight: 600,
            fontSize: '1.1rem',
            textTransform: 'none',
            background: theme.palette.mode === 'dark'
              ? 'linear-gradient(135deg, #2d1b69 0%, #11998e 100%)'
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            boxShadow: theme.palette.mode === 'dark'
              ? '0 8px 32px rgba(45, 27, 105, 0.4)'
              : '0 8px 32px rgba(102, 126, 234, 0.4)',
            '&:hover': {
              background: theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, #3d2b79 0%, #21a89e 100%)'
                : 'linear-gradient(135deg, #7c92ff 0%, #8a5fb7 100%)',
              transform: 'translateY(-2px)',
              boxShadow: theme.palette.mode === 'dark'
                ? '0 12px 40px rgba(45, 27, 105, 0.6)'
                : '0 12px 40px rgba(102, 126, 234, 0.6)',
            }
          }}
        >
          Go to Export Page
        </Button>
      </Box>
      <Dialog open={customizeOpen} onClose={handleCloseCustomize} maxWidth="sm" fullWidth>
        <DialogTitle>Customize Chart</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={tempCustomOptions.legend ?? true}
                  onChange={e => handleCustomizeChange('legend', e.target.checked)}
                />
              }
              label="Show Legend"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={tempCustomOptions.grid ?? true}
                  onChange={e => handleCustomizeChange('grid', e.target.checked)}
                />
              }
              label="Show Gridlines"
            />
            {/* Color scheme dropdown */}
            <FormControl fullWidth>
              <InputLabel>Color Scheme</InputLabel>
              <Select
                value={tempCustomOptions.palette || 'default'}
                label="Color Scheme"
                onChange={e => handleCustomizeChange('palette', e.target.value)}
              >
                <MenuItem value="default">Default</MenuItem>
                <MenuItem value="pastel">Pastel</MenuItem>
                <MenuItem value="bold">Bold</MenuItem>
                <MenuItem value="dark">Dark</MenuItem>
              </Select>
            </FormControl>
            {/* Custom Color picker - only show for charts that support custom color customization */}
            {(() => {
              const chartType = customizeChartId ? customizeChartId.split(':')[0] : '';
              const chartsWithoutCustomColor = ['pie', 'donut', 'box', 'groupedBar', 'stackedBar', 'correlation'];
              
              if (!chartsWithoutCustomColor.includes(chartType)) {
                return (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Custom Color</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                      <SketchPicker
                        color={tempCustomOptions.colors?.[0] || '#36a2eb'}
                        onChange={c => handleColorChange(0, c.hex)}
                        presetColors={['#36a2eb', '#ff6384', '#ffce56', '#4bc0c0', '#9966ff', '#ff9f40']}
                        disableAlpha
                      />
                      <TextField
                        label={`Color Code`}
                        value={tempCustomOptions.colors?.[0] || ''}
                        onChange={e => handleColorChange(0, e.target.value)}
                        sx={{ width: 140 }}
                      />
                    </Box>
                  </Box>
                );
              }
              return null;
            })()}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setCustomOptions(prev => {
              const updated = { ...prev };
              delete updated[customizeChartId];
              return updated;
            });
            setTempCustomOptions({ legend: true, grid: true, palette: 'default' });
          }}>Reset</Button>
          <Button onClick={handleCloseCustomize}>Cancel</Button>
          <Button onClick={handleSaveCustomize} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default AnalysisPage;
