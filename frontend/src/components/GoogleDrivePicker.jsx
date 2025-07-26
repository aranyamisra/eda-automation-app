import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Chip,
  TextField,
  InputAdornment,
  Divider
} from '@mui/material';
import {
  InsertDriveFile,
  Search,
  Refresh,
  Download,
  Close,
  Google,
  TableChart,
  Description,
  DataObject
} from '@mui/icons-material';
import googleDriveService from '../services/googleDriveService';

const GoogleDrivePicker = ({ open, onClose, onFileSelect }) => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);

  // Initialize Google Drive service when dialog opens
  useEffect(() => {
    if (open && !googleDriveService.isInitialized) {
      initializeGoogleDrive();
    } else if (open && googleDriveService.isInitialized) {
      checkSignInStatus();
    }
  }, [open]);

  const initializeGoogleDrive = async () => {
    setIsInitializing(true);
    setError('');
    
    try {
      await googleDriveService.init();
      checkSignInStatus();
    } catch (err) {
      if (err.message.includes('credentials not configured') || err.message.includes('demo_api_key')) {
        setError('Google Drive API credentials not configured. Please set up your API keys in the .env file. See GOOGLE_DRIVE_SETUP.md for instructions.');
      } else {
        setError(`Failed to initialize Google Drive: ${err.message}`);
      }
      console.error('Google Drive initialization error:', err);
    } finally {
      setIsInitializing(false);
    }
  };

  const checkSignInStatus = () => {
    const signedIn = googleDriveService.isUserSignedIn();
    setIsSignedIn(signedIn);
    if (signedIn) {
      loadFiles();
    }
  };

  const handleSignIn = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      await googleDriveService.signIn();
      setIsSignedIn(true);
      await loadFiles();
    } catch (err) {
      setError('Failed to sign in to Google Drive. Please try again.');
      console.error('Sign in error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await googleDriveService.signOut();
      setIsSignedIn(false);
      setFiles([]);
      setSelectedFile(null);
    } catch (err) {
      setError('Failed to sign out from Google Drive.');
      console.error('Sign out error:', err);
    }
  };

  const loadFiles = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const driveFiles = await googleDriveService.listFiles(searchQuery);
      setFiles(driveFiles);
    } catch (err) {
      setError('Failed to load files from Google Drive.');
      console.error('Load files error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (isSignedIn) {
      await loadFiles();
    }
  };

  const handleFileSelect = (file) => {
    setSelectedFile(file);
  };

  const handleDownload = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setError('');

    try {
      const fileData = await googleDriveService.downloadFile(selectedFile.id);
      
      // Create a File object from the downloaded content
      const blob = new Blob([fileData.content], { type: selectedFile.mimeType });
      const file = new File([blob], selectedFile.name, { type: selectedFile.mimeType });
      
      // Call the parent's file select handler
      onFileSelect(file);
      onClose();
    } catch (err) {
      setError('Failed to download file from Google Drive.');
      console.error('Download error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getFileIcon = (mimeType) => {
    switch (mimeType) {
      case 'text/csv':
        return <TableChart color="success" />;
      case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      case 'application/vnd.ms-excel':
        return <TableChart color="primary" />;
      case 'application/json':
        return <DataObject color="secondary" />;
      default:
        return <Description />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          minHeight: '70vh'
        }
      }}
    >
      <DialogTitle sx={{ pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Google sx={{ mr: 2, color: '#4285f4' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Google Drive File Picker
            </Typography>
          </Box>
          <Button 
            onClick={onClose} 
            size="small" 
            sx={{ minWidth: 'auto', p: 1 }}
          >
            <Close />
          </Button>
        </Box>
        
        {isSignedIn && (
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search for CSV, Excel, or JSON files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Button 
                      size="small" 
                      onClick={handleSearch}
                      disabled={isLoading}
                    >
                      <Search />
                    </Button>
                  </InputAdornment>
                )
              }}
            />
          </Box>
        )}
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        {isInitializing && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Initializing Google Drive...
            </Typography>
          </Box>
        )}

        {!isInitializing && !isSignedIn && !error && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
            <Google sx={{ fontSize: 64, color: '#4285f4', mb: 3 }} />
            <Typography variant="h6" sx={{ mb: 2, textAlign: 'center' }}>
              Sign in to Google Drive
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center', maxWidth: 400 }}>
              Access your CSV, Excel, and JSON files stored in Google Drive
            </Typography>
            <Button
              variant="contained"
              startIcon={<Google />}
              onClick={handleSignIn}
              disabled={isLoading}
              sx={{
                backgroundColor: '#4285f4',
                '&:hover': { backgroundColor: '#3367d6' },
                borderRadius: 2,
                px: 4,
                py: 1.5
              }}
            >
              {isLoading ? 'Signing in...' : 'Sign in with Google'}
            </Button>
          </Box>
        )}

        {!isInitializing && !isSignedIn && error && error.includes('not configured') && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
            <Google sx={{ fontSize: 64, color: 'text.disabled', mb: 3 }} />
            <Typography variant="h6" sx={{ mb: 2, textAlign: 'center' }}>
              Google Drive Setup Required
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center', maxWidth: 500 }}>
              To use Google Drive integration, you need to configure your API credentials.
            </Typography>
            <Box sx={{ 
              p: 3, 
              borderRadius: 2, 
              backgroundColor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              maxWidth: 500,
              mb: 3
            }}>
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                Quick Setup Steps:
              </Typography>
              <Typography variant="body2" component="div" sx={{ mb: 1 }}>
                1. Get API credentials from <strong>Google Cloud Console</strong>
              </Typography>
              <Typography variant="body2" component="div" sx={{ mb: 1 }}>
                2. Set <code>VITE_GOOGLE_API_KEY</code> in your .env file
              </Typography>
              <Typography variant="body2" component="div" sx={{ mb: 1 }}>
                3. Set <code>VITE_GOOGLE_CLIENT_ID</code> in your .env file
              </Typography>
              <Typography variant="body2" component="div">
                4. Restart the development server
              </Typography>
            </Box>
            <Typography variant="caption" color="text.disabled" sx={{ textAlign: 'center' }}>
              See GOOGLE_DRIVE_SETUP.md for detailed instructions
            </Typography>
          </Box>
        )}

        {isSignedIn && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Select a file from your Google Drive
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  startIcon={<Refresh />}
                  onClick={loadFiles}
                  disabled={isLoading}
                >
                  Refresh
                </Button>
                <Button
                  size="small"
                  color="error"
                  onClick={handleSignOut}
                >
                  Sign Out
                </Button>
              </Box>
            </Box>

            {isLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            )}

            {!isLoading && files.length === 0 && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <InsertDriveFile sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                <Typography variant="body1" color="text.secondary">
                  No supported files found in your Google Drive
                </Typography>
                <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
                  Supported formats: CSV, Excel (.xlsx, .xls), JSON
                </Typography>
              </Box>
            )}

            {!isLoading && files.length > 0 && (
              <List sx={{ maxHeight: 400, overflow: 'auto' }}>
                {files.map((file) => (
                  <React.Fragment key={file.id}>
                    <ListItemButton
                      onClick={() => handleFileSelect(file)}
                      selected={selectedFile?.id === file.id}
                      sx={{
                        borderRadius: 2,
                        mb: 1,
                        '&.Mui-selected': {
                          backgroundColor: 'primary.light',
                          '&:hover': {
                            backgroundColor: 'primary.light',
                          }
                        }
                      }}
                    >
                      <ListItemIcon>
                        {getFileIcon(file.mimeType)}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>
                            {file.name}
                          </Typography>
                        }
                        secondary={
                          <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                            <Chip 
                              label={googleDriveService.formatFileSize(file.size)} 
                              size="small" 
                              variant="outlined" 
                            />
                            <Chip 
                              label={formatDate(file.modifiedTime)} 
                              size="small" 
                              variant="outlined" 
                            />
                            <Chip 
                              label={file.mimeType.split('/')[1]?.toUpperCase() || 'File'} 
                              size="small" 
                              variant="outlined" 
                              color="primary"
                            />
                          </Box>
                        }
                      />
                    </ListItemButton>
                    <Divider sx={{ my: 1 }} />
                  </React.Fragment>
                ))}
              </List>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 2 }}>
        <Button onClick={onClose} sx={{ borderRadius: 2 }}>
          Cancel
        </Button>
        {isSignedIn && selectedFile && (
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={handleDownload}
            disabled={isLoading}
            sx={{ borderRadius: 2, px: 3 }}
          >
            {isLoading ? 'Downloading...' : 'Use Selected File'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default GoogleDrivePicker;