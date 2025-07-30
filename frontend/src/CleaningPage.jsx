import { useEffect, useState } from 'react';
import { CleaningSummaryContext } from './App';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Grid,
  Card,
  CardContent,
  CardActions,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  useTheme,
  LinearProgress
} from '@mui/material';
import { 
  ExpandMore,
  Delete,
  ContentCopy,
  Warning,
  CheckCircle,
  DataUsage,
  Storage,
  Assessment,
  CleaningServices,
  Refresh,
  Settings
} from '@mui/icons-material';
import { Link } from 'react-router-dom';

function CleaningPage() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);
  const theme = useTheme();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cleaningActions, setCleaningActions] = useState({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [fillValue, setFillValue] = useState('');
  const [fillMethod, setFillMethod] = useState('specific');
  const [cleanedData, setCleanedData] = useState(null);
  const [hasCleaned, setHasCleaned] = useState(false);
  const [cleaningSummary, setCleaningSummary] = useState([]);

  // Outlier method/action descriptions
  const OUTLIER_METHODS = [
    {
      value: 'winsorizing',
      label: 'Winsorizing',
      desc: 'Limits extreme values by capping them at the 5th and 95th percentiles.'
    },
    {
      value: 'iqr',
      label: 'Interquartile Range',
      desc: 'Detects outliers as values outside 1.5×IQR below Q1 or above Q3.'
    },
    {
      value: 'zscore',
      label: 'Z-Score',
      desc: 'Identifies outliers as values with a Z-score above 3 or below -3.'
    }
  ];
  const OUTLIER_ACTIONS = [
    { value: 'none', label: 'None' },
    { value: 'remove', label: 'Remove Outliers' },
    { value: 'cap', label: 'Cap Outliers' }
  ];

  // Handle outlier cleaning action
  const handleOutlierAction = (col, field, value) => {
    setCleaningActions(prev => ({
      ...prev,
      outliers: {
        ...(prev.outliers || {}),
        [col]: {
          ...(prev.outliers?.[col] || {}),
          [field]: value
        }
      }
    }));
  };

  // Save cleanedData to localStorage whenever it changes
  useEffect(() => {
    if (cleanedData) {
      localStorage.setItem('cleanedData', JSON.stringify(cleanedData));
    }
  }, [cleanedData]);

  // Save cleaningSummary to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cleaningSummary', JSON.stringify(cleaningSummary));
  }, [cleaningSummary]);

  // Restore cleaningSummary from localStorage on mount, unconditionally
  useEffect(() => {
    const stored = localStorage.getItem('cleaningSummary');
    if (stored) {
      setCleaningSummary(JSON.parse(stored));
    }
  }, []);

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('cleaningSession');
    if (stored) {
      const session = JSON.parse(stored);
      setHasCleaned(session.hasCleaned || false);
      setCleanedData(session.cleanedData || null);
      setCleaningSummary(session.cleaningSummary || []);
    }
  }, []);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5001/cleaning', { 
        credentials: 'include' 
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch report');
      }
      
      const data = await response.json();
      setReport(data);
      // setCleaningSummary([]); // <-- Only do this after upload, not on every report fetch
      
      // Initialize cleaning actions
      const initialActions = {
        duplicates: 'remain',
        nulls: {},
        dataTypes: {},
        outliers: {} // Initialize outliers
      };
      
      // Initialize null value actions for each column
      if (data.nulls) {
        Object.keys(data.nulls).forEach(col => {
          initialActions.nulls[col] = { action: 'remain' }; // Set default action object
        });
      }
      
      // Initialize data type actions
      if (data.suggested_dtypes) {
        Object.keys(data.suggested_dtypes).forEach(col => {
          initialActions.dataTypes[col] = 'convert';
        });
      }

      // Initialize outlier actions for each column
      if (data.outliers) {
        Object.keys(data.outliers).forEach(col => {
          initialActions.outliers[col] = {
            method: 'iqr', // Default to iqr
            action: 'none' // Default to none
          };
        });
      }
      
      setCleaningActions(initialActions);
    } catch (err) {
      // Error fetching report
    } finally {
      setLoading(false);
    }
  };

  const handleCleaningAction = (type, column, action) => {
    setCleaningActions(prev => ({
      ...prev,
      [type]: column ? { ...prev[type], [column]: action } : action
    }));
  };

  const handleApplyCleaning = async () => {
    try {
      setLoading(true);
      
      // Filter out 'remain' actions for nulls - only send columns we're actually cleaning
      const nullActions = {};
      Object.entries(cleaningActions.nulls || {}).forEach(([col, action]) => {
        if (action?.action && action.action !== 'remain') {
          nullActions[col] = action;
        }
      });
      
      // Compose outlier config for backend
      let outlierConfig = {};
      if (report?.outliers) {
        Object.keys(report.outliers).forEach(col => {
          const userChoice = cleaningActions.outliers?.[col] || {};
          if (userChoice.method && userChoice.action && userChoice.action !== 'none') {
            outlierConfig[col] = {
              method: userChoice.method,
              action: userChoice.action
            };
          }
        });
      }

      const cleaningConfig = {
        duplicates: cleaningActions.duplicates,
        nulls: nullActions,
        dataTypes: cleaningActions.dataTypes,
        fillValue,
        fillMethod,
        outliers: outlierConfig
      };

      const response = await fetch('http://localhost:5001/clean-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(cleaningConfig)
      });

      if (response.ok) {
        const result = await response.json();
        setCleanedData(result);
        setHasCleaned(true);
        // Accumulate actions for the session
        const newSummary = [];
        
        // Duplicates summary
        if (cleaningActions.duplicates === 'delete' && report.duplicates > 0) {
          newSummary.push(`Removed ${report.duplicates} duplicate rows`);
        }
        
        // Nulls summary
        Object.entries(nullActions).forEach(([col, action]) => {
          const nullCount = report.nulls?.[col] || 0;
          if (action.action === 'delete_row' && nullCount > 0) {
            newSummary.push(`Deleted ${nullCount} rows with null values in column "${col}"`);
          } else if (action.action === 'delete_column' && nullCount > 0) {
            newSummary.push(`Deleted column "${col}" (contained ${nullCount} null values)`);
          } else if (action.action === 'fill' && nullCount > 0) {
            const method = action.fillMethod || 'specific';
            const value = action.fillValue || 'calculated value';
            newSummary.push(`Filled ${nullCount} null values in column "${col}" using ${method} (${value})`);
          }
        });
        
        // Data type conversions summary
        Object.entries(cleaningActions.dataTypes || {}).forEach(([col, action]) => {
          if (action === 'convert' && report.suggested_dtypes?.[col]) {
            newSummary.push(`Converted column "${col}" to ${report.suggested_dtypes[col]} data type`);
          }
        });
        
        // Outliers summary
        Object.entries(outlierConfig).forEach(([col, config]) => {
          const outlierCount = report.outliers?.[col]?.[config.method]?.count || 0;
          if (outlierCount > 0) {
            const actionText = config.action === 'remove' ? 'removed' : 'capped';
            newSummary.push(`${actionText.charAt(0).toUpperCase() + actionText.slice(1)} ${outlierCount} outliers in column "${col}" using ${config.method} method`);
          }
        });
        
        // Only append if there are actual actions
        if (newSummary.length > 0) {
          const updatedSummary = [...cleaningSummary, ...newSummary];
          setCleaningSummary(updatedSummary);
          // Save the full result to localStorage for the Export page
          localStorage.setItem('cleaningSession', JSON.stringify({
            hasCleaned: true,
            cleanedData: result,
            cleaningSummary: updatedSummary
          }));
        } else {
          // Still save cleanedData and hasCleaned if no new actions
          localStorage.setItem('cleaningSession', JSON.stringify({
            hasCleaned: true,
            cleanedData: result,
            cleaningSummary
          }));
        }
        
        // Reset outlier actions after successful cleaning
        if (outlierConfig && Object.keys(outlierConfig).length > 0) {
          const resetOutliers = {};
          Object.keys(report.outliers || {}).forEach(col => {
            resetOutliers[col] = {
              method: 'iqr',
              action: 'none'
            };
          });
          setCleaningActions(prev => ({
            ...prev,
            outliers: resetOutliers
          }));
        }
        
        // Update the report with the cleaning result, always use the latest backend response
        if (result.after) {
          setReport({
            ...result.after,
          });
        }
        
        // Store outlier actions for export
        if (cleaningActions.outliers) {
          localStorage.setItem('outlierActions', JSON.stringify(cleaningActions.outliers));
        }
      } else {
        throw new Error('Failed to apply cleaning');
      }
    } catch (err) {
      // Error applying cleaning
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = (action, column = null) => {
    setConfirmAction({ action, column });
    setShowConfirmDialog(true);
  };

  const executeAction = () => {
    if (confirmAction) {
      const { action, column } = confirmAction;
      
      if (action === 'delete_row' || action === 'delete_column') {
        handleCleaningAction(
          action === 'delete_row' ? 'nulls' : 'columns',
          column,
          action
        );
      }
      
      setShowConfirmDialog(false);
      setConfirmAction(null);
    }
  };

  const handleNullAction = (col, action) => {
    if (action === 'fill') {
      handleCleaningAction('nulls', col, { action: 'fill', fillMethod: cleaningActions.nulls?.[col]?.fillMethod || 'specific' });
    } else {
      handleCleaningAction('nulls', col, { action });
    }
  };

  const handleFillMethodChange = (col, method) => {
    handleCleaningAction('nulls', col, { action: 'fill', fillMethod: method });
  };

  const handleFillValueChange = (col, value) => {
    handleCleaningAction('nulls', col, { action: 'fill', fillMethod: 'specific', fillValue: value });
  };

  // Calculate expected shape after cleaning actions
  const calculateExpectedShape = () => {
    if (!report) return { rows: 0, columns: 0 };
    
    let expectedRows = report.dataset_info?.rows || 0;
    let expectedColumns = report.dataset_info?.columns || 0;
    
    // Account for duplicate removal
    if (cleaningActions.duplicates === 'delete') {
      expectedRows -= report.duplicates || 0;
    }
    
    // Account for null value actions
    Object.entries(cleaningActions.nulls || {}).forEach(([col, action]) => {
      const nullCount = report.nulls?.[col] || 0;
      if (action?.action === 'delete_row') {
        expectedRows -= nullCount;
      } else if (action?.action === 'delete_column') {
        expectedColumns -= 1;
      }
    });
    
    // Account for outlier removal
    Object.entries(cleaningActions.outliers || {}).forEach(([col, config]) => {
      if (config?.action === 'remove' && config?.method) {
        const outlierCount = report.outliers?.[col]?.[config.method]?.count || 0;
        expectedRows -= outlierCount;
      }
    });
    
    return { rows: Math.max(0, expectedRows), columns: Math.max(0, expectedColumns) };
  };

  const expectedShape = calculateExpectedShape();
  const hasShapeChanges = expectedShape.rows !== (report?.dataset_info?.rows || 0) || 
                         expectedShape.columns !== (report?.dataset_info?.columns || 0);

  if (loading) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        bgcolor: theme.palette.mode === 'dark' 
          ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
          : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Loading cleaning report...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (!report || report.error) {
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
            Please upload a dataset before cleaning your data.
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

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: theme.palette.mode === 'dark' 
        ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
        : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', 
      color: theme.palette.text.primary, 
      p: { xs: 1, sm: 2, md: 3 }
    }}>
      {/* Header Section */}
      <Box sx={{ 
        textAlign: 'center', 
        mb: 3, 
        py: 3,
        background: theme.palette.mode === 'dark'
          ? 'linear-gradient(135deg, #2d1b69 0%, #11998e 100%)'
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: 3,
        color: 'white',
        boxShadow: theme.palette.mode === 'dark'
          ? '0 8px 25px rgba(45, 27, 105, 0.3)'
          : '0 8px 25px rgba(102, 126, 234, 0.25)'
      }}>
        <CleaningServices sx={{ fontSize: 36, mb: 1, opacity: 0.9 }} />
        <Typography variant="h5" sx={{ 
          mb: 1, 
          fontWeight: 600,
          textShadow: '0 1px 3px rgba(0,0,0,0.3)'
        }}>
          Data Cleaning
        </Typography>
        <Typography variant="body1" sx={{ 
          mb: 0, 
          opacity: 0.85,
          maxWidth: 500,
          mx: 'auto',
          fontSize: '0.95rem'
        }}>
          Clean and prepare your dataset for analysis by addressing missing values, duplicates, and outliers
        </Typography>
      </Box>

      {/* Compact Data Summary */}
      <Box sx={{ 
        mb: 3,
        p: 2.5,
        borderRadius: 2, 
        background: theme.palette.mode === 'dark'
          ? 'rgba(30, 30, 30, 0.95)'
          : 'rgba(255,255,255,0.95)',
        border: theme.palette.mode === 'dark'
          ? '1px solid rgba(255,255,255,0.1)'
          : '1px solid rgba(255,255,255,0.2)',
        boxShadow: theme.palette.mode === 'dark'
          ? '0 4px 16px rgba(0,0,0,0.4)'
          : '0 4px 16px rgba(0,0,0,0.1)'
      }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <DataUsage color="primary" /> Dataset Overview
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center', p: 2, borderRadius: 1, bgcolor: 'primary.main', color: 'white' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>{report.dataset_info?.rows || 0} × {report.dataset_info?.columns || 0}</Typography>
              <Typography variant="body1" sx={{ fontWeight: 500, fontSize: '1rem' }}>Shape</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center', p: 2, borderRadius: 1, bgcolor: 'success.main', color: 'white' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>{report.data_quality_score || 0}%</Typography>
              <Typography variant="body1" sx={{ fontWeight: 500, fontSize: '1rem' }}>Quality</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center', p: 2, borderRadius: 1, bgcolor: 'warning.main', color: 'white' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>{report.quality_metrics?.null_percentage || 0}%</Typography>
              <Typography variant="body1" sx={{ fontWeight: 500, fontSize: '1rem' }}>Missing</Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center', p: 2, borderRadius: 1, bgcolor: 'info.main', color: 'white' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>{report.duplicates || 0}</Typography>
              <Typography variant="body1" sx={{ fontWeight: 500, fontSize: '1rem' }}>Duplicates</Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Cleaning Actions - Compact Layout */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <CleaningServices color="primary" /> Cleaning Actions
        </Typography>
        {/* Duplicates Section */}
        <Paper sx={{ 
          p: 3, 
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
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <ContentCopy color="info" /> Duplicate Values ({report.duplicates || 0} found)
          </Typography>
          {report.duplicates > 0 ? (
            <RadioGroup
              value={cleaningActions.duplicates || 'remain'}
              onChange={(e) => handleCleaningAction('duplicates', null, e.target.value)}
              sx={{ display: 'flex', flexDirection: 'row', gap: 2 }}
            >
              <FormControlLabel 
                value="delete" 
                control={<Radio />} 
                label="Delete duplicates"
                sx={{ 
                  m: 0, 
                  p: 1.5, 
                  borderRadius: 1, 
                  border: '1px solid', 
                  borderColor: cleaningActions.duplicates === 'delete' ? 'primary.main' : 'divider',
                  bgcolor: cleaningActions.duplicates === 'delete' ? 'primary.light' : 'transparent',
                  color: cleaningActions.duplicates === 'delete' ? 'primary.contrastText' : 'inherit'
                }}
              />
              <FormControlLabel 
                value="remain" 
                control={<Radio />} 
                label="Keep duplicates"
                sx={{ 
                  m: 0, 
                  p: 1.5, 
                  borderRadius: 1, 
                  border: '1px solid', 
                  borderColor: cleaningActions.duplicates === 'remain' ? 'primary.main' : 'divider',
                  bgcolor: cleaningActions.duplicates === 'remain' ? 'primary.light' : 'transparent',
                  color: cleaningActions.duplicates === 'remain' ? 'primary.contrastText' : 'inherit'
                }}
              />
            </RadioGroup>
          ) : (
            <Chip label="No duplicates found" color="success" />
          )}
        </Paper>

        {/* Data Types Section */}
        <Paper sx={{ 
          p: 3, 
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
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Settings color="primary" /> Data Type Optimizations
          </Typography>
          {report.suggested_dtypes && Object.keys(report.suggested_dtypes).length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {Object.entries(report.suggested_dtypes).map(([col, dtype]) => (
                <Box key={col} sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  p: 1.5,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{col}</Typography>
                    <Typography variant="body2">→</Typography>
                    <Chip label={dtype} size="small" color="primary" />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip 
                      label="Convert" 
                      variant={cleaningActions.dataTypes[col] === 'convert' ? 'filled' : 'outlined'}
                      color={cleaningActions.dataTypes[col] === 'convert' ? 'primary' : 'default'}
                      size="small"
                      onClick={() => handleCleaningAction('dataTypes', col, 'convert')}
                      sx={{ cursor: 'pointer' }}
                    />
                    <Chip 
                      label="Keep" 
                      variant={cleaningActions.dataTypes[col] === 'keep' ? 'filled' : 'outlined'}
                      color={cleaningActions.dataTypes[col] === 'keep' ? 'primary' : 'default'}
                      size="small"
                      onClick={() => handleCleaningAction('dataTypes', col, 'keep')}
                      sx={{ cursor: 'pointer' }}
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          ) : (
            <Chip label="All data types are optimized" color="success" />
          )}
        </Paper>

        {/* Missing Values Section */}
        <Paper sx={{ 
          p: 3, 
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
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning color="warning" /> Handle Missing Values
          </Typography>
          {Object.keys(report.nulls || {}).length > 0 ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
              {Object.entries(report.nulls).map(([col, count]) => (
                <Box key={col} sx={{ 
                  p: 2, 
                  borderRadius: 1, 
                  border: '1px solid', 
                  borderColor: 'divider',
                  bgcolor: 'background.paper'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{col}</Typography>
                    <Chip label={`${count} nulls`} size="small" color="warning" />
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {['remain', 'delete_row', 'delete_column', 'fill'].map((action) => (
                      <Chip
                        key={action}
                        label={action === 'remain' ? 'Keep' : action === 'delete_row' ? 'Delete Rows' : action === 'delete_column' ? 'Delete Column' : 'Fill'}
                        variant={cleaningActions.nulls?.[col]?.action === action ? 'filled' : 'outlined'}
                        color={cleaningActions.nulls?.[col]?.action === action ? 'primary' : 'default'}
                        size="small"
                        onClick={() => handleNullAction(col, action)}
                        sx={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Box>
                  {cleaningActions.nulls?.[col]?.action === 'fill' && (
                    <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <Select
                          value={cleaningActions.nulls?.[col]?.fillMethod || 'specific'}
                          onChange={e => handleFillMethodChange(col, e.target.value)}
                          displayEmpty
                        >
                          <MenuItem value="specific">Specific</MenuItem>
                          <MenuItem value="mean">Mean</MenuItem>
                          <MenuItem value="median">Median</MenuItem>
                          <MenuItem value="mode">Mode</MenuItem>
                          <MenuItem value="forward">Forward</MenuItem>
                          <MenuItem value="backward">Backward</MenuItem>
                        </Select>
                      </FormControl>
                      {cleaningActions.nulls?.[col]?.fillMethod === 'specific' && (
                        <TextField
                          placeholder="Fill value"
                          value={cleaningActions.nulls?.[col]?.fillValue || ''}
                          onChange={e => handleFillValueChange(col, e.target.value)}
                          size="small"
                          sx={{ minWidth: 120 }}
                        />
                      )}
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          ) : (
            <Chip label="No missing values to handle" color="success" />
          )}
        </Paper>

        {/* Outliers Section */}
        {report.outliers && Object.keys(report.outliers).length > 0 && (
          <Paper sx={{ 
            p: 3, 
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
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Assessment color="error" /> Outlier Cleaning
            </Typography>
            <Alert severity="info" sx={{ mb: 2, borderRadius: 1 }}>
              <Typography variant="body2">
                <strong>Methods:</strong> Winsorizing (5th-95th percentile), IQR (1.5×IQR), Z-Score (±3)<br/>
                <strong>Actions:</strong> Remove (delete rows) or Cap (replace with threshold)
              </Typography>
            </Alert>
            {(() => {
              const validOutlierColumns = Object.entries(report.outliers).filter(([col, out]) => {
                const win = out.winsorizing?.count || 0;
                const iqr = out.iqr?.count || 0;
                const z = out.zscore?.count || 0;
                return win > 0 || iqr > 0 || z > 0;
              });
              
              if (validOutlierColumns.length === 0) {
                return <Chip label="No outliers detected" color="success" />;
              }
              
              return (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 2 }}>
                  {validOutlierColumns.map(([col, out]) => {
                    const win = out.winsorizing?.count || 0;
                    const iqr = out.iqr?.count || 0;
                    const z = out.zscore?.count || 0;
                    return (
                      <Box key={col} sx={{ 
                        p: 2, 
                        borderRadius: 1, 
                        border: '1px solid', 
                        borderColor: 'divider',
                        bgcolor: 'background.paper'
                      }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>{col}</Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, mb: 1.5, flexWrap: 'wrap' }}>
                          <Chip label={`W:${win}`} size="small" color="info" />
                          <Chip label={`IQR:${iqr}`} size="small" color="info" />
                          <Chip label={`Z:${z}`} size="small" color="info" />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                          {OUTLIER_METHODS.map(method => (
                            <Chip
                              key={method.value}
                              label={method.label}
                              variant={cleaningActions.outliers?.[col]?.method === method.value ? 'filled' : 'outlined'}
                              color={cleaningActions.outliers?.[col]?.method === method.value ? 'primary' : 'default'}
                              size="small"
                              onClick={() => handleOutlierAction(col, 'method', method.value)}
                              sx={{ cursor: 'pointer' }}
                            />
                          ))}
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {OUTLIER_ACTIONS.map(action => (
                            <Chip
                              key={action.value}
                              label={action.label}
                              variant={cleaningActions.outliers?.[col]?.action === action.value ? 'filled' : 'outlined'}
                              color={cleaningActions.outliers?.[col]?.action === action.value ? 'primary' : 'default'}
                              size="small"
                              onClick={() => handleOutlierAction(col, 'action', action.value)}
                              sx={{ cursor: 'pointer' }}
                            />
                          ))}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              );
            })()}
          </Paper>
        )}

        {/* Apply Button */}
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          {loading && (
            <LinearProgress sx={{ borderRadius: 1, height: 4, mb: 2 }} />
          )}
          <Button
            variant="contained"
            size="large"
            onClick={handleApplyCleaning}
            disabled={loading}
            startIcon={<Refresh />}
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: 2,
              fontWeight: 600,
              background: theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, #2d1b69 0%, #11998e 100%)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, #3d2b79 0%, #21a89e 100%)'
                  : 'linear-gradient(135deg, #7c92ff 0%, #8a5fb7 100%)',
              }
            }}
          >
            {loading ? 'Applying...' : 'Apply Cleaning'}
          </Button>
        </Box>

        {/* Success Message and Summary */}
        {hasCleaned && cleanedData && (
          <Box sx={{ mt: 3 }}>
            <Alert severity="success" sx={{ mb: 3, borderRadius: 2, p: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Data cleaning applied successfully!
              </Typography>
              Dataset has been updated with your cleaning actions.
            </Alert>
            
            {/* Compact Cleaning Summary */}
            {cleaningSummary && cleaningSummary.length > 0 && (
              <Paper sx={{ p: 2, mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle color="success" /> Actions Applied
                </Typography>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  {cleaningSummary.map((action, index) => (
                    <Typography key={index} component="li" variant="body2" sx={{ mb: 0.5 }}>
                      {action}
                    </Typography>
                  ))}
                </Box>
              </Paper>
            )}
          </Box>
        )}

        {/* Navigation */}
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Button
            component={Link}
            to="/analysis"
            variant="outlined"
            size="large"
            sx={{
              px: 4,
              py: 1.5,
              borderRadius: 2,
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': {
                transform: 'translateY(-1px)',
              }
            }}
          >
            Proceed to Analysis
          </Button>
        </Box>

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onClose={() => setShowConfirmDialog(false)}>
          <DialogTitle>Confirm Action</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to {confirmAction?.action === 'delete_row' ? 'delete rows with null values' : 'delete the entire column'}?
              This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
            <Button onClick={executeAction} color="error" variant="contained">
              Confirm
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}

export default CleaningPage;
