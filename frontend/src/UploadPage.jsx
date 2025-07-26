import { useState, useContext } from 'react';
import { Box, Button, Typography, Paper, InputLabel, Divider, Grid, Card, CardContent, useTheme, LinearProgress, Alert, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { 
  CloudUpload,
  InsertDriveFile,
  UploadFile,
  DatasetLinked,
  Refresh,
  CheckCircle,
  Warning
} from '@mui/icons-material';
import { CleaningSummaryContext } from './App';
import { useCallback } from 'react';
import { useChartsToReport } from './ChartsToReportContext';
import GoogleDrivePicker from './components/GoogleDrivePicker';

function UploadPage() {
  const theme = useTheme();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [googleDrivePickerOpen, setGoogleDrivePickerOpen] = useState(false);
  const [fileSource, setFileSource] = useState('local'); // 'local' or 'googledrive'
  const navigate = useNavigate();
  const { setCleaningSummary } = useContext(CleaningSummaryContext);
  const { setChartsToReport } = useChartsToReport();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setFileSource('local');
  };

  const handleGoogleDriveOpen = () => {
    setGoogleDrivePickerOpen(true);
  };

  const handleGoogleDriveClose = () => {
    setGoogleDrivePickerOpen(false);
  };

  const handleGoogleDriveFileSelect = (selectedFile) => {
    setFile(selectedFile);
    setFileSource('googledrive');
    setGoogleDrivePickerOpen(false);
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
    <Box sx={{ 
      minHeight: '100vh', 
      bgcolor: theme.palette.mode === 'dark' 
        ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
        : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', 
      color: theme.palette.text.primary, 
      p: { xs: 2, sm: 3, md: 5 },
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center'
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
          : '0 8px 25px rgba(102, 126, 234, 0.25)',
        maxWidth: 600,
        width: '100%'
      }}>
        <DatasetLinked sx={{ fontSize: 36, mb: 1, opacity: 0.9 }} />
        <Typography variant="h5" sx={{ 
          mb: 1, 
          fontWeight: 600,
          textShadow: '0 1px 3px rgba(0,0,0,0.3)'
        }}>
          Upload Your Dataset
        </Typography>
        <Typography variant="body1" sx={{ 
          mb: 0, 
          opacity: 0.85,
          maxWidth: 450,
          mx: 'auto',
          fontSize: '0.95rem'
        }}>
          Start your data analysis journey by uploading your dataset
        </Typography>
      </Box>

      <Card sx={{ 
        maxWidth: 600, 
        width: '100%', 
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
          {/* File Upload Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
              <UploadFile sx={{ mr: 1, color: 'primary.main' }} />
              Select Your File
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Supported formats: CSV, Excel (.xlsx, .xls), or JSON
            </Typography>
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
                startIcon={<UploadFile />}
                sx={{ 
                  mb: 2,
                  py: 2,
                  px: 4,
                  borderRadius: 2,
                  fontWeight: 600,
                  borderWidth: 2,
                  '&:hover': {
                    borderWidth: 2,
                    backgroundColor: theme.palette.mode === 'dark'
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(0,0,0,0.04)',
                  }
                }}
              >
                Browse Files
              </Button>
            </label>
            {file && (
              <Alert 
                severity="success" 
                sx={{ 
                  mt: 2, 
                  borderRadius: 2,
                  '& .MuiAlert-message': {
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%'
                  }
                }}
                icon={<CheckCircle />}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Selected: {file.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip 
                      label={`${(file.size / (1024 * 1024)).toFixed(2)} MB`} 
                      size="small" 
                      color="success" 
                      variant="outlined"
                    />
                    <Chip 
                      label={fileSource === 'googledrive' ? 'Google Drive' : 'Local File'} 
                      size="small" 
                      color={fileSource === 'googledrive' ? 'primary' : 'default'} 
                      variant="outlined"
                    />
                  </Box>
                </Box>
              </Alert>
            )}
          </Box>

          {/* Progress Bar */}
          {uploading && (
            <Box sx={{ mb: 3 }}>
              <LinearProgress sx={{ borderRadius: 1, height: 6 }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block', textAlign: 'center' }}>
                Uploading and processing your dataset...
              </Typography>
            </Box>
          )}

          {/* Upload Button */}
          <Button
            variant="contained"
            color="primary"
            onClick={handleUpload}
            disabled={!file || uploading}
            startIcon={<CloudUpload />}
            fullWidth
            sx={{ 
              py: 2,
              borderRadius: 3,
              fontWeight: 600,
              fontSize: '1.1rem',
              textTransform: 'none',
              background: theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, #0f4c3a 0%, #1a7a5e 100%)'
                : 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
              boxShadow: theme.palette.mode === 'dark'
                ? '0 8px 32px rgba(15, 76, 58, 0.4)'
                : '0 8px 32px rgba(17, 153, 142, 0.4)',
              '&:hover': {
                background: theme.palette.mode === 'dark'
                  ? 'linear-gradient(135deg, #1f5c4a 0%, #2a8a6e 100%)'
                  : 'linear-gradient(135deg, #0f7b70 0%, #2dd4bf 100%)',
                transform: 'translateY(-2px)',
                boxShadow: theme.palette.mode === 'dark'
                  ? '0 12px 40px rgba(15, 76, 58, 0.6)'
                  : '0 12px 40px rgba(17, 153, 142, 0.6)',
              },
              '&:disabled': {
                background: theme.palette.mode === 'dark'
                  ? 'rgba(255,255,255,0.12)'
                  : 'rgba(0,0,0,0.12)',
              }
            }}
          >
            {uploading ? 'Uploading...' : 'Upload Dataset'}
          </Button>

          {/* Reset Button */}
          <Button
            variant="outlined"
            color="error"
            onClick={handleReset}
            fullWidth
            startIcon={<Refresh />}
            sx={{ 
              mt: 3, 
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
            Reset Dataset
          </Button>

          {/* Divider */}
          <Divider sx={{ my: 4 }}>OR</Divider>

          {/* Google Drive Upload Section */}
          <Grid container spacing={2} justifyContent="center">
            <Grid item>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<InsertDriveFile />}
                sx={{ 
                  px: 4, 
                  py: 2,
                  borderRadius: 2,
                  fontWeight: 600,
                  textTransform: 'none',
                  borderWidth: 2,
                  '&:hover': {
                    borderWidth: 2,
                    backgroundColor: theme.palette.mode === 'dark'
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(0,0,0,0.04)',
                  }
                }}
                onClick={handleGoogleDriveOpen}
              >
                Upload from Google Drive
              </Button>
            </Grid>
        </Grid>
        </CardContent>
      </Card>

      {/* Google Drive Picker Dialog */}
      <GoogleDrivePicker
        open={googleDrivePickerOpen}
        onClose={handleGoogleDriveClose}
        onFileSelect={handleGoogleDriveFileSelect}
      />
    </Box>
  );
}

export default UploadPage;