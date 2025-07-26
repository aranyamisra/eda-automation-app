// Google Drive API Service using Google Identity Services (GIS)
class GoogleDriveService {
  constructor() {
    this.gapi = null;
    this.tokenClient = null;
    this.accessToken = null;
    this.isInitialized = false;
    this.isSignedIn = false;
    
    // Configuration - These should be environment variables in production
    this.config = {
      apiKey: import.meta.env.VITE_GOOGLE_API_KEY || 'your_api_key_here',
      clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your_client_id_here',
      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
      scope: 'https://www.googleapis.com/auth/drive.readonly'
    };
  }

  // Initialize Google API with new Google Identity Services
  async init() {
    return new Promise((resolve, reject) => {
      if (this.isInitialized) {
        resolve();
        return;
      }

      this.loadScripts().then(() => {
        this.initializeServices().then(resolve).catch(reject);
      }).catch(reject);
    });
  }

  // Load both GAPI and GIS scripts
  async loadScripts() {
    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
      });
    };

    // Load GAPI script
    if (!window.gapi) {
      await loadScript('https://apis.google.com/js/api.js');
    }

    // Load Google Identity Services script
    if (!window.google?.accounts) {
      await loadScript('https://accounts.google.com/gsi/client');
    }
  }

  async initializeServices() {
    return new Promise((resolve, reject) => {
      // Check if API credentials are configured
      if (this.config.apiKey === 'demo_api_key' || this.config.clientId === 'demo_client_id') {
        reject(new Error('Google Drive API credentials not configured. Please set VITE_GOOGLE_API_KEY and VITE_GOOGLE_CLIENT_ID in your .env file. See GOOGLE_DRIVE_SETUP.md for instructions.'));
        return;
      }

      if (!this.config.apiKey || !this.config.clientId) {
        reject(new Error('Google Drive API credentials missing. Please configure VITE_GOOGLE_API_KEY and VITE_GOOGLE_CLIENT_ID environment variables.'));
        return;
      }

      // Initialize GAPI client
      window.gapi.load('client', async () => {
        try {
          console.log('Initializing GAPI client with config:', {
            apiKey: this.config.apiKey ? `${this.config.apiKey.substring(0, 10)}...` : 'MISSING',
            discoveryDocs: this.config.discoveryDocs
          });

          await window.gapi.client.init({
            apiKey: this.config.apiKey,
            discoveryDocs: this.config.discoveryDocs
          });

          // Initialize Google Identity Services token client
          this.tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: this.config.clientId,
            scope: this.config.scope,
            callback: (response) => {
              if (response.error) {
                console.error('OAuth error:', response.error);
                return;
              }
              this.accessToken = response.access_token;
              this.isSignedIn = true;
              console.log('OAuth token received successfully');
            },
          });

          this.gapi = window.gapi;
          this.isInitialized = true;
          console.log('Google services initialized successfully');
          resolve();
        } catch (error) {
          console.error('Failed to initialize Google services:', error);
          reject(new Error(`Failed to initialize Google API: ${error.message || 'Unknown error'}. Please check your API credentials and ensure the Google Drive API is enabled.`));
        }
      });
    });
  }

  // Sign in to Google Drive using new GIS
  async signIn() {
    if (!this.isInitialized) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.tokenClient) {
        reject(new Error('Token client not initialized'));
        return;
      }

      // Update callback to handle Promise resolution
      const originalCallback = this.tokenClient.callback;
      this.tokenClient.callback = (response) => {
        if (response.error) {
          console.error('OAuth error:', response.error);
          reject(new Error(`Failed to sign in: ${response.error}`));
          return;
        }
        this.accessToken = response.access_token;
        this.isSignedIn = true;
        
        // Set the access token for GAPI client
        this.gapi.client.setToken({ access_token: this.accessToken });
        
        console.log('OAuth token received successfully');
        resolve(true);
        
        // Restore original callback
        this.tokenClient.callback = originalCallback;
      };

      // Request access token
      this.tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  }

  // Sign out from Google Drive
  async signOut() {
    if (!this.isInitialized || !this.isSignedIn) return true;

    try {
      // Revoke the access token
      if (this.accessToken) {
        window.google.accounts.oauth2.revoke(this.accessToken);
      }
      
      // Clear the access token from GAPI client
      this.gapi.client.setToken(null);
      
      this.accessToken = null;
      this.isSignedIn = false;
      return true;
    } catch (error) {
      throw new Error(`Failed to sign out: ${error.message}`);
    }
  }

  // Check if user is signed in
  isUserSignedIn() {
    return this.isSignedIn && !!this.accessToken;
  }

  // List files from Google Drive
  async listFiles(query = '', maxResults = 50) {
    if (!this.isSignedIn) {
      throw new Error('User not signed in');
    }

    try {
      const response = await this.gapi.client.drive.files.list({
        q: query || "mimeType='text/csv' or mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or mimeType='application/vnd.ms-excel' or mimeType='application/json'",
        pageSize: maxResults,
        fields: 'files(id,name,size,mimeType,modifiedTime,webViewLink)'
      });

      return response.result.files || [];
    } catch (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  // Download file content from Google Drive
  async downloadFile(fileId) {
    if (!this.isSignedIn) {
      throw new Error('User not signed in');
    }

    try {
      const response = await this.gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media'
      });

      return {
        content: response.body,
        headers: response.headers
      };
    } catch (error) {
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  // Get file metadata
  async getFileMetadata(fileId) {
    if (!this.isSignedIn) {
      throw new Error('User not signed in');
    }

    try {
      const response = await this.gapi.client.drive.files.get({
        fileId: fileId,
        fields: 'id,name,size,mimeType,modifiedTime,webViewLink'
      });

      return response.result;
    } catch (error) {
      throw new Error(`Failed to get file metadata: ${error.message}`);
    }
  }

  // Format file size for display
  formatFileSize(bytes) {
    if (!bytes) return 'Unknown size';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Check if file type is supported
  isSupportedFileType(mimeType) {
    const supportedTypes = [
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/json'
    ];
    return supportedTypes.includes(mimeType);
  }
}

// Export singleton instance
export const googleDriveService = new GoogleDriveService();
export default googleDriveService;