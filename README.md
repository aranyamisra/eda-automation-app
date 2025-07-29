# EDA Automation App

A comprehensive web application for automated Exploratory Data Analysis (EDA) with data cleaning, visualization, and report generation capabilities.

## 🚀 Features

### 📊 Data Analysis & Visualization
- **Multiple Chart Types**: Bar charts, pie charts, line charts, scatter plots, correlation matrices, and more
- **Interactive Visualizations**: Built with Chart.js and Plotly.js for rich, interactive charts
- **Smart Chart Recommendations**: Automatically suggests the best chart types based on your data
- **Customizable Charts**: Color schemes, labels, and styling options
- **KPI Calculations**: Built-in metrics for numerical columns (mean, median, std, etc.)

### 🧹 Data Cleaning & Processing
- **Automated Data Quality Report**: Comprehensive analysis of data issues
- **Smart Data Type Detection**: Automatic detection and conversion of data types
- **Missing Value Handling**: Multiple strategies for handling missing data
- **Outlier Detection**: Statistical methods to identify and handle outliers
- **Data Validation**: Checks for data consistency and quality issues

### 📁 File Management
- **Multiple Format Support**: CSV, Excel (.xlsx, .xls), and JSON files
- **Google Drive Integration**: Direct upload from Google Drive
- **Local File Upload**: Traditional file upload interface
- **Sample Datasets**: Pre-loaded datasets for testing and demonstration

### 📋 Report Generation
- **Professional Reports**: Generate comprehensive PDF reports
- **Customizable Content**: Select which charts and KPIs to include
- **Export Options**: Multiple export formats and styling options
- **Chart Selection**: Choose specific visualizations for your report

### 🎨 User Experience
- **Modern UI**: Material-UI based interface with dark/light theme support
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Progress Tracking**: Visual progress indicator through the analysis workflow
- **Keyboard Shortcuts**: Power user features for efficient navigation
- **Real-time Feedback**: Instant updates and notifications

## 🛠️ Technology Stack

### Frontend
- **React 19** - Modern React with hooks and functional components
- **Vite** - Fast build tool and development server
- **Material-UI (MUI)** - Component library for consistent design
- **Chart.js & Plotly.js** - Interactive charting libraries
- **React Router** - Client-side routing
- **Axios** - HTTP client for API communication

### Backend
- **Flask** - Python web framework
- **Pandas** - Data manipulation and analysis
- **NumPy** - Numerical computing
- **Playwright** - PDF generation and report creation
- **Jinja2** - Template engine for reports

### Data Processing
- **Pandas** - Data cleaning and transformation
- **NumPy** - Statistical calculations
- **OpenPyXL** - Excel file handling

## 📦 Installation

### Prerequisites
- Node.js (v18 or higher)
- Python (v3.8 or higher)
- pip (Python package manager)

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv venv
   ```

3. **Activate virtual environment**:
   ```bash
   # On macOS/Linux
   source venv/bin/activate
   
   # On Windows
   venv\Scripts\activate
   ```

4. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

5. **Install Playwright browsers** (required for PDF generation):
   ```bash
   playwright install
   ```

6. **Start the backend server**:
   ```bash
   python app.py
   ```

The backend will run on `http://localhost:5001`

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

The frontend will run on `http://localhost:5173`

### Google Drive Integration (Optional)

For Google Drive integration, follow the detailed setup guide in [GOOGLE_DRIVE_SETUP.md](GOOGLE_DRIVE_SETUP.md).

## 🎯 Usage Guide

### 1. Upload Data
- **Local Upload**: Drag and drop or click to upload CSV, Excel, or JSON files
- **Google Drive**: Connect your Google Drive account to access files directly
- **Sample Data**: Use pre-loaded datasets for testing

### 2. Data Quality Report
- Review automated data quality analysis
- Identify missing values, data types, and potential issues
- Understand your dataset structure

### 3. Data Cleaning
- Apply automated cleaning operations
- Handle missing values with multiple strategies
- Convert data types automatically
- Remove duplicates and outliers

### 4. Analysis & Visualization
- Explore your data with interactive charts
- Use smart chart recommendations
- Customize visualizations with colors and styling
- Calculate KPIs for numerical columns

### 5. Export Results
- Generate comprehensive PDF reports
- Select specific charts and KPIs to include
- Customize report styling and layout
- Download cleaned datasets

## 📁 Project Structure

```
eda-automation-app/
├── backend/                 # Flask backend
│   ├── app.py              # Main Flask application
│   ├── requirements.txt    # Python dependencies
│   ├── templates/          # HTML templates for reports
│   └── uploads/            # Temporary file storage
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── services/       # API and external services
│   │   ├── AnalysisPage.jsx    # Data analysis interface
│   │   ├── CleaningPage.jsx    # Data cleaning interface
│   │   ├── UploadPage.jsx      # File upload interface
│   │   └── ReportPage.jsx      # Report generation interface
│   ├── package.json        # Node.js dependencies
│   └── vite.config.js      # Vite configuration
├── datasets/               # Sample datasets
├── GOOGLE_DRIVE_SETUP.md   # Google Drive integration guide
└── README.md              # This file
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the frontend directory for Google Drive integration:

```env
VITE_GOOGLE_API_KEY=your_google_api_key
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

### Backend Configuration

The backend can be configured by modifying `app.py`:

- **Upload folder**: `app.config['UPLOAD_FOLDER']`
- **File size limit**: `app.config['MAX_CONTENT_LENGTH']`
- **Session lifetime**: `app.permanent_session_lifetime`

## 🚀 Deployment

### Frontend Deployment

1. **Build for production**:
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy the `dist` folder** to your web server or hosting service

### Backend Deployment

1. **Install production dependencies**:
   ```bash
   pip install gunicorn
   ```

2. **Run with Gunicorn**:
   ```bash
   gunicorn -w 4 -b 0.0.0.0:5000 app:app
   ```

3. **Set up reverse proxy** (nginx recommended) to serve the frontend and proxy API calls to the backend

## 🧪 Testing

### Frontend Testing
```bash
cd frontend
npm run lint
```

### Backend Testing
```bash
cd backend
python -m pytest  # If pytest is installed
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Common Issues

1. **Port conflicts**: Ensure ports 5000 (backend) and 5173 (frontend) are available
2. **File upload errors**: Check file size limits and supported formats
3. **Google Drive issues**: Follow the setup guide in `GOOGLE_DRIVE_SETUP.md`

### Getting Help

- Check the [QUICK_FIX_GUIDE.md](QUICK_FIX_GUIDE.md) for common solutions
- Review the Google Drive setup guide for integration issues
- Open an issue on GitHub for bugs or feature requests

## 🎉 Acknowledgments

- **Chart.js** for excellent charting capabilities
- **Material-UI** for the beautiful component library
- **Pandas** for powerful data manipulation tools
- **Flask** for the lightweight web framework

---

**Happy Data Analysis! 📊✨** 