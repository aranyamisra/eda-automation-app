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
  Button
} from '@mui/material';
import { 
  ExpandMore,
  Delete,
  ContentCopy,
  Warning,
  CheckCircle,
  Error,
  TrendingUp,
  Storage,
  Assessment,
  CleaningServices
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
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Data Quality Report
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
    </Box>
  );
}

export default ReportPage;
