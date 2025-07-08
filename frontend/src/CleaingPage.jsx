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
  FormLabel,
  List,
  ListItem,
  ListItemText
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
            </Box>
          </Paper>
        </Grid>

        {/* Null Value Handling */}
        <Grid item xs={12} md={6}>
          <Paper>
            <Box p={3}>
              <Typography variant="h6" gutterBottom>
                Null Values
              </Typography>
              {report.nulls && Object.keys(report.nulls).length > 0 ? (
                <Box>
                  {Object.entries(report.nulls).map(([col, count]) => (
                    <Accordion key={col} sx={{ mb: 1 }}>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Typography variant="subtitle1">
                          {col} ({count} missing)
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <FormControl component="fieldset" fullWidth>
                          <FormLabel component="legend">Action:</FormLabel>
                          <RadioGroup
                            value={cleaningActions.nulls[col] || 'remain'}
                            onChange={(e) => handleCleaningAction('nulls', col, e.target.value)}
                          >
                            <FormControlLabel 
                              value="delete_row" 
                              control={<Radio />} 
                              label="Delete rows with nulls" 
                            />
                            <FormControlLabel 
                              value="delete_column" 
                              control={<Radio />} 
                              label="Delete entire column" 
                            />
                            <FormControlLabel 
                              value="fill" 
                              control={<Radio />} 
                              label="Fill with value" 
                            />
                            <FormControlLabel 
                              value="remain" 
                              control={<Radio />} 
                              label="Keep as is" 
                            />
                          </RadioGroup>
                        </FormControl>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </Box>
              ) : (
                <Typography color="success.main">✓ No null values found</Typography>
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
        <>
          <Alert severity="success" sx={{ mt: 3 }}>
            Data cleaning applied successfully! The dataset has been updated.
          </Alert>

          {/* Cleaned Data Report Section */}
          <Paper sx={{ mt: 4, p: 3 }}>
            <Typography variant="h5" gutterBottom>Cleaned Data Report</Typography>

            {/* 1. Before vs. After Comparison */}
            <Typography variant="h6" sx={{ mt: 2 }}>Before vs. After Comparison</Typography>
            <TableContainer sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell></TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Before</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>After</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell>Rows</TableCell>
                    <TableCell>{cleanedData.before.shape.rows}</TableCell>
                    <TableCell>{cleanedData.after.shape.rows}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Columns</TableCell>
                    <TableCell>{cleanedData.before.shape.columns}</TableCell>
                    <TableCell>{cleanedData.after.shape.columns}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Duplicates</TableCell>
                    <TableCell>{cleanedData.before.duplicates}</TableCell>
                    <TableCell>{cleanedData.after.duplicates}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Nulls (total)</TableCell>
                    <TableCell>{Object.values(cleanedData.before.nulls || {}).reduce((a, b) => a + b, 0)}</TableCell>
                    <TableCell>{Object.values(cleanedData.after.nulls || {}).reduce((a, b) => a + b, 0)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            {/* Data Type Changes */}
            {cleanedData.dtype_changes && Object.keys(cleanedData.dtype_changes).length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Data Type Changes</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Column</TableCell>
                        <TableCell>Before</TableCell>
                        <TableCell>After</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(cleanedData.dtype_changes).map(([col, change]) => (
                        <TableRow key={col}>
                          <TableCell>{col}</TableCell>
                          <TableCell>{change.before}</TableCell>
                          <TableCell>{change.after}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}

            {/* 3. Updated Data Quality Metrics */}
            <Typography variant="h6" sx={{ mt: 2 }}>Updated Data Quality Metrics</Typography>
            <Box display="flex" gap={3} flexWrap="wrap" sx={{ mb: 3 }}>
              {Object.entries(cleanedData.after.quality_metrics || {})
                .filter(([metric]) => metric !== 'data_types_optimized')
                .map(([metric, value]) => (
                  <Box key={metric} sx={{ minWidth: 150 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                      {metric.replace(/_/g, ' ')}
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {typeof value === 'number' ? `${value}%` : value}
                    </Typography>
                  </Box>
                ))}
            </Box>

            {/* 4. Statistical Summaries (After Cleaning) */}
            {cleanedData.after.statistical_summary && Object.keys(cleanedData.after.statistical_summary).length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6">Statistical Summaries (After Cleaning)</Typography>
                {Object.keys(cleanedData.after.statistical_summary).map((metric) => (
                  <Accordion key={metric} sx={{ mb: 2 }}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="subtitle1" sx={{ textTransform: 'capitalize', fontWeight: 'bold' }}>
                        {metric} Values
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 'bold' }}>Column</TableCell>
                              <TableCell sx={{ fontWeight: 'bold' }} align="right">Value</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {Object.entries(cleanedData.after.statistical_summary[metric]).map(([column, value]) => (
                              <TableRow key={column}>
                                <TableCell>{column}</TableCell>
                                <TableCell align="right">
                                  {typeof value === 'number' ? value.toFixed(2) : String(value)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            )}

            {/* 6. Warnings or Recommendations */}
            {cleanedData.warnings && cleanedData.warnings.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" color="warning.main">Warnings / Recommendations</Typography>
                <List>
                  {cleanedData.warnings.map((w, i) => (
                    <ListItem key={i}>
                      <ListItemText primary={w} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}

            {/* Preview of Cleaned Data */}
            {cleanedData.after.preview && cleanedData.after.preview.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6">Preview of Cleaned Data</Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {Object.keys(cleanedData.after.preview[0]).map(col => (
                          <TableCell key={col} sx={{ fontWeight: 'bold' }}>{col}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {cleanedData.after.preview.map((row, i) => (
                        <TableRow key={i}>
                          {Object.values(row).map((val, j) => (
                            <TableCell key={j}>{val !== null && val !== undefined ? String(val) : 'null'}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </Paper>
        </>
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