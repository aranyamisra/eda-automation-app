import { useState } from 'react';
import { Box, Button, Typography, Paper, InputLabel, Divider } from '@mui/material';
// import GoogleDriveUploader from './GoogleDriveUploader';
import { useNavigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#009688' },    // teal
    secondary: { main: '#e91e63' },  // pink
    background: {
      default: '#121212',            // dark background
      paper: '#1e1e1e',              // dark card/paper
    },
  },
});

function UploadPage({ onUpload }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('dataset', file);

    try {
      const res = await fetch('http://localhost:5001/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (res.ok) {
        // Redirect to report page after successful upload
        navigate('/report');
      } else {
        // handle error
        alert('Upload failed');
      }
    } catch (err) {
      alert('Upload error');
    } finally {
      setUploading(false);
    }
  };

  // ✅ Called after Google Drive file is fetched
  // const handleDriveFile = async (driveFile) => {
  //   setUploading(true);
  //   const formData = new FormData();
  //   formData.append('dataset', driveFile);

  //   const response = await fetch('http://127.0.0.1:5001/upload', {
  //     method: 'POST',
  //     body: formData,
  //     credentials: 'include',
  //   });

  //   setUploading(false);
  //   if (response.ok) {
  //     onUpload();
  //   } else {
  //     alert('Drive upload failed');
  //   }
  // };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="70vh"
      >
        <Paper elevation={3} sx={{ p: 4, maxWidth: 450, width: '100%' }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Upload a Dataset
          </Typography>

          {/* Local File Upload */}
          <InputLabel htmlFor="upload-file" sx={{ mb: 1 }}>
            Choose a file (CSV, Excel, or JSON)
          </InputLabel>
          <input
            id="upload-file"
            type="file"
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, .json"
            onChange={handleFileChange}
            style={{ marginBottom: 16 }}
          />
          {file && (
            <Typography variant="body2" sx={{ mb: 2 }}>
              Selected file: <b>{file.name}</b>
            </Typography>
          )}
          <Button
            variant="contained"
            color="primary"
            onClick={handleUpload}
            disabled={!file || uploading}
            fullWidth
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>

          {/* Divider */}
          {/* <Divider sx={{ my: 3 }}>OR</Divider> */}

          {/* Google Drive Upload */}
          {/* <GoogleDriveUploader onFileSelected={handleDriveFile} /> */}
        </Paper>
      </Box>
    </ThemeProvider>
  );
}

export default UploadPage;