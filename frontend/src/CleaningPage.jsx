import { useEffect, useState } from 'react';
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

function CleaningPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cleaningActions, setCleaningActions] = useState({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [fillValue, setFillValue] = useState('');
  const [fillMethod, setFillMethod] = useState('specific');
  const [cleanedData, setCleanedData] = useState(null);

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
      
      // Initialize cleaning actions
      const initialActions = {
        duplicates: 'remain',
        nulls: {},
        dataTypes: {}
      };
      
      // Initialize null value actions for each column
      if (data.nulls) {
        Object.keys(data.nulls).forEach(col => {
          initialActions.nulls[col] = 'remain';
        });
      }
      
      // Initialize data type actions
      if (data.suggested_dtypes) {
        Object.keys(data.suggested_dtypes).forEach(col => {
          initialActions.dataTypes[col] = 'convert';
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
      
      const cleaningConfig = {
        duplicates: cleaningActions.duplicates,
        nulls: cleaningActions.nulls,
        dataTypes: cleaningActions.dataTypes,
        fillValue,
        fillMethod
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
        // Refresh the report
        fetchReport();
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
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Data Cleaning
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Review and apply data cleaning operations to improve your dataset quality
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
                      row
                      value={cleaningActions.nulls?.[col]?.action || ''}
                      onChange={e => handleNullAction(col, e.target.value)}
                          >
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

      {/* Success Message */}
      {cleanedData && (
        <Box sx={{ mt: 3 }}>
          <Alert severity="success" sx={{ mb: 3 }}>
            Data cleaning applied successfully! The dataset has been updated.
          </Alert>
          
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
    </Box>
  );
}

export default CleaningPage; 