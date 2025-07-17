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
  AccordionDetails
} from '@mui/material';
import { 
  ExpandMore,
  CleaningServices,
  Analytics
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

function ReportPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch the report from the backend when the component loads
  useEffect(() => {
    setLoading(true);
    fetch('http://localhost:5001/cleaning', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        console.log('Received report data:', data);
        console.log('Statistical summary:', data.statistical_summary);
        console.log('Quality metrics:', data.quality_metrics);
        console.log('Data quality score:', data.data_quality_score);
        setReport(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching report:', err);
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
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (!report) return <p>Loading...</p>;
  if (report.error) return <p>Error: {report.error}</p>;

  // Get the preview rows (if available)
  const previewRows = report.preview || [];

  // Check if there are any issues that need cleaning
  const hasIssues = (
    (report.duplicates && report.duplicates > 0) ||
    (report.nulls && Object.keys(report.nulls).length > 0) ||
    (report.suggested_dtypes && Object.keys(report.suggested_dtypes).length > 0)
  );

  return (
    <Box p={5}>
      <Typography variant="h4" gutterBottom>
        Data Quality Report
      </Typography>

      {/* Short Summary */}
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Gain insights into the quality of your dataset by identifying issues such as null values, duplicates, and data type inconsistencies. Use this information to prepare your data for effective analysis.
      </Typography>

      {/* Proceed to Cleaning Button */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<CleaningServices />}
          onClick={handleProceedToCleaning}
          sx={{ 
            px: 4, 
            py: 1.5,
            fontSize: '1.1rem',
            backgroundColor: hasIssues ? '#e91e63' : '#009688',
            '&:hover': {
              backgroundColor: hasIssues ? '#c2185b' : '#00796b'
            }
          }}
        >
          {hasIssues ? 'Proceed to Data Cleaning' : 'Review Data Quality'}
        </Button>
        {hasIssues && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Issues detected: {report.duplicates || 0} duplicates, {Object.keys(report.nulls || {}).length} columns with nulls, {Object.keys(report.suggested_dtypes || {}).length} data type optimizations
          </Typography>
        )}
      </Box>

      {/* Preview Table */}
      <Paper sx={{ mb: 4 }}>
        <Box p={3}>
          <Typography variant="h6" gutterBottom>
            Dataset Preview
          </Typography>
          {previewRows.length > 0 ? (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {Object.keys(previewRows[0]).map(col => (
                      <TableCell key={col} sx={{ fontWeight: 'bold' }}>
                        {col}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewRows.map((row, i) => (
                    <TableRow key={i}>
                      {Object.values(row).map((val, j) => (
                        <TableCell key={j}>
                          {val !== null && val !== undefined ? String(val) : 'null'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography color="text.secondary">No preview data available.</Typography>
          )}
        </Box>
      </Paper>

      {/* Quality Issues Section */}
      <Box display="flex" gap={3} flexWrap="wrap">
        {/* Null Values */}
        <Paper sx={{ flex: 1, minWidth: 300 }}>
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              Null Values
            </Typography>
            {report.nulls && Object.keys(report.nulls).length > 0 ? (
              <List dense>
                {Object.entries(report.nulls).map(([col, count]) => (
                  <ListItem key={col}>
                    <ListItemText 
                      primary={col}
                      secondary={`${count} missing values`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="success.main">
                ✓ No null values found
              </Typography>
            )}
          </Box>
        </Paper>

        {/* Duplicate Rows */}
        <Paper sx={{ flex: 1, minWidth: 300 }}>
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              Duplicate Rows
            </Typography>
            <Typography variant="h4" color="primary">
              {report.duplicates}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              duplicate rows found
            </Typography>
          </Box>
        </Paper>

        {/* Suggested Data Type Fixes */}
        <Paper sx={{ flex: 1, minWidth: 300 }}>
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              Suggested Data Type Fixes
            </Typography>
            {report.suggested_dtypes && Object.keys(report.suggested_dtypes).length > 0 ? (
              <List dense>
                {Object.entries(report.suggested_dtypes).map(([col, dtype]) => (
                  <ListItem key={col}>
                    <ListItemText 
                      primary={col}
                      secondary={`→ ${dtype}`}
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="success.main">
                ✓ No suggestions needed
              </Typography>
            )}
          </Box>
        </Paper>
      </Box>

      {/* Statistical Summaries Section */}
      {report.statistical_summary && Object.keys(report.statistical_summary).length > 0 && (
        <Paper sx={{ mt: 4 }}>
          <Box p={3}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Analytics />
              Statistical Summaries (Numeric Columns)
            </Typography>
            
            {Object.keys(report.statistical_summary).map((metric) => (
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
                        {Object.entries(report.statistical_summary[metric]).map(([column, value]) => (
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
        </Paper>
      )}

      {/* Outliers Detected Section */}
      {report.outliers && Object.keys(report.outliers).length > 0 && (
        <Paper sx={{ mt: 4 }}>
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              Outliers Detected
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <b>Winsorizing:</b> Limits extreme values by capping them at the 5th and 95th percentiles.<br/>
              <b>IQR (Interquartile Range) Method:</b> Detects outliers as values outside 1.5×IQR below Q1 or above Q3.<br/>
              <b>Z-Score Method:</b> Identifies outliers as values with a Z-score above 3 or below -3.
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Column</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Winsorizing</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>IQR</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Z-Score</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(report.outliers).map(([col, out]) => (
                    <TableRow key={col}>
                      <TableCell>{col}</TableCell>
                      <TableCell align="right">{out.winsorizing?.count || 0}</TableCell>
                      <TableCell align="right">{out.iqr?.count || 0}</TableCell>
                      <TableCell align="right">{out.zscore?.count || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Paper>
      )}

      {/* Quality Metrics */}
      {report.quality_metrics && Object.keys(report.quality_metrics).length > 0 && (
        <Paper sx={{ mt: 4 }}>
          <Box p={3}>
            <Typography variant="h6" gutterBottom>
              Quality Metrics
            </Typography>
            <Box display="flex" gap={3} flexWrap="wrap">
              {Object.entries(report.quality_metrics)
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
          </Box>
        </Paper>
      )}
    </Box>
  );
}

export default ReportPage;
