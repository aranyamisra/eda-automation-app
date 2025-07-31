# Deployment Guide for Render

## Backend Deployment (Flask API)

### Environment Variables:
- `PORT`: Port number (Render will set this automatically)
- `FLASK_DEBUG`: Set to 'false' for production
- `ALLOWED_ORIGINS`: Comma-separated list of allowed frontend URLs (e.g., "https://your-frontend-app.onrender.com")

### Build Command:
```bash
pip install -r requirements.txt
```

### Start Command:
```bash
gunicorn app:app
```

## Frontend Deployment (React)

### Environment Variables:
- `VITE_BACKEND_URL`: URL of your deployed backend API (e.g., "https://your-backend-app.onrender.com")

### Build Command:
```bash
npm install && npm run build
```

### Start Command:
```bash
npm run preview
```

## Deployment Steps:

1. **Deploy Backend First:**
   - Create a new Web Service on Render
   - Connect your Git repository
   - Set the root directory to `backend/`
   - Use the build and start commands above
   - Set environment variables

2. **Deploy Frontend:**
   - Create a new Static Site on Render
   - Connect your Git repository
   - Set the root directory to `frontend/`
   - Use the build command above
   - Set `VITE_BACKEND_URL` to your backend URL

3. **Update CORS:**
   - After deploying frontend, update `ALLOWED_ORIGINS` in backend environment variables to include your frontend URL

## File Structure:
```
├── backend/
│   ├── app.py              # Flask application
│   ├── requirements.txt    # Python dependencies
│   └── gunicorn.conf.py   # Gunicorn configuration
├── frontend/
│   ├── package.json        # Node.js dependencies
│   ├── vite.config.js      # Vite configuration
│   └── src/                # React source code
└── DEPLOYMENT.md          # This file
``` 