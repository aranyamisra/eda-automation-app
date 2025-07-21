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
  FormLabel
} from '@mui/material';
import { 
  ExpandMore,
  Delete,
  ContentCopy,
  Warning,
  CheckCircle,
  DataUsage,
  Storage,
  Assessment
} from '@mui/icons-material';
import { Link } from 'react-router-dom';

function CleaningPage() {
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
        
        // Update the report with the cleaning result, but preserve null info for 'remain' columns
        if (result.after?.nulls) {
          const updatedReport = { ...report };
          // Keep null counts for columns where we chose to 'remain'
          Object.entries(cleaningActions.nulls || {}).forEach(([col, action]) => {
            if (action?.action === 'remain' && report.nulls?.[col]) {
              if (!result.after.nulls) result.after.nulls = {};
              result.after.nulls[col] = report.nulls[col];
            }
          });
          setReport(prev => ({
            ...prev,
            dataset_info: result.after.shape,
            nulls: result.after.nulls,
            duplicates: result.after.duplicates,
            data_quality_score: result.after.data_quality_score,
            quality_metrics: result.after.quality_metrics,
            statistical_summary: result.after.statistical_summary,
            outliers: result.after.outliers,
            suggested_dtypes: result.after.suggested_dtypes || prev.suggested_dtypes
          }));
        } else {
          // Update the report with the new dataset information
          setReport(prev => ({
            ...prev,
            dataset_info: result.after.shape,
            nulls: result.after.nulls || {},
            duplicates: result.after.duplicates || 0,
            data_quality_score: result.after.data_quality_score || 0,
            quality_metrics: result.after.quality_metrics || {},
            statistical_summary: result.after.statistical_summary || {},
            outliers: result.after.outliers || {},
            suggested_dtypes: result.after.suggested_dtypes || prev.suggested_dtypes
          }));
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
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (!report || report.error) {
    return (
      <Box p={3}>
        <Alert severity="error">
          {report?.error || 'No data available. Please upload a file first.'}
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={5}>
      <Typography variant="h4" gutterBottom>
        Data Cleaning
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Clean and prepare your dataset for analysis by addressing missing values, duplicates, data type inconsistencies, and outliers. Use the interactive tools below to apply data cleaning actions and improve the quality of your data.
      </Typography>

      {/* Data Summary */}
      <Paper sx={{ mb: 4 }}>
        <Box p={3}>
          <Typography variant="h6" gutterBottom>
            Dataset Summary
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Storage color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Shape</Typography>
                  </Box>
                  <Typography variant="h4" color="primary">
                    {report.dataset_info?.rows || 0} × {report.dataset_info?.columns || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Assessment color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Quality Score</Typography>
                  </Box>
                  <Typography variant="h4" color="primary">
                    {report.data_quality_score || 0}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <Warning color="warning" sx={{ mr: 1 }} />
                    <Typography variant="h6">Missing Values</Typography>
                  </Box>
                  <Typography variant="h4" color="warning.main">
                    {report.quality_metrics?.null_percentage || 0}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Box display="flex" alignItems="center" mb={1}>
                    <ContentCopy color="info" sx={{ mr: 1 }} />
                    <Typography variant="h6">Duplicates</Typography>
                  </Box>
                  <Typography variant="h4" color="info.main">
                    {report.duplicates || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Cleaning Options */}
      <Grid container spacing={3}>
        {/* Duplicate Handling */}
        <Grid item xs={12} md={6}>
          <Paper>
            <Box p={3}>
              <Typography variant="h6" gutterBottom>
                Duplicate Values ({report.duplicates || 0} found)
              </Typography>
              {report.duplicates > 0 ? (
                <div>
              <FormControl component="fieldset">
                <FormLabel component="legend">Action:</FormLabel>
                <RadioGroup
                  value={cleaningActions.duplicates || 'remain'}
                  onChange={(e) => handleCleaningAction('duplicates', null, e.target.value)}
                >
                  <FormControlLabel value="delete" control={<Radio />} label="Delete duplicates" />
                  <FormControlLabel value="remain" control={<Radio />} label="Keep duplicates" />
                </RadioGroup>
              </FormControl>
                </div>
              ) : (
                <Typography color="success.main">✓ No duplicate values found</Typography>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Null Value Handling */}
        <Grid item xs={12} md={6}>
          <Paper>
            <Box p={3}>
              <Typography variant="h6" gutterBottom>
                Handle Missing Values
              </Typography>
              {Object.keys(report.nulls || {}).length > 0 ? (
                Object.entries(report.nulls).map(([col, count]) => (
                <Paper key={col} elevation={2} sx={{ mb: 3, p: 2, minHeight: 170, position: 'relative', overflow: 'visible' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {col} <span style={{ color: '#888' }}>({count} nulls)</span>
                        </Typography>
                  <FormControl component="fieldset" sx={{ mt: 1 }}>
                    <FormLabel component="legend" sx={{ fontSize: 14 }}>Action</FormLabel>
                          <RadioGroup
                            value={cleaningActions.nulls?.[col]?.action || 'remain'}
                            onChange={e => handleNullAction(col, e.target.value)}
                            row
                          >
                            <FormControlLabel value="remain" control={<Radio />} label="Keep nulls" />
                            <FormControlLabel value="delete_row" control={<Radio />} label="Delete rows" />
                            <FormControlLabel value="delete_column" control={<Radio />} label="Delete column" />
                            <FormControlLabel value="fill" control={<Radio />} label="Fill with value" />
                          </RadioGroup>
                  </FormControl>
                  <Box
                    sx={{
                      ml: 3,
                      mt: 1,
                      minHeight: 60, // Reserve space for fill options/input
                      transition: 'min-height 0.3s',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {cleaningActions.nulls?.[col]?.action === 'fill' && (
                      <Box sx={{ ml: 3, mt: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <FormControl size="small" sx={{ minWidth: 180 }}>
                          <InputLabel id={`fill-method-label-${col}`}>Fill method</InputLabel>
                          <Select
                            labelId={`fill-method-label-${col}`}
                            id={`fill-method-select-${col}`}
                            value={cleaningActions.nulls?.[col]?.fillMethod || 'specific'}
                            label="Fill method"
                            onChange={e => handleFillMethodChange(col, e.target.value)}
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
                            sx={{ width: 180 }}
                            variant="outlined"
                          />
                        )}
                </Box>
              )}
                  </Box>
                </Paper>
              ))
              ) : (
                <Typography color="success.main">✓ No missing values to handle</Typography>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Data Type Conversions */}
        <Grid item xs={12}>
          <Paper>
            <Box p={3}>
              <Typography variant="h6" gutterBottom>
                Data Type Optimizations
              </Typography>
              {report.suggested_dtypes && Object.keys(report.suggested_dtypes).length > 0 ? (
                <Grid container spacing={2}>
                  {Object.entries(report.suggested_dtypes).map(([col, dtype]) => (
                    <Grid item xs={12} md={6} key={col}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom>
                            {col} → {dtype}
                          </Typography>
                          <FormControl component="fieldset">
                            <RadioGroup
                              value={cleaningActions.dataTypes[col] || 'convert'}
                              onChange={(e) => handleCleaningAction('dataTypes', col, e.target.value)}
                            >
                              <FormControlLabel 
                                value="convert" 
                                control={<Radio />} 
                                label="Convert to suggested type" 
                              />
                              <FormControlLabel 
                                value="keep" 
                                control={<Radio />} 
                                label="Keep current type" 
                              />
                            </RadioGroup>
                          </FormControl>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography color="success.main">✓ All data types are optimized</Typography>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Outlier Cleaning Options */}
        {report.outliers && Object.keys(report.outliers).length > 0 && (
          <>
            <Grid item xs={12}>
              <Paper>
                <Box p={3}>
                  <Typography variant="h6" gutterBottom>
                    Outlier Cleaning
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2 }}>
                    Choose a method and action for each numeric column with detected outliers.<br/>
                    <b>Winsorizing:</b> Limits extreme values by capping them at the 5th and 95th percentiles.<br/>
                    <b>IQR (Interquartile Range):</b> Detects outliers as values outside 1.5×IQR below Q1 or above Q3.<br/>
                    <b>Z-Score:</b> Identifies outliers as values with a Z-score above 3 or below -3.
                  </Typography>
                  <Grid container spacing={2} alignItems="stretch">
                    {Object.entries(report.outliers).map(([col, out]) => {
                      const win = out.winsorizing?.count || 0;
                      const iqr = out.iqr?.count || 0;
                      const z = out.zscore?.count || 0;
                      if (win === 0 && iqr === 0 && z === 0) return null;
                      return (
                        <Grid item xs={12} md={4} key={col} style={{ display: 'flex' }}>
                          <Paper elevation={2} sx={{ p: 2, height: '100%', width: '100%' }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{col}</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
                              <FormControl size="small" sx={{ minWidth: 160 }}>
                                <InputLabel>Method</InputLabel>
                                <Select
                                  value={cleaningActions.outliers?.[col]?.method || 'iqr'}
                                  label="Method"
                                  onChange={e => handleOutlierAction(col, 'method', e.target.value)}
                                >
                                  {OUTLIER_METHODS.map(m => (
                                    <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                              <FormControl size="small" sx={{ minWidth: 160 }}>
                                <InputLabel>Action</InputLabel>
                                <Select
                                  value={cleaningActions.outliers?.[col]?.action || 'none'}
                                  label="Action"
                                  onChange={e => handleOutlierAction(col, 'action', e.target.value)}
                                >
                                  {OUTLIER_ACTIONS.map(a => (
                                    <MenuItem key={a.value} value={a.value}>{a.label}</MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Box>
                            <Box sx={{ mt: 1, fontSize: 13 }}>
                              <b>Detected:</b> Winsorizing: {win}, IQR: {iqr}, Z-Score: {z}
                            </Box>
                          </Paper>
                        </Grid>
                      );
                    })}
                  </Grid>
                </Box>
              </Paper>
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
            <Paper>
              <Box p={3}>
                <Typography variant="h6" gutterBottom>
                  Fill Value Configuration
                </Typography>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={4}>
                    <FormControl fullWidth>
                      <InputLabel>Fill Method</InputLabel>
                      <Select
                        value={fillMethod}
                        onChange={(e) => setFillMethod(e.target.value)}
                        label="Fill Method"
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
                      />
                    </Grid>
                  )}
                </Grid>
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Apply Button */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Button
          variant="contained"
          size="large"
          onClick={handleApplyCleaning}
          disabled={loading}
          sx={{ px: 4, py: 1.5 }}
        >
          {loading ? 'Applying Changes...' : 'Apply Data Cleaning'}
        </Button>
      </Box>

      {/* Success Message and Summary only after cleaning */}
      {hasCleaned && cleanedData && (
        <Box sx={{ mt: 3 }}>
          <Alert severity="success" sx={{ mb: 3 }}>
            Data cleaning applied successfully! The dataset has been updated.
          </Alert>
          
          {/* Cleaning Actions Summary */}
          {cleaningSummary && cleaningSummary.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Cleaning Actions Applied
              </Typography>
              <Box component="ul" sx={{ pl: 2, m: 0 }}>
                {cleaningSummary.map((action, index) => (
                  <Typography key={index} component="li" sx={{ mb: 1 }}>
                    {action}
                  </Typography>
                ))}
              </Box>
            </Paper>
          )}
          
          {/* Statistical Summary After Cleaning */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Statistical Summary After Cleaning
            </Typography>
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
          </Paper>
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
          variant="contained"
          color="secondary"
          size="large"
          sx={{ px: 4, py: 1.5 }}
        >
          Go to Analysis
        </Button>
      </Box>
    </Box>
  );
}

export default CleaningPage; 