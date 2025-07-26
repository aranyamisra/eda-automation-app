# Google Drive Integration Setup

This guide will help you set up Google Drive integration for the EDA Automation App.

## Prerequisites

1. Google Cloud Console account
2. Access to Google Drive with files you want to analyze

## Setup Steps

### 1. Create Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note your project ID

### 2. Enable Google Drive API

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google Drive API"
3. Click on it and press "Enable"

### 3. Create Credentials

#### API Key (for file access)
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the generated API key
4. (Optional but recommended) Restrict the API key to Google Drive API only

#### OAuth 2.0 Client ID (for authentication)
1. In "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Web application"
4. Add your domain to "Authorized JavaScript origins":
   - For development: `http://localhost:5173`
   - For production: your actual domain
5. Copy the generated Client ID

### 4. Configure Environment Variables

1. Copy the `.env.example` file to `.env` in the `frontend` directory:
   ```bash
   cp frontend/.env.example frontend/.env
   ```

2. Edit the `.env` file and replace the placeholder values:
   ```env
   VITE_GOOGLE_API_KEY=your_actual_api_key_here
   VITE_GOOGLE_CLIENT_ID=your_actual_client_id_here
   ```

### 5. Test the Integration

1. Start the application:
   ```bash
   # In frontend directory
   npm run dev
   ```

2. Go to the upload page
3. Click "Upload from Google Drive"
4. Sign in with your Google account
5. Browse and select a CSV, Excel, or JSON file from your Google Drive

## Supported File Types

- CSV files (`.csv`)
- Excel files (`.xlsx`, `.xls`)
- JSON files (`.json`)

## Security Notes

- API keys and Client IDs should be kept secure
- In production, consider implementing additional security measures
- The app only requests read-only access to your Google Drive files
- Files are processed locally and not stored on any external servers

## Troubleshooting

### "Failed to initialize Google Drive"
- Check that your API key is correct
- Ensure Google Drive API is enabled in your project
- Verify your domain is added to authorized origins

### "Failed to sign in to Google Drive"
- Check that your OAuth Client ID is correct
- Ensure your domain is in the authorized JavaScript origins
- Clear browser cache and try again

### "No supported files found"
- The app only shows CSV, Excel, and JSON files
- Make sure you have these file types in your Google Drive
- Try using the search feature to find specific files

## Development Notes

The Google Drive integration consists of:

1. `googleDriveService.js` - Service for Google Drive API interactions
2. `GoogleDrivePicker.jsx` - UI component for file selection
3. Integration in `UploadPage.jsx` - Main upload interface

The integration downloads files directly in the browser and processes them the same way as local file uploads.