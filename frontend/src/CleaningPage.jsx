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
      console.error('Error fetching report:', err);
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
      console.error('Error applying cleaning:', err);
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
        <CleaningServices sx={{ fontSize: 36, mb: 1, opacity: 0.9 }} />
        <Typography variant="h5" sx={{ 
          mb: 1, 
          fontWeight: 600,
          textShadow: '0 1px 3px rgba(0,0,0,0.3)'
        }}>
          🧹 Data Cleaning
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

      {/* Data Summary */}
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
            <DataUsage sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Dataset Summary
            </Typography>
          </Box>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <Card sx={{
                borderRadius: 2,
                background: theme.palette.mode === 'dark'
                  ? 'rgba(255,255,255,0.05)'
                  : 'rgba(0,0,0,0.02)',
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': {
                  backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(0,0,0,0.04)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                }
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Storage color="primary" sx={{ mr: 1.5, fontSize: 28 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>Shape</Typography>
                  </Box>
                  <Typography variant="h4" color="primary" sx={{ fontWeight: 700 }}>
                    {report.dataset_info?.rows || 0} × {report.dataset_info?.columns || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{
                borderRadius: 2,
                background: theme.palette.mode === 'dark'
                  ? 'rgba(255,255,255,0.05)'
                  : 'rgba(0,0,0,0.02)',
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': {
                  backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(0,0,0,0.04)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                }
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Assessment color="primary" sx={{ mr: 1.5, fontSize: 28 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>Quality Score</Typography>
                  </Box>
                  <Typography variant="h4" color="primary" sx={{ fontWeight: 700 }}>
                    {report.data_quality_score || 0}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{
                borderRadius: 2,
                background: theme.palette.mode === 'dark'
                  ? 'rgba(255,255,255,0.05)'
                  : 'rgba(0,0,0,0.02)',
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': {
                  backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(0,0,0,0.04)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                }
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <Warning color="warning" sx={{ mr: 1.5, fontSize: 28 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>Missing Values</Typography>
                  </Box>
                  <Typography variant="h4" color="warning.main" sx={{ fontWeight: 700 }}>
                    {report.quality_metrics?.null_percentage || 0}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card sx={{
                borderRadius: 2,
                background: theme.palette.mode === 'dark'
                  ? 'rgba(255,255,255,0.05)'
                  : 'rgba(0,0,0,0.02)',
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': {
                  backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(255,255,255,0.08)'
                    : 'rgba(0,0,0,0.04)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                }
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <ContentCopy color="info" sx={{ mr: 1.5, fontSize: 28 }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>Duplicates</Typography>
                  </Box>
                  <Typography variant="h4" color="info.main" sx={{ fontWeight: 700 }}>
                    {report.duplicates || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Cleaning Options */}
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
            <CleaningServices sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Cleaning Actions
            </Typography>
          </Box>
          <Grid container spacing={3}>
        {/* Duplicate Handling */}
        <Grid item xs={12} md={6}>
          <Card sx={{ 
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
                <ContentCopy sx={{ mr: 2, color: 'info.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Duplicate Values ({report.duplicates || 0} found)
                </Typography>
              </Box>
              {report.duplicates > 0 ? (
                <div>
                  <FormControl component="fieldset">
                    <FormLabel component="legend" sx={{ fontWeight: 600, mb: 2 }}>Action:</FormLabel>
                    <RadioGroup
                      value={cleaningActions.duplicates || 'remain'}
                      onChange={(e) => handleCleaningAction('duplicates', null, e.target.value)}
                      sx={{ gap: 1 }}
                    >
                      <FormControlLabel 
                        value="delete" 
                        control={<Radio />} 
                        label="Delete duplicates"
                        sx={{
                          m: 0,
                          p: 2,
                          borderRadius: 2,
                          border: cleaningActions.duplicates === 'delete' ? '2px solid' : '1px solid',
                          borderColor: cleaningActions.duplicates === 'delete' ? 'primary.main' : 'divider',
                          backgroundColor: cleaningActions.duplicates === 'delete' 
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
                        value="remain" 
                        control={<Radio />} 
                        label="Keep duplicates"
                        sx={{
                          m: 0,
                          p: 2,
                          borderRadius: 2,
                          border: cleaningActions.duplicates === 'remain' ? '2px solid' : '1px solid',
                          borderColor: cleaningActions.duplicates === 'remain' ? 'primary.main' : 'divider',
                          backgroundColor: cleaningActions.duplicates === 'remain' 
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
                  </FormControl>
                </div>
              ) : (
                <Alert severity="success" sx={{ borderRadius: 2 }}>
                  No duplicate values found
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Null Value Handling */}
        <Grid item xs={12}>
          <Card sx={{ 
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
                <Warning sx={{ mr: 2, color: 'warning.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Handle Missing Values
                </Typography>
              </Box>
              {Object.keys(report.nulls || {}).length > 0 ? (
                <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                  {Object.entries(report.nulls).map(([col, count]) => (
                    <Card key={col} sx={{ 
                      mb: 3, 
                      p: 3, 
                      minHeight: 180,
                      background: theme.palette.mode === 'dark'
                        ? 'rgba(255,255,255,0.05)'
                        : 'rgba(0,0,0,0.02)',
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2
                    }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                        {col} <Chip label={`${count} nulls`} size="small" color="warning" />
                      </Typography>
                      <FormControl component="fieldset" sx={{ mt: 1 }}>
                        <FormLabel component="legend" sx={{ fontSize: 14, fontWeight: 600, mb: 1 }}>Action</FormLabel>
                        <RadioGroup
                          value={cleaningActions.nulls?.[col]?.action || 'remain'}
                          onChange={e => handleNullAction(col, e.target.value)}
                          sx={{ gap: 1 }}
                        >
                          <FormControlLabel 
                            value="remain" 
                            control={<Radio />} 
                            label="Keep nulls"
                            sx={{
                              m: 0,
                              p: 1.5,
                              borderRadius: 2,
                              border: cleaningActions.nulls?.[col]?.action === 'remain' ? '2px solid' : '1px solid',
                              borderColor: cleaningActions.nulls?.[col]?.action === 'remain' ? 'primary.main' : 'divider',
                              backgroundColor: cleaningActions.nulls?.[col]?.action === 'remain' 
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
                            value="delete_row" 
                            control={<Radio />} 
                            label="Delete rows"
                            sx={{
                              m: 0,
                              p: 1.5,
                              borderRadius: 2,
                              border: cleaningActions.nulls?.[col]?.action === 'delete_row' ? '2px solid' : '1px solid',
                              borderColor: cleaningActions.nulls?.[col]?.action === 'delete_row' ? 'primary.main' : 'divider',
                              backgroundColor: cleaningActions.nulls?.[col]?.action === 'delete_row' 
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
                            value="delete_column" 
                            control={<Radio />} 
                            label="Delete column"
                            sx={{
                              m: 0,
                              p: 1.5,
                              borderRadius: 2,
                              border: cleaningActions.nulls?.[col]?.action === 'delete_column' ? '2px solid' : '1px solid',
                              borderColor: cleaningActions.nulls?.[col]?.action === 'delete_column' ? 'primary.main' : 'divider',
                              backgroundColor: cleaningActions.nulls?.[col]?.action === 'delete_column' 
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
                            value="fill" 
                            control={<Radio />} 
                            label="Fill with value"
                            sx={{
                              m: 0,
                              p: 1.5,
                              borderRadius: 2,
                              border: cleaningActions.nulls?.[col]?.action === 'fill' ? '2px solid' : '1px solid',
                              borderColor: cleaningActions.nulls?.[col]?.action === 'fill' ? 'primary.main' : 'divider',
                              backgroundColor: cleaningActions.nulls?.[col]?.action === 'fill' 
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
                      </FormControl>
                      {cleaningActions.nulls?.[col]?.action === 'fill' && (
                        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                          <FormControl size="small" sx={{ minWidth: 160 }}>
                            <InputLabel id={`fill-method-label-${col}`}>Fill method</InputLabel>
                            <Select
                              labelId={`fill-method-label-${col}`}
                              id={`fill-method-select-${col}`}
                              value={cleaningActions.nulls?.[col]?.fillMethod || 'specific'}
                              label="Fill method"
                              onChange={e => handleFillMethodChange(col, e.target.value)}
                              sx={{
                                backgroundColor: theme.palette.mode === 'dark'
                                  ? 'rgba(255,255,255,0.05)'
                                  : 'rgba(0,0,0,0.02)',
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                }
                              }}
                            >
                              <MenuItem value="specific">Specific value</MenuItem>
                              <MenuItem value="mean">Mean</MenuItem>
                              <MenuItem value="median">Median</MenuItem>
                              <MenuItem value="mode">Mode</MenuItem>
                              <MenuItem value="forward">Forward fill</MenuItem>
                              <MenuItem value="backward">Backward fill</MenuItem>
                            </Select>
                          </FormControl>
                          {cleaningActions.nulls?.[col]?.fillMethod === 'specific' && (
                            <TextField
                              label={`Fill value for "${col}"`}
                              value={cleaningActions.nulls?.[col]?.fillValue || ''}
                              onChange={e => handleFillValueChange(col, e.target.value)}
                              size="small"
                              sx={{ 
                                width: 180,
                                '& .MuiOutlinedInput-root': {
                                  borderRadius: 2,
                                  backgroundColor: theme.palette.mode === 'dark'
                                    ? 'rgba(255,255,255,0.05)'
                                    : 'rgba(0,0,0,0.02)',
                                }
                              }}
                              variant="outlined"
                            />
                          )}
                        </Box>
                      )}
                    </Card>
                  ))}
                </Box>
              ) : (
                <Alert severity="success" sx={{ borderRadius: 2 }}>
                  No missing values to handle
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Data Type Conversions */}
        <Grid item xs={12}>
          <Card sx={{ 
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
                  Data Type Optimizations
                </Typography>
              </Box>
              {report.suggested_dtypes && Object.keys(report.suggested_dtypes).length > 0 ? (
                <Grid container spacing={2}>
                  {Object.entries(report.suggested_dtypes).map(([col, dtype]) => (
                    <Grid item xs={12} md={6} key={col}>
                      <Card sx={{
                        borderRadius: 2,
                        background: theme.palette.mode === 'dark'
                          ? 'rgba(255,255,255,0.05)'
                          : 'rgba(0,0,0,0.02)',
                        border: '1px solid',
                        borderColor: 'divider',
                        '&:hover': {
                          backgroundColor: theme.palette.mode === 'dark'
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(0,0,0,0.04)',
                          transform: 'translateY(-2px)',
                          boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                        }
                      }}>
                        <CardContent sx={{ p: 3 }}>
                          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                            {col} → <Chip label={dtype} size="small" color="primary" />
                          </Typography>
                          <FormControl component="fieldset">
                            <RadioGroup
                              value={cleaningActions.dataTypes[col] || 'convert'}
                              onChange={(e) => handleCleaningAction('dataTypes', col, e.target.value)}
                              sx={{ gap: 1 }}
                            >
                              <FormControlLabel 
                                value="convert" 
                                control={<Radio />} 
                                label="Convert to suggested type"
                                sx={{
                                  m: 0,
                                  p: 1.5,
                                  borderRadius: 2,
                                  border: cleaningActions.dataTypes[col] === 'convert' ? '2px solid' : '1px solid',
                                  borderColor: cleaningActions.dataTypes[col] === 'convert' ? 'primary.main' : 'divider',
                                  backgroundColor: cleaningActions.dataTypes[col] === 'convert' 
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
                                value="keep" 
                                control={<Radio />} 
                                label="Keep current type"
                                sx={{
                                  m: 0,
                                  p: 1.5,
                                  borderRadius: 2,
                                  border: cleaningActions.dataTypes[col] === 'keep' ? '2px solid' : '1px solid',
                                  borderColor: cleaningActions.dataTypes[col] === 'keep' ? 'primary.main' : 'divider',
                                  backgroundColor: cleaningActions.dataTypes[col] === 'keep' 
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
                          </FormControl>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Alert severity="success" sx={{ borderRadius: 2 }}>
                  All data types are optimized
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Outlier Cleaning Options */}
        {report.outliers && Object.keys(report.outliers).length > 0 && (
          <>
            <Grid item xs={12}>
              <Card sx={{ 
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
                    <Assessment sx={{ mr: 2, color: 'error.main' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      Outlier Cleaning
                    </Typography>
                  </Box>
                  <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                    Choose a method and action for each numeric column with detected outliers.<br/>
                    <strong>Winsorizing:</strong> Limits extreme values by capping them at the 5th and 95th percentiles.<br/>
                    <strong>IQR:</strong> Detects outliers as values outside 1.5×IQR below Q1 or above Q3.<br/>
                    <strong>Z-Score:</strong> Identifies outliers as values with a Z-score above 3 or below -3.
                  </Alert>
                  <Grid container spacing={2} alignItems="stretch">
                    {Object.entries(report.outliers).map(([col, out]) => {
                      const win = out.winsorizing?.count || 0;
                      const iqr = out.iqr?.count || 0;
                      const z = out.zscore?.count || 0;
                      if (win === 0 && iqr === 0 && z === 0) return null;
                      return (
                        <Grid item xs={12} md={4} key={col} style={{ display: 'flex' }}>
                          <Card sx={{ 
                            p: 3, 
                            height: '100%', 
                            width: '100%',
                            borderRadius: 2,
                            background: theme.palette.mode === 'dark'
                              ? 'rgba(255,255,255,0.05)'
                              : 'rgba(0,0,0,0.02)',
                            border: '1px solid',
                            borderColor: 'divider',
                            '&:hover': {
                              backgroundColor: theme.palette.mode === 'dark'
                                ? 'rgba(255,255,255,0.08)'
                                : 'rgba(0,0,0,0.04)',
                              transform: 'translateY(-2px)',
                              boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                            }
                          }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>{col}</Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <FormControl size="small" fullWidth>
                                <InputLabel>Method</InputLabel>
                                <Select
                                  value={cleaningActions.outliers?.[col]?.method || 'iqr'}
                                  label="Method"
                                  onChange={e => handleOutlierAction(col, 'method', e.target.value)}
                                  sx={{
                                    backgroundColor: theme.palette.mode === 'dark'
                                      ? 'rgba(255,255,255,0.05)'
                                      : 'rgba(0,0,0,0.02)',
                                    '& .MuiOutlinedInput-root': {
                                      borderRadius: 2,
                                    }
                                  }}
                                >
                                  {OUTLIER_METHODS.map(m => (
                                    <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                              <FormControl size="small" fullWidth>
                                <InputLabel>Action</InputLabel>
                                <Select
                                  value={cleaningActions.outliers?.[col]?.action || 'none'}
                                  label="Action"
                                  onChange={e => handleOutlierAction(col, 'action', e.target.value)}
                                  sx={{
                                    backgroundColor: theme.palette.mode === 'dark'
                                      ? 'rgba(255,255,255,0.05)'
                                      : 'rgba(0,0,0,0.02)',
                                    '& .MuiOutlinedInput-root': {
                                      borderRadius: 2,
                                    }
                                  }}
                                >
                                  {OUTLIER_ACTIONS.map(a => (
                                    <MenuItem key={a.value} value={a.value}>{a.label}</MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Box>
                            <Box sx={{ mt: 2, p: 2, backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)', borderRadius: 2 }}>
                              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                Detected: <Chip label={`W: ${win}`} size="small" /> <Chip label={`IQR: ${iqr}`} size="small" /> <Chip label={`Z: ${z}`} size="small" />
                              </Typography>
                            </Box>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                </CardContent>
              </Card>
            </Grid>
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mt: 2 }}>
                  <b>Note:</b> Removing outliers may not reduce the outlier count to zero, because outlier thresholds are recalculated on the cleaned data. You can repeat the process if you want to further reduce outliers.
                </Alert>
              </Grid>
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mt: 2 }}>
                  <b>What do the actions mean?</b><br/>
                  <b>Remove</b>: Deletes rows where the value is an outlier.<br/>
                  <b>Cap</b>: Replaces outlier values with the nearest threshold (e.g., 5th/95th percentile for Winsorizing).
                </Alert>
              </Grid>
            </>
          )}

        {/* Fill Value Configuration */}
        {Object.values(cleaningActions.nulls || {}).some(action => action === 'fill') && (
          <Grid item xs={12}>
            <Card sx={{ 
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
                    ⚙️ Fill Value Configuration
                  </Typography>
                </Box>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Fill Method</InputLabel>
                      <Select
                        value={fillMethod}
                        onChange={(e) => setFillMethod(e.target.value)}
                        label="Fill Method"
                        sx={{
                          backgroundColor: theme.palette.mode === 'dark'
                            ? 'rgba(255,255,255,0.05)'
                            : 'rgba(0,0,0,0.02)',
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                          }
                        }}
                      >
                        <MenuItem value="specific">Specific Value</MenuItem>
                        <MenuItem value="mean">Mean</MenuItem>
                        <MenuItem value="median">Median</MenuItem>
                        <MenuItem value="mode">Mode</MenuItem>
                        <MenuItem value="forward">Forward Fill</MenuItem>
                        <MenuItem value="backward">Backward Fill</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  {fillMethod === 'specific' && (
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        label="Fill Value"
                        value={fillValue}
                        onChange={(e) => setFillValue(e.target.value)}
                        placeholder="Enter value (e.g., NA, 0, 'Unknown')"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: 2,
                            backgroundColor: theme.palette.mode === 'dark'
                              ? 'rgba(255,255,255,0.05)'
                              : 'rgba(0,0,0,0.02)',
                          }
                        }}
                      />
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}
          </Grid>
        </CardContent>
      </Card>

      {/* Apply Button */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        {loading && (
          <Box sx={{ mb: 3 }}>
            <LinearProgress sx={{ borderRadius: 1, height: 6 }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
              Processing your cleaning actions...
            </Typography>
          </Box>
        )}
        <Button
          variant="contained"
          size="large"
          onClick={handleApplyCleaning}
          disabled={loading}
          startIcon={<Refresh />}
          sx={{
            px: 6,
            py: 2,
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
          {loading ? 'Applying Changes...' : 'Apply Data Cleaning'}
        </Button>
      </Box>

      {/* Success Message and Summary only after cleaning */}
      {hasCleaned && cleanedData && (
        <Box sx={{ mt: 4 }}>
          <Alert severity="success" sx={{ mb: 4, borderRadius: 3, p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Data cleaning applied successfully!
            </Typography>
            The dataset has been updated with your cleaning actions.
          </Alert>
          
          {/* Cleaning Actions Summary */}
          {cleaningSummary && cleaningSummary.length > 0 && (
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
                  <CheckCircle sx={{ mr: 2, color: 'success.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    📋 Cleaning Actions Applied
                  </Typography>
                </Box>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  {cleaningSummary.map((action, index) => (
                    <Typography key={index} component="li" sx={{ mb: 1.5, fontSize: '1rem' }}>
                      {action}
                    </Typography>
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}
          
          {/* Statistical Summary After Cleaning */}
          <Card sx={{ 
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
                <Assessment sx={{ mr: 2, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  📊 Statistical Summary After Cleaning
                </Typography>
              </Box>
              {cleanedData.after?.statistical_summary ? (
                <Grid container spacing={2}>
                  {Object.entries(cleanedData.after.statistical_summary).map(([stat, values]) => (
                    <Grid item xs={12} md={6} key={stat}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom sx={{ textTransform: 'capitalize' }}>
                            {stat}
                          </Typography>
                          <TableContainer>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Column</TableCell>
                                  <TableCell align="right">Value</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {Object.entries(values).map(([col, val]) => (
                                  <TableRow key={col}>
                                    <TableCell>{col}</TableCell>
                                    <TableCell align="right">
                                      {typeof val === 'number' ? val.toFixed(2) : val}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography color="text.secondary">
                  No statistical summary available for the cleaned data.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

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
        
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Button
          component={Link}
          to="/analysis"
          variant="outlined"
          size="large"
          sx={{
            px: 6,
            py: 2,
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
          Go to Analysis
        </Button>
      </Box>
    </Box>
  );
}

export default CleaningPage; 