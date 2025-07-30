import { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  CircularProgress,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Card,
  CardContent,
  Grid,
  Chip,
  useTheme
} from '@mui/material';
import { 
  ExpandMore,
  CleaningServices,
  Analytics,
  Assessment,
  Warning,
  CheckCircle,
  Storage,
  DataUsage,
  Preview,
  TableChart
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import React from 'react';

function ReportPage() {
  const theme = useTheme();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch the report from the backend when the component loads
  useEffect(() => {
    setLoading(true);
    fetch('http://localhost:5001/cleaning', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setReport(data);
        setLoading(false);
      })
      .catch(err => {
        setReport({ error: 'Failed to fetch report' });
        setLoading(false);
      });
  }, []);

  const handleProceedToCleaning = () => {
    navigate('/cleaning');
  };

  // Show loading or error messages
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
            Loading quality report...
          </Typography>
        </Box>
      </Box>
    );
  }

  if (!report) return (
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: theme.palette.mode === 'dark' 
        ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
        : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center' 
    }}>
      <Typography variant="h6" color="text.secondary">Loading...</Typography>
    </Box>
  );
  
  if (report.error) return (
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
          Please upload a dataset before viewing the report.
        </Typography>
        <Button 
          variant="contained" 
          size="large"
          color="primary" 
          href="/upload" 
          sx={{ 
            fontWeight: 600, 
            fontSize: '1.1rem', 
            borderRadius: 3,
            py: 2.5,
            px: 6
          }}
        >
          Go to Upload Page
        </Button>
      </Paper>
    </Box>
  );

  // Get the preview rows (if available)
  const previewRows = report.preview || [];

  // Check if there are any issues that need cleaning
  const hasIssues = (
    (report.duplicates && report.duplicates > 0) ||
    (report.nulls && Object.keys(report.nulls).length > 0) ||
    (report.suggested_dtypes && Object.keys(report.suggested_dtypes).length > 0)
  );

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
        <Assessment sx={{ fontSize: 36, mb: 1, opacity: 0.9 }} />
        <Typography variant="h5" sx={{ 
          mb: 1, 
          fontWeight: 600,
          textShadow: '0 1px 3px rgba(0,0,0,0.3)'
        }}>
          Data Quality Report
        </Typography>
        <Typography variant="body1" sx={{ 
          mb: 0, 
          opacity: 0.85,
          maxWidth: 500,
          mx: 'auto',
          fontSize: '0.95rem'
        }}>
          Gain insights into your dataset quality and identify areas for improvement
        </Typography>
      </Box>

      {/* Preview Table */}
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
            <Preview sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Dataset Preview
            </Typography>
          </Box>
          {previewRows.length > 0 ? (
            <TableContainer sx={{ 
              borderRadius: 2, 
              border: '1px solid',
              borderColor: 'divider',
              maxHeight: 400,
              overflow: 'auto'
            }}>
              <Table size="small">
                <TableHead sx={{ 
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? 'rgba(255,255,255,0.05)' 
                    : 'rgba(0,0,0,0.02)' 
                }}>
                  <TableRow>
                    {Object.keys(previewRows[0]).map(col => (
                      <TableCell key={col} sx={{ fontWeight: 600, py: 2 }}>
                        {col}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewRows.map((row, i) => (
                    <TableRow key={i} sx={{ 
                      '&:hover': { 
                        backgroundColor: theme.palette.mode === 'dark'
                          ? 'rgba(255,255,255,0.05)'
                          : 'rgba(0,0,0,0.02)' 
                      }
                    }}>
                      {Object.values(row).map((val, j) => (
                        <TableCell key={j} sx={{ py: 1.5 }}>
                          {val !== null && val !== undefined ? String(val) : (
                            <Chip label="null" size="small" color="warning" variant="outlined" />
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              No preview data available.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Quality Issues Section */}
      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: 3, 
        mb: 4, 
        width: '100%' 
      }}>
        {/* Null Values */}
        <Box sx={{ flex: '1 1 0', minWidth: 300 }}>
          <Card sx={{ 
            height: '100%',
            borderRadius: 3, 
            boxShadow: theme.palette.mode === 'dark'
              ? '0 8px 32px rgba(0,0,0,0.4)'
              : '0 8px 32px rgba(0,0,0,0.1)',
            border: theme.palette.mode === 'dark'
              ? '1px solid rgba(255,255,255,0.1)'
              : '1px solid rgba(255,255,255,0.2)',
            background: theme.palette.mode === 'dark'
              ? 'rgba(30, 30, 30, 0.95)'
              : 'rgba(255,255,255,0.95)',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: theme.palette.mode === 'dark'
                ? '0 12px 40px rgba(0,0,0,0.6)'
                : '0 12px 40px rgba(0,0,0,0.15)',
            }
          }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Warning sx={{ mr: 2, color: 'warning.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Null Values
                </Typography>
              </Box>
              {report.nulls && Object.keys(report.nulls).length > 0 ? (
                <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                  {Object.entries(report.nulls).map(([col, count]) => (
                    <ListItem key={col} sx={{ px: 0 }}>
                      <ListItemText 
                        primary={
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {col}
                          </Typography>
                        }
                        secondary={
                          <Chip 
                            label={`${count} missing values`}
                            size="small" 
                            color="warning" 
                            variant="outlined"
                          />
                        }
                        secondaryTypographyProps={{
                          component: 'div'
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Alert severity="success" sx={{ borderRadius: 2 }}>
                  ✓ No null values found
                </Alert>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Duplicate Rows */}
        <Box sx={{ flex: '1 1 0', minWidth: 300 }}>
          <Card sx={{ 
            height: '100%',
            borderRadius: 3, 
            boxShadow: theme.palette.mode === 'dark'
              ? '0 8px 32px rgba(0,0,0,0.4)'
              : '0 8px 32px rgba(0,0,0,0.1)',
            border: theme.palette.mode === 'dark'
              ? '1px solid rgba(255,255,255,0.1)'
              : '1px solid rgba(255,255,255,0.2)',
            background: theme.palette.mode === 'dark'
              ? 'rgba(30, 30, 30, 0.95)'
              : 'rgba(255,255,255,0.95)',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: theme.palette.mode === 'dark'
                ? '0 12px 40px rgba(0,0,0,0.6)'
                : '0 12px 40px rgba(0,0,0,0.15)',
            }
          }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <DataUsage sx={{ mr: 2, color: 'info.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Duplicate Rows
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h2" color="primary" sx={{ fontWeight: 700, mb: 1 }}>
                  {report.duplicates || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  duplicate rows found
                </Typography>
                {report.duplicates > 0 && (
                  <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
                    Consider removing duplicates
                  </Alert>
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Suggested Data Type Fixes */}
        <Box sx={{ flex: '1 1 0', minWidth: 300 }}>
          <Card sx={{ 
            height: '100%',
            borderRadius: 3, 
            boxShadow: theme.palette.mode === 'dark'
              ? '0 8px 32px rgba(0,0,0,0.4)'
              : '0 8px 32px rgba(0,0,0,0.1)',
            border: theme.palette.mode === 'dark'
              ? '1px solid rgba(255,255,255,0.1)'
              : '1px solid rgba(255,255,255,0.2)',
            background: theme.palette.mode === 'dark'
              ? 'rgba(30, 30, 30, 0.95)'
              : 'rgba(255,255,255,0.95)',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: theme.palette.mode === 'dark'
                ? '0 12px 40px rgba(0,0,0,0.6)'
                : '0 12px 40px rgba(0,0,0,0.15)',
            }
          }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Storage sx={{ mr: 2, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Data Type Suggestions
                </Typography>
              </Box>
              {report.suggested_dtypes && Object.keys(report.suggested_dtypes).length > 0 ? (
                <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                  {Object.entries(report.suggested_dtypes).map(([col, dtype]) => (
                    <ListItem key={col} sx={{ px: 0 }}>
                      <ListItemText 
                        primary={
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {col}
                          </Typography>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption">→</Typography>
                            <Chip 
                              label={dtype}
                              size="small" 
                              color="primary" 
                              variant="outlined"
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Alert severity="success" sx={{ borderRadius: 2 }}>
                  ✓ No suggestions needed
                </Alert>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Statistical Summaries Section */}
      {report.statistical_summary && Object.keys(report.statistical_summary).length > 0 && (
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
                Statistical Summaries (Numeric Columns)
              </Typography>
            </Box>
            
            {Object.keys(report.statistical_summary).map((metric) => (
              <Accordion 
                key={metric} 
                sx={{ 
                  mb: 2,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:before': { display: 'none' },
                  boxShadow: theme.palette.mode === 'dark'
                    ? '0 4px 12px rgba(0,0,0,0.3)'
                    : '0 4px 12px rgba(0,0,0,0.1)',
                }}
              >
                <AccordionSummary 
                  expandIcon={<ExpandMore />}
                  sx={{
                    backgroundColor: theme.palette.mode === 'dark'
                      ? 'rgba(255,255,255,0.05)'
                      : 'rgba(0,0,0,0.02)',
                    borderRadius: '8px 8px 0 0',
                    '&:hover': {
                      backgroundColor: theme.palette.mode === 'dark'
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(0,0,0,0.04)',
                    }
                  }}
                >
                  <Typography variant="subtitle1" sx={{ textTransform: 'capitalize', fontWeight: 600 }}>
                    {metric} Values
                  </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  <TableContainer>
                    <Table size="small">
                      <TableHead sx={{ 
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? 'rgba(255,255,255,0.02)' 
                          : 'rgba(0,0,0,0.01)' 
                      }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 600, py: 2 }}>Column</TableCell>
                          <TableCell sx={{ fontWeight: 600, py: 2 }} align="right">Value</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Object.entries(report.statistical_summary[metric]).map(([column, value]) => (
                          <TableRow key={column} sx={{
                            '&:hover': { 
                              backgroundColor: theme.palette.mode === 'dark'
                                ? 'rgba(255,255,255,0.05)'
                                : 'rgba(0,0,0,0.02)' 
                            }
                          }}>
                            <TableCell sx={{ py: 1.5 }}>{column}</TableCell>
                            <TableCell align="right" sx={{ py: 1.5 }}>
                              <Chip 
                                label={typeof value === 'number' ? value.toFixed(2) : String(value)}
                                size="small"
                                variant="outlined"
                                color="primary"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </AccordionDetails>
              </Accordion>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Outliers Detected Section */}
      {report.outliers && Object.keys(report.outliers).length > 0 && (
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
              <Assessment sx={{ mr: 2, color: 'error.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Outliers Detected
              </Typography>
            </Box>
            <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
              <strong>Detection Methods:</strong><br/>
              <strong>Winsorizing:</strong> Limits extreme values by capping them at the 5th and 95th percentiles.<br/>
              <strong>IQR:</strong> Detects outliers as values outside 1.5×IQR below Q1 or above Q3.<br/>
              <strong>Z-Score:</strong> Identifies outliers as values with a Z-score above 3 or below -3.
            </Alert>
            <TableContainer sx={{ 
              borderRadius: 2, 
              border: '1px solid',
              borderColor: 'divider',
              maxHeight: 400,
              overflow: 'auto'
            }}>
              <Table size="small">
                <TableHead sx={{ 
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? 'rgba(255,255,255,0.05)' 
                    : 'rgba(0,0,0,0.02)' 
                }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, py: 2 }}>Column</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, py: 2 }}>Winsorizing</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, py: 2 }}>IQR</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, py: 2 }}>Z-Score</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(report.outliers).map(([col, out]) => (
                    <TableRow key={col} sx={{
                      '&:hover': { 
                        backgroundColor: theme.palette.mode === 'dark'
                          ? 'rgba(255,255,255,0.05)'
                          : 'rgba(0,0,0,0.02)' 
                      }
                    }}>
                      <TableCell sx={{ py: 1.5, fontWeight: 600 }}>{col}</TableCell>
                      <TableCell align="right" sx={{ py: 1.5 }}>
                        <Chip 
                          label={out.winsorizing?.count || 0}
                          size="small"
                          color={out.winsorizing?.count > 0 ? "warning" : "default"}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1.5 }}>
                        <Chip 
                          label={out.iqr?.count || 0}
                          size="small"
                          color={out.iqr?.count > 0 ? "warning" : "default"}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ py: 1.5 }}>
                        <Chip 
                          label={out.zscore?.count || 0}
                          size="small"
                          color={out.zscore?.count > 0 ? "warning" : "default"}
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Quality Metrics */}
      {report.quality_metrics && Object.keys(report.quality_metrics).length > 0 && (
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
                Quality Metrics
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
              {Object.entries(report.quality_metrics)
                .filter(([metric]) => metric !== 'data_types_optimized')
                .map(([metric, value]) => (
                  <Box key={metric} sx={{ flex: '1 1 0', minWidth: 200 }}>
                    <Card sx={{
                      p: 3,
                      textAlign: 'center',
                      borderRadius: 2,
                      background: theme.palette.mode === 'dark'
                        ? 'rgba(255,255,255,0.05)'
                        : 'rgba(0,0,0,0.02)',
                      border: '1px solid',
                      borderColor: 'divider',
                      height: '100%',
                      '&:hover': {
                        backgroundColor: theme.palette.mode === 'dark'
                          ? 'rgba(255,255,255,0.08)'
                          : 'rgba(0,0,0,0.04)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                      }
                    }}>
                      <Typography variant="body2" color="text.secondary" sx={{ 
                        textTransform: 'capitalize', 
                        mb: 2,
                        fontWeight: 500
                      }}>
                        {metric.replace(/_/g, ' ')}
                      </Typography>
                      <Typography variant="h4" color="primary" sx={{ fontWeight: 700 }}>
                        {typeof value === 'number' ? `${value}%` : value}
                      </Typography>
                    </Card>
                  </Box>
                ))}
              
              {/* Total Quality Percentage */}
              <Box sx={{ flex: '1 1 0', minWidth: 200 }}>
                <Card sx={{
                  p: 3,
                  textAlign: 'center',
                  borderRadius: 2,
                  background: theme.palette.mode === 'dark'
                    ? 'rgba(255,255,255,0.05)'
                    : 'rgba(0,0,0,0.02)',
                  border: '1px solid',
                  borderColor: 'divider',
                  height: '100%',
                  '&:hover': {
                    backgroundColor: theme.palette.mode === 'dark'
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(0,0,0,0.04)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                  }
                }}>
                  <Typography variant="body2" color="text.secondary" sx={{ 
                    mb: 2,
                    fontWeight: 500
                  }}>
                    Total Quality
                  </Typography>
                  <Typography variant="h4" color="success.main" sx={{ fontWeight: 700 }}>
                    {report.data_quality_score ? `${report.data_quality_score.toFixed(1)}%` : 'N/A'}
                  </Typography>
                </Card>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Proceed to Cleaning Button at the end of the page */}
      <Box sx={{ mt: 6, mb: 4, textAlign: 'center' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<CleaningServices />}
          onClick={handleProceedToCleaning}
          sx={{ 
            px: 6,
            py: 2.5,
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
          {hasIssues ? 'Proceed to Data Cleaning' : 'Review Data Quality'}
        </Button>
      </Box>
    </Box>
  );
}

export default ReportPage;