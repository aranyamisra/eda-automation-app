import React, { useEffect, useState, useMemo } from 'react';
import ColumnDropdowns from './ColumnDropdowns';
import { Bar, Pie, Doughnut, Line, Scatter, Chart as ChartJS2 } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { MatrixController, MatrixElement } from 'chartjs-chart-matrix';
import ChartDataLabels from 'chartjs-plugin-datalabels';


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
  const charts = [];
  // Bar, Horizontal Bar
  if ((cat === 1 && num === 0 && dt === 0) || (cat === 1 && num === 1 && dt === 0)) charts.push('bar', 'horizontalBar');
  // Pie, Donut
  if ((cat === 1 && num === 0 && dt === 0) || (num === 1 && cat === 0 && dt === 0) || (cat === 1 && num === 1 && dt === 0)) charts.push('pie', 'donut');
  // Histogram
  if (num === 1 && cat === 0 && dt === 0) charts.push('histogram');
  // Box plot
  if (num === 1 && cat === 0 && dt === 0) charts.push('box');
  // Grouped/Stacked Bar
  if (cat >= 2 && num === 1) charts.push('groupedBar', 'stackedBar');
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

const groupOrder = ['Numerical', 'Categorical', 'Date/Time'];

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

  useEffect(() => {
    setLoading(true);
    axios.get('http://localhost:5001/analysis', { withCredentials: true })
      .then(res => {
        setColumns(res.data.columns || []);
        setPreview(res.data.preview || []);
        setData(res.data.data || []); // set full dataset
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

  // Chart data preparation
  function getChartData(type, selectedCols) {
    if (!type || !selectedCols.length) return null;
    // Find column objects
    const colObjs = selectedCols.map(col => columns.find(c => c.name === col));
    // Helper: aggregate numerical by category
    function aggregateByCategory(catCol, numCol) {
      const agg = {};
      (data.length > 0 ? data : preview).forEach(row => {
        const cat = row[catCol];
        const num = row[numCol];
        if (cat == null || num == null || isNaN(num)) return;
        agg[cat] = (agg[cat] || 0) + Number(num);
      });
      const labels = Object.keys(agg);
      const dataArr = labels.map(l => agg[l]);
      return { labels, data: dataArr };
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
        return {
          labels,
          datasets: [{
            label: catCol + ' count',
            data: counts,
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
        return {
          labels,
          datasets: [{
            label: numCol,
            data,
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
      (data.length > 0 ? data : preview).forEach(row => {
        const g1 = row[catCol1];
        const g2 = row[catCol2];
        const num = row[numCol];
        if (g1 == null || g2 == null || num == null || isNaN(num)) return;
        if (!agg[g1]) agg[g1] = {};
        agg[g1][g2] = (agg[g1][g2] || 0) + Number(num);
      });
      const group1Labels = Object.keys(agg); // e.g., teams
      // Get all possible group2 values (e.g., all players)
      const group2Set = new Set();
      group1Labels.forEach(g1 => Object.keys(agg[g1]).forEach(g2 => group2Set.add(g2)));
      const group2Labels = Array.from(group2Set);
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
        data: group1Labels.map(g1 => agg[g1][g2] || 0),
        backgroundColor: palette[i % palette.length],
      }));
      return {
        labels: group1Labels,
        datasets
      };
    }
    if (["pie", "donut"].includes(type)) {
      if (selectedCols.length === 1) {
        const col = columns.find(c => c.name === selectedCols[0]);
        const colName = selectedCols[0];
        const isNumeric = col?.group === 'Numerical';
        const agg = {};
        (data.length > 0 ? data : preview).forEach(row => {
          const val = row[colName];
          if (val == null) return;
          if (isNumeric) {
            // For numeric: count occurrences of each unique value (like histogram bins)
            agg[val] = (agg[val] || 0) + 1;
          } else {
            // For categorical: count occurrences
            agg[val] = (agg[val] || 0) + 1;
          }
        });
        const labels = Object.keys(agg);
        const counts = labels.map(l => agg[l]);
        return {
          labels,
          datasets: [{
            label: colName + ' count',
            data: counts,
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
        return {
          labels,
          datasets: [{
            label: numCol,
            data,
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
      return {
        labels,
        datasets: [{
          label: numCol,
          data: bins,
          backgroundColor: 'rgba(255, 206, 86, 0.5)'
        }]
      };
    }
    if (type === "box") {
      // Box plot support removed
      return null;
    }
    if (type === "scatter") {
      // Scatter: two numerical columns
      const xCol = selectedCols[0];
      const yCol = selectedCols[1];
      const arr = (data.length > 0 ? data : preview).map(row => ({ x: row[xCol], y: row[yCol] }));
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

  function renderChart(type, selectedCols) {
    const data = getChartData(type, selectedCols);
    if (!data) return null;
    // Default options
    const options = {
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
    };
    if (type === 'stackedBar') {
      return (
        <Bar
          data={data}
          options={{
            ...options,
            plugins: {
              ...options.plugins,
              title: { ...options.plugins.title, display: true, text: data.datasets[0]?.label || '' }
            },
            scales: {
              ...options.scales,
              x: { ...options.scales.x, stacked: true },
              y: { ...options.scales.y, stacked: true }
            }
          }}
        />
      );
    }
    if (type === 'groupedBar') {
      return <Bar data={data} options={options} />;
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
          <ChartJS2 type="matrix" data={data} options={matrixOptions} plugins={[ChartDataLabels]} />
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
        return <Bar data={data} options={options} />;
      case 'horizontalBar':
        return <Bar data={data} options={{ ...options, indexAxis: 'y' }} />;
      case 'pie':
        return <Pie data={data} options={{
          ...options,
          plugins: {
            ...options.plugins,
            datalabels: { color: '#fff', font: { weight: 'bold', size: 16 } }
          }
        }} plugins={[ChartDataLabels]} />;
      case 'donut':
        return <Doughnut data={data} options={{
          ...options,
          plugins: {
            ...options.plugins,
            datalabels: { color: '#fff', font: { weight: 'bold', size: 16 } }
          }
        }} plugins={[ChartDataLabels]} />;
      case 'histogram':
        return <Bar data={data} options={options} />;
      case 'box':
      // Box plot support removed
      return null;
      case 'scatter':
        return <Scatter data={data} options={options} />;
      case 'line':
        return <Line data={data} options={options} />;
      default:
        return null;
    }
  }

  // UI rendering
  if (loading) return <Box mt={4}><CircularProgress /></Box>;
  if (error) return <Box mt={4}><Alert severity="error">{error}</Alert></Box>;

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
            <Button variant="contained" sx={{ mt: 2 }} onClick={() => setShowChart(true)}>Generate Chart</Button>
          )}
          {showChart && selectedChart && selectedColumns.length > 0 && (
            <Box mt={4}>
              {renderChart(selectedChart, selectedColumns)}
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
          <Button
            variant="contained"
            sx={{ mt: 2 }}
            disabled={chartType === 'correlation' ? chartColumns.length < 2 : !isValidSelection}
            onClick={() => setShowChart(true)}
          >
            Generate Chart
          </Button>
          {showChart && chartType && ((chartType === 'correlation' && chartColumns.length >= 2) || (chartType !== 'correlation' && isValidSelection)) && (
            <Box mt={4}>
              {renderChart(chartType, chartColumns.filter(Boolean))}
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
    </Box>
  )
}

export default AnalysisPage;
