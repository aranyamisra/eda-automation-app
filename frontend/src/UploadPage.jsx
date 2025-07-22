import { useState, useContext } from 'react';
import { Box, Button, Typography, Paper, InputLabel, Divider, Grid } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { CleaningSummaryContext } from './App';
import { useCallback } from 'react';
import { useChartsToReport } from './ChartsToReportContext';

function UploadPage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  const { setCleaningSummary } = useContext(CleaningSummaryContext);
  const { setChartsToReport } = useChartsToReport();

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    // Clear cleaning state when a new file is uploaded
    localStorage.removeItem('cleaningSession');
    // (Do NOT clear cleaningSummary here)

    const formData = new FormData();
    formData.append('dataset', file);

    try {
      const res = await fetch('http://localhost:5001/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (res.ok) {
        localStorage.removeItem('cleaningSession'); // Reset localStorage
        localStorage.removeItem('chartsToReport'); // Clear charts added to report
        setChartsToReport({}); // Reset chartsToReport context state
        navigate('/report'); // Redirect to the report page after successful upload
      } else {
        alert('Upload failed');
      }
    } catch (err) {
      alert('Upload error');
    } finally {
      setUploading(false);
    }
  };

  // Reset handler
  const handleReset = useCallback(async () => {
    if (!window.confirm('Are you sure you want to reset? This will remove the current dataset and all progress.')) return;
    try {
      const res = await fetch('http://localhost:5001/reset', {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        setFile(null);
        localStorage.removeItem('cleaningSession');
        // Optionally clear other local state if needed
        alert('Dataset and session have been reset.');
      } else {
        alert('Reset failed.');
      }
    } catch (err) {
      alert('Reset error.');
    }
  }, []);

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="80vh"
      sx={{ py: 4 }}
    >
      <Paper elevation={3} sx={{ p: 4, maxWidth: 500, width: '100%', textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Upload Your Dataset
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Choose a file to upload and start analyzing your data.
        </Typography>

        {/* File Upload Section */}
        <Box sx={{ mb: 3 }}>
          <InputLabel htmlFor="upload-file" sx={{ mb: 1, fontWeight: 'bold' }}>
            Select a File (CSV, Excel, or JSON)
          </InputLabel>
          <input
            id="upload-file"
            type="file"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, .json"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <label htmlFor="upload-file">
            <Button
              variant="outlined"
              component="span"
              startIcon={<UploadFileIcon />}
              sx={{ mb: 2 }}
            >
              Browse Files
            </Button>
          </label>
          {file && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Selected file: <b>{file.name}</b>
            </Typography>
          )}
        </Box>

        {/* Upload Button */}
        <Button
          variant="contained"
          color="primary"
          onClick={handleUpload}
          disabled={!file || uploading}
          startIcon={<CloudUploadIcon />}
          fullWidth
          sx={{ py: 1.5, fontSize: '1rem' }}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>

        {/* Reset Button */}
        <Button
          variant="outlined"
          color="error"
          onClick={handleReset}
          fullWidth
          sx={{ mt: 2, py: 1.5, fontSize: '1rem' }}
        >
          Reset Dataset
        </Button>

        {/* Divider */}
        <Divider sx={{ my: 3 }}>OR</Divider>

        {/* Google Drive Upload Section */}
        <Grid container spacing={2} justifyContent="center">
          <Grid item>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<InsertDriveFileIcon />}
              sx={{ px: 3, py: 1 }}
              onClick={() => alert('Google Drive upload coming soon!')}
            >
              Upload from Google Drive
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}

export default UploadPage;