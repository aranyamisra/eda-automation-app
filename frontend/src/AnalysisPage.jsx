import React, { useEffect, useState, useMemo, useRef } from 'react';
import ColumnDropdowns from './ColumnDropdowns';
import { Bar, Pie, Doughnut, Line, Scatter, Chart as ChartJS2 } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { MatrixController, MatrixElement } from 'chartjs-chart-matrix';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Checkbox } from '@mui/material';
import { useChartsToReport } from './ChartsToReportContext';
import { Link } from 'react-router-dom';
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
} from '@mui/material';
import axios from 'axios';
import 'chartjs-chart-box-and-violin-plot';
import Plot from 'react-plotly.js';


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
  if (v < 0) {
    // -1 to 0: red to yellow
    return interpolateColor(red, yellow, v + 1);
  } else {
    // 0 to 1: yellow to blue
    return interpolateColor(yellow, blue, v);
  }
}

Chart.register(MatrixController, MatrixElement);

Chart.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend);

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
  // Correlation heatmap
  if (num === selectedColumns.length && num >= 2) charts.push('correlation');
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

  
  // New state variables for filtering and sorting
  const [filterTop, setFilterTop] = useState('');
  const [sortOrder, setSortOrder] = useState('none'); // Default to no sort

  // Chart refs for all chart types
  const chartRefs = useRef({});
  const [aggregationType, setAggregationType] = useState('sum'); // 'sum' or 'average'
  const [chartCapturing, setChartCapturing] = useState(false);

  // Clean up chart refs when component unmounts
  useEffect(() => {
    return () => {
      chartRefs.current = {};
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    axios.get('http://localhost:5001/analysis', { withCredentials: true })
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
        setError(err.response?.data?.error || 'Failed to load analysis metadata');
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
      const binCount = Math.min(20, Math.max(5, Math.ceil(Math.sqrt(arr.length))));
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
        // Show as [from, to)
        return `${from.toFixed(1)} - ${to.toFixed(1)}`;
      });
      
      // For histogram, we can sort by bin values
      const { labels: filteredLabels, data: filteredData } = applyFilterAndSort(labels, bins);
      
      return {
        labels: filteredLabels,
        datasets: [{
          label: numCol,
          data: filteredData,
          backgroundColor: 'rgba(255, 206, 86, 0.5)'
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
      
      // Apply top filter for line charts
      if (filterTop && filterTop !== '') {
        const topCount = parseInt(filterTop);
        arr = arr.slice(0, topCount);
      }
      
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
      for (let i = 0; i < numCols.length; i++) {
        for (let j = 0; j < numCols.length; j++) {
          const colX = numCols[i];
          const colY = numCols[j];
          const xVals = arr.map(row => row[colX]);
          const yVals = arr.map(row => row[colY]);
          const corr = pearsonPairs(xVals, yVals);
          matrixData.push({ x: colX, y: colY, v: corr });
        }
      }
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
          backgroundColor: ctx => {
            const v = ctx.raw.v;
            return getCorrelationColor(v);
          },
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

  // Helper to get chartId for current chart
  function getChartId(type, cols, filterTop, sortOrder) {
    const baseId = `${type}:${cols.join(',')}:filter=${filterTop}:sort=${sortOrder}`;
    // Add aggregation type to chart ID if applicable
    if (['bar', 'horizontalBar', 'groupedBar', 'stackedBar', 'pie', 'donut'].includes(type) && cols.length >= 2) {
      return `${baseId}:agg=${aggregationType}`;
    }
    return baseId;
  }

  // Helper to get Chart.js options with black text/grid for export
  function getExportChartOptions() {
    return {
      responsive: true,
      plugins: {
        legend: { labels: { color: '#111' } },
        title: { color: '#111' },
        datalabels: { color: '#111', font: { weight: 'bold', size: 16 } }
      },
      scales: {
        x: {
          grid: { color: '#333' },
          ticks: { color: '#111' },
          title: { color: '#111' }
        },
        y: {
          grid: { color: '#333' },
          ticks: { color: '#111' },
          title: { color: '#111' }
        }
      }
    };
  }

  function renderChart(type, selectedCols, forExport = false) {
    const data = getChartData(type, selectedCols);
    if (!data) return null;
    
    const chartId = getChartId(type, selectedCols, filterTop, sortOrder);
    
    // Ensure chart ref exists
    if (!chartRefs.current[chartId]) {
      chartRefs.current[chartId] = React.createRef();
    }
    
    // Add data-chartid to chart props
    const chartProps = {
      ref: chartRefs.current[chartId],
      'data-chartid': chartId,
      data: data,
      options: forExport ? getExportChartOptions() : {
        responsive: true,
        plugins: {
          legend: { labels: { color: '#fff' } },
          title: { color: '#fff' }
        },
        scales: {
          x: {
            grid: { color: '#fff' },
            ticks: { color: '#fff' },
            title: { color: '#fff' }
          },
          y: {
            grid: { color: '#fff' },
            ticks: { color: '#fff' },
            title: { color: '#fff' }
          }
        }
      }
    };
    if (type === 'stackedBar') {
      return (
        <Bar
          {...chartProps}
          options={{
            ...chartProps.options,
            plugins: {
              ...chartProps.options.plugins,
              title: { ...chartProps.options.plugins.title, display: true, text: data.datasets[0]?.label || '' }
            },
            scales: {
              ...chartProps.options.scales,
              x: { ...chartProps.options.scales.x, stacked: true },
              y: { ...chartProps.options.scales.y, stacked: true }
            }
          }}
        />
      );
    }
    if (type === 'groupedBar') {
      return <Bar {...chartProps} />;
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
            font: { size: 22 },
            padding: { top: 20, bottom: 20 }
          },
          tooltip: { enabled: false },
          datalabels: {
            display: true,
            color: 'white',
            font: { weight: 'bold', size: 16 },
            formatter: (value, ctx) => (ctx.raw && typeof ctx.raw.v === 'number' ? ctx.raw.v.toFixed(2) : ''),
          },
        },
        scales: {
          x: {
            type: 'category',
            labels: data.labels,
            position: 'bottom', // ensures labels are below the chart
            offset: true,      // adds spacing if needed
            title: { display: true, text: 'Features', font: { size: 16 }, color: '#fff' },
            grid: { display: false },
            ticks: { font: { size: 14 }, color: '#fff', autoSkip: false, maxRotation: 45, minRotation: 45, padding: 20 }
          },
          y: {
            type: 'category',
            labels: data.labels,
            title: { display: true, text: 'Features', font: { size: 16 }, color: '#fff' },
            grid: { display: false },
            ticks: { font: { size: 14 }, color: '#fff', autoSkip: false }
          }
        }
      };
      return (
        <Box>
          <ChartJS2 {...chartProps} type="matrix" options={matrixOptions} plugins={[ChartDataLabels]} />
          {/* Color legend for correlation heatmap */}
          <Box mt={2} display="flex" flexDirection="column" alignItems="center" justifyContent="center">
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
            <Box mt={0.5} width={300} display="flex" flexDirection="row" justifyContent="space-between">
              <span style={{ color: '#fff', fontWeight: 'bold' }}>-1</span>
              <span style={{ color: '#fff', fontWeight: 'bold' }}>0</span>
              <span style={{ color: '#fff', fontWeight: 'bold' }}>+1</span>
            </Box>
          </Box>
        </Box>
      );
    }
    switch (type) {
      case 'bar':
        return <Bar {...chartProps} />;
      case 'horizontalBar':
        return <Bar {...chartProps} options={{ ...chartProps.options, indexAxis: 'y' }} />;
      case 'pie':
        return <Pie {...chartProps} options={{
          ...chartProps.options,
          plugins: {
            ...chartProps.options.plugins,
            datalabels: { color: forExport ? '#111' : '#fff', font: { weight: 'bold', size: 16 } }
          }
        }} plugins={[ChartDataLabels]} />;
      case 'donut':
        return <Doughnut {...chartProps} options={{
          ...chartProps.options,
          plugins: {
            ...chartProps.options.plugins,
            datalabels: { color: forExport ? '#111' : '#fff', font: { weight: 'bold', size: 16 } }
          }
        }} plugins={[ChartDataLabels]} />;
      case 'histogram':
        return <Bar {...chartProps} options={chartProps.options} />;
      case 'box':
        return <Plot
          data={[ 
            {
              y: data.raw,
              type: 'box',
              name: data.labels[0],
              boxpoints: 'outliers',
              marker: { color: 'rgba(54, 162, 235, 0.5)' }
            }
          ]}
          layout={{
            title: `Box Plot of ${data.labels[0]}`,
            yaxis: { title: data.labels[0] },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: { color: '#fff' }
          }}
          style={{ width: '100%', height: 400 }}
          config={{ displayModeBar: false }}
        />;
      case 'scatter':
        return <Scatter {...chartProps} options={chartProps.options} />;
      case 'line':
        return <Line {...chartProps} options={chartProps.options} />;
      default:
        return null;
    }
  }

  // Add to Report handler for all chart types
  function handleAddToReport(type, selectedCols, checked) {
    const chartId = getChartId(type, selectedCols, filterTop, sortOrder);
    if (checked) {
      setChartCapturing(true);
      setExportingChartId(chartId);
      
      setTimeout(() => {
        try {
          let image_base64 = '';
          const ref = chartRefs.current[chartId];
          let chartInstance = ref?.current;
          
          // Try multiple methods to get the canvas
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
                aggregationType: ['bar', 'horizontalBar', 'groupedBar', 'stackedBar', 'pie', 'donut'].includes(type) && selectedCols.length >= 2 ? aggregationType : undefined
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

  // UI rendering
  if (loading) return <Box mt={4}><CircularProgress /></Box>;
  if (error) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 5 }}>
        <Paper sx={{ p: 4, borderRadius: 2, textAlign: 'center', maxWidth: 400 }} elevation={3}>
          <Typography variant="h5" color="error" sx={{ mb: 2 }}>
            No dataset uploaded
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Please upload a dataset before analyzing your data.
          </Typography>
          <Button variant="contained" color="primary" href="/upload" sx={{ fontWeight: 700, fontSize: 16, borderRadius: 2 }}>
            Go to Upload Page
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

  return (
    <Box p={5}>
        <Typography variant="h4" gutterBottom>
          Data Analysis
          </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Explore, visualize, and analyze your cleaned dataset using interactive charts and statistical tools. Uncover patterns, relationships, and trends to gain deeper insights from your data.
        </Typography>
        
        {/* Remove always-visible filter/sort controls here */}

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
            {/* Show filter/sort controls only if a chart is selected and columns are selected */}
            {selectedChart && selectedColumns.length > 0 && selectedChart !== 'box' && (
              <Paper sx={{ p: 2, mt: 3, mb: 0, background: 'rgba(0,0,0,0.05)' }} elevation={0}>
                <Grid container spacing={3} alignItems="center">
                  {/* Aggregation toggle for relevant chart types */}
                {['bar', 'horizontalBar', 'groupedBar', 'stackedBar', 'pie', 'donut'].includes(selectedChart) && selectedColumns.length >= 2 && (
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Aggregation</InputLabel>
                        <Select
                          value={aggregationType}
                          label="Aggregation"
                          onChange={e => setAggregationType(e.target.value)}
                        >
                          <MenuItem value="sum">Sum</MenuItem>
                          <MenuItem value="average">Average</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  )}
                  {/* Filter controls - exclude scatter plots */}
                  {!['scatter'].includes(selectedChart) && (
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth sx={{ minWidth: '200px' }}>
                        <InputLabel>Filter by Top N Items</InputLabel>
                        <Select
                          value={filterTop}
                          label="Filter by Top N Items"
                          onChange={(e) => setFilterTop(e.target.value)}
                        >
                          <MenuItem value="">No Filter</MenuItem>
                          <MenuItem value="5">Top 5</MenuItem>
                          <MenuItem value="10">Top 10</MenuItem>
                          <MenuItem value="15">Top 15</MenuItem>
                          <MenuItem value="20">Top 20</MenuItem>
                          <MenuItem value="25">Top 25</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  )}
                  {/* Only show Sort Order for chart types where it makes sense (not line) */}
                  {['bar', 'horizontalBar', 'groupedBar', 'stackedBar', 'pie', 'donut', 'histogram'].includes(selectedChart) && (
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth sx={{ minWidth: '200px' }}>
                        <InputLabel>Sort Order</InputLabel>
                        <Select
                          value={sortOrder}
                          label="Sort Order"
                          onChange={(e) => setSortOrder(e.target.value)}
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
            {selectedChart && (
              <Button variant="contained" sx={{ mt: 2 }} onClick={() => setShowChart(true)}>Generate Chart</Button>
            )}
            {shouldShowChart && selectedChart && selectedColumns.length > 0 && (
              <Box mt={4}>
                {renderChart(selectedChart, selectedColumns, exportingChartId === getChartId(selectedChart, selectedColumns, filterTop, sortOrder))}
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!chartsToReport[getChartId(selectedChart, selectedColumns, filterTop, sortOrder)]?.selected}
                      onChange={e => handleAddToReport(selectedChart, selectedColumns, e.target.checked)}
                    />
                  }
                  label="Add to Report"
                  sx={{ mt: 2 }}
                />
              </Box>
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
            {((chartType === 'correlation' && chartColumns.length >= 2) || (chartType !== 'correlation' && isValidSelection && chartType !== 'box')) && (
              <Paper sx={{ p: 2, mt: 3, mb: 0, background: 'rgba(0,0,0,0.05)' }} elevation={0}>
                <Grid container spacing={3} alignItems="center">
                  {/* Aggregation toggle for relevant chart types */}
                  {['bar', 'horizontalBar', 'groupedBar', 'stackedBar', 'pie', 'donut'].includes(chartType) && chartColumns.length >= 2 && (
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth>
                        <InputLabel>Aggregation</InputLabel>
                        <Select
                          value={aggregationType}
                          label="Aggregation"
                          onChange={e => setAggregationType(e.target.value)}
                        >
                          <MenuItem value="sum">Sum</MenuItem>
                          <MenuItem value="average">Average</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  )}
                              {/* Filter controls - exclude scatter plots */}
                  {!['scatter'].includes(chartType) && (
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth sx={{ minWidth: '200px' }}>
                        <InputLabel>Filter by Top N Items</InputLabel>
                        <Select
                          value={filterTop}
                          label="Filter by Top N Items"
                          onChange={(e) => setFilterTop(e.target.value)}
                        >
                          <MenuItem value="">No Filter</MenuItem>
                          <MenuItem value="5">Top 5</MenuItem>
                          <MenuItem value="10">Top 10</MenuItem>
                          <MenuItem value="15">Top 15</MenuItem>
                          <MenuItem value="20">Top 20</MenuItem>
                          <MenuItem value="25">Top 25</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  )}
                  {/* Only show Sort Order for chart types where it makes sense (not line) */}
                  {['bar', 'horizontalBar', 'groupedBar', 'stackedBar', 'pie', 'donut', 'histogram'].includes(chartType) && (
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth sx={{ minWidth: '200px' }}>
                        <InputLabel>Sort Order</InputLabel>
                        <Select
                          value={sortOrder}
                          label="Sort Order"
                          onChange={(e) => setSortOrder(e.target.value)}
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
              onClick={() => setShowChart(true)}
            >
              Generate Chart
            </Button>
            {shouldShowChart && chartType && ((chartType === 'correlation' && chartColumns.length >= 2) || (chartType !== 'correlation' && isValidSelection)) && (
              <Box mt={4}>
                {renderChart(chartType, chartColumns.filter(Boolean), exportingChartId === getChartId(chartType, chartColumns.filter(Boolean), filterTop, sortOrder))}
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!chartsToReport[getChartId(chartType, chartColumns.filter(Boolean), filterTop, sortOrder)]?.selected}
                      onChange={e => handleAddToReport(chartType, chartColumns.filter(Boolean), e.target.checked)}
                    />
                  }
                  label="Add to Report"
                  sx={{ mt: 2 }}
                />
              </Box>
            )}
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
      <Box mt={4}>
        <Typography variant="h6">Charts Added to Report</Typography>
        {Object.keys(chartsToReport).filter(key => chartsToReport[key]?.selected).length === 0 ? (
          <Typography color="text.secondary">No charts added yet.</Typography>
        ) : (
          <ul>
            {Object.keys(chartsToReport).filter(key => chartsToReport[key]?.selected).map(key => {
              // Parse chart ID to display readable information
              const parts = key.split(':');
              const chartType = parts[0];
              const columns = parts[1]?.split(',') || [];
              const filter = parts[2]?.replace('filter=','') || '';
              const sort = parts[3]?.replace('sort=','') || '';
              const agg = parts[4]?.replace('agg=','') || '';
              
              let displayText = `${chartType}: ${columns.join(', ')}`;
              if (filter) displayText += ` (filter: ${filter})`;
              if (sort) displayText += ` (sort: ${sort})`;
              if (agg) displayText += ` (${agg})`;
              
              return <li key={key}>{displayText}</li>;
            })}
          </ul>
        )}
      </Box>
      {/* Button to move to Export Page */}
      <Box mt={6} textAlign="center">
        <Button
          component={Link}
          to="/export"
          variant="contained"
          color="secondary"
          size="large"
          sx={{ px: 4, py: 1.5 }}
        >
          Go to Export
        </Button>
      </Box>
    </Box>
  )
}

export default AnalysisPage;
