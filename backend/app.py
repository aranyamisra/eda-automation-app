from flask import Flask, request, jsonify, session, send_from_directory
import pandas as pd
import os
import json
from datetime import timedelta
from flask_cors import CORS
import traceback
import numpy as np

app = Flask(__name__)
app.secret_key = 'your-secret-key'
app.permanent_session_lifetime = timedelta(minutes=10)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB limit
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}}, supports_credentials=True)

# Allowed file extensions
ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls', 'json'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/', methods=['GET'])
def home():
    return 'Backend is running! Use the frontend to upload files.'

@app.route('/upload', methods=['POST'])
def upload_file():
    try:
        # Check if file is present
        if 'dataset' not in request.files:
            return jsonify({'error': 'No file part'}), 400
        
        uploaded_file = request.files['dataset']
        
        # Check if file was selected
        if uploaded_file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Validate file type
        if not allowed_file(uploaded_file.filename):
            return jsonify({'error': 'File type not allowed. Please upload CSV, Excel, or JSON files only.'}), 400
        
        # Save file
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], uploaded_file.filename)
        uploaded_file.save(filepath)
        
        # Store file path in session
        session['dataset_path'] = filepath
        session['filename'] = uploaded_file.filename
        
        return jsonify({
            'message': 'File uploaded successfully', 
            'filename': uploaded_file.filename,
            'filepath': filepath
        }), 200
        
    except Exception as e:
        app.logger.error(f"Upload error: {str(e)}")
        return jsonify({'error': 'Upload failed. Please try again.'}), 500

@app.route('/cleaning', methods=['GET'])
def cleaning_page():
    try:
        # Get the latest file in the uploads directory
        upload_folder = app.config['UPLOAD_FOLDER']
        files = [os.path.join(upload_folder, f) for f in os.listdir(upload_folder) 
                if os.path.isfile(os.path.join(upload_folder, f))]
        
        if not files:
            return jsonify({'error': 'No files uploaded yet'}), 400
        
        filepath = max(files, key=os.path.getctime)
        filename = os.path.basename(filepath)
        
        # Load dataset based on file extension
        ext = filepath.split('.')[-1].lower()
        
        try:
            if ext == 'csv':
                df = pd.read_csv(filepath)
            elif ext in ['xls', 'xlsx']:
                df = pd.read_excel(filepath)
            elif ext == 'json':
                df = pd.read_json(filepath, orient='records')
            else:
                return jsonify({'error': 'Unsupported file format'}), 400
        except Exception as e:
            app.logger.error(traceback.format_exc())
            return jsonify({'error': f'Error loading dataset: {str(e)}'}), 500

        # Generate comprehensive data quality report
        report = data_quality_report(df, filename)
        return jsonify(report), 200
        
    except Exception as e:
        app.logger.error(traceback.format_exc())
        return jsonify({'error': f'Failed to generate report: {str(e)}'}), 500

@app.route('/clean-data', methods=['POST'])
def clean_data():
    try:
        # Get the latest file
        upload_folder = app.config['UPLOAD_FOLDER']
        files = [os.path.join(upload_folder, f) for f in os.listdir(upload_folder) 
                if os.path.isfile(os.path.join(upload_folder, f))]
        
        if not files:
            return jsonify({'error': 'No files uploaded yet'}), 400
        
        filepath = max(files, key=os.path.getctime)
        filename = os.path.basename(filepath)
        
        # Load dataset
        ext = filepath.split('.')[-1].lower()
        if ext == 'csv':
            df = pd.read_csv(filepath)
        elif ext in ['xls', 'xlsx']:
            df = pd.read_excel(filepath)
        elif ext == 'json':
            df = pd.read_json(filepath, orient='records')
        else:
            return jsonify({'error': 'Unsupported file format'}), 400

        # Get cleaning configuration
        config = request.json
        original_shape = df.shape

        # --- BEFORE REPORT ---
        before_report = data_quality_report(df, filename)
        before_dtypes = df.dtypes.apply(lambda x: x.name).to_dict()

        # Apply cleaning operations
        df_cleaned = apply_cleaning_operations(df.copy(), config)

        # Save cleaned dataset
        cleaned_filename = f"cleaned_{filename}"
        cleaned_filepath = os.path.join(upload_folder, cleaned_filename)
        
        if ext == 'csv':
            df_cleaned.to_csv(cleaned_filepath, index=False)
        elif ext in ['xls', 'xlsx']:
            df_cleaned.to_excel(cleaned_filepath, index=False)
        elif ext == 'json':
            df_cleaned.to_json(cleaned_filepath, orient='records')

        # --- AFTER REPORT ---
        after_report = data_quality_report(df_cleaned, cleaned_filename)
        after_dtypes = df_cleaned.dtypes.apply(lambda x: x.name).to_dict()

        # --- DATA TYPE CHANGES ---
        dtype_changes = {}
        for col in before_dtypes:
            if col in after_dtypes and before_dtypes[col] != after_dtypes[col]:
                dtype_changes[col] = {'before': before_dtypes[col], 'after': after_dtypes[col]}

        # --- WARNINGS/SUGGESTIONS ---
        warnings = []
        # Remaining nulls
        if after_report['nulls']:
            for col, count in after_report['nulls'].items():
                warnings.append(f"Column '{col}' still has {count} nulls after cleaning.")
        # Remaining type suggestions
        if after_report['suggested_dtypes']:
            for col, dtype in after_report['suggested_dtypes'].items():
                warnings.append(f"Column '{col}' could be converted to {dtype}.")
        # High null percentage
        if after_report['quality_metrics'].get('null_percentage', 0) > 5:
            warnings.append("Some columns still have more than 5% null values.")
        # High duplicate percentage
        if after_report['quality_metrics'].get('duplicate_percentage', 0) > 0:
            warnings.append("There are still duplicate rows present.")

        return jsonify({
            'message': 'Data cleaning applied successfully',
            'before': {
                'shape': before_report['dataset_info'],
                'nulls': before_report['nulls'],
                'duplicates': before_report['duplicates'],
                'dtypes': before_dtypes,
                'quality_metrics': before_report['quality_metrics'],
                'statistical_summary': before_report['statistical_summary'],
                'data_quality_score': before_report['data_quality_score']
            },
            'after': {
                'shape': after_report['dataset_info'],
                'nulls': after_report['nulls'],
                'duplicates': after_report['duplicates'],
                'dtypes': after_dtypes,
                'quality_metrics': after_report['quality_metrics'],
                'statistical_summary': after_report['statistical_summary'],
                'data_quality_score': after_report['data_quality_score'],
                'preview': after_report['preview']
            },
            'dtype_changes': dtype_changes,
            'warnings': warnings,
            'cleaned_filename': cleaned_filename
        }), 200
    
    except Exception as e:
        app.logger.error(traceback.format_exc())
        return jsonify({'error': f'Failed to apply data cleaning: {str(e)}'}), 500

def apply_cleaning_operations(df, config):
    """Apply data cleaning operations based on configuration"""
    
    # Handle duplicates
    if config.get('duplicates') == 'delete':
        df = df.drop_duplicates()
    
    # Handle null values
    nulls_config = config.get('nulls', {})
    for column, null_action in nulls_config.items():
        if column in df.columns:
            action = null_action.get('action')
            if action == 'delete_row':
                df = df.dropna(subset=[column])
            elif action == 'delete_column':
                df = df.drop(columns=[column])
            elif action == 'fill':
                fill_method = null_action.get('fillMethod', 'specific')
                fill_value = null_action.get('fillValue', '')
                if fill_method == 'specific':
                    df[column] = df[column].fillna(fill_value)
                elif fill_method == 'mean':
                    df[column] = df[column].fillna(df[column].mean())
                elif fill_method == 'median':
                    df[column] = df[column].fillna(df[column].median())
                elif fill_method == 'mode':
                    mode_val = df[column].mode()
                    df[column] = df[column].fillna(mode_val.iloc[0] if not mode_val.empty else fill_value)
                elif fill_method == 'forward':
                    df[column] = df[column].fillna(method='ffill')
                elif fill_method == 'backward':
                    df[column] = df[column].fillna(method='bfill')
    
    # Handle data type conversions
    data_types_config = config.get('dataTypes', {})
    for column, action in data_types_config.items():
        if column in df.columns and action == 'convert':
            suggested_type = get_suggested_dtype(df[column])
            if suggested_type:
                try:
                    if suggested_type == 'numeric':
                        df[column] = pd.to_numeric(df[column], errors='coerce')
                    elif suggested_type == 'datetime':
                        df[column] = pd.to_datetime(df[column], errors='coerce')
                except:
                    pass  # Keep original type if conversion fails
    
    return df

def get_suggested_dtype(series):
    """Get suggested data type for a column"""
    try:
        pd.to_numeric(series)
        if series.dtype not in ['float64', 'int64']:
            return 'numeric'
    except:
        try:
            pd.to_datetime(series)
            if series.dtype != 'datetime64[ns]':
                return 'datetime'
        except:
            return None
    return None

def data_quality_report(df, filename):
    """Generate a comprehensive data quality report"""
    report = {
        'filename': filename,
        'dataset_info': {},
        'preview': [],
        'quality_metrics': {},
        'nulls': {},
        'duplicates': 0,
        'suggested_dtypes': {},
        'statistical_summary': {},
        'data_quality_score': 0
    }

    try:
        # Basic dataset info
        report['dataset_info'] = {
            'rows': len(df),
            'columns': len(df.columns),
            'memory_usage': f"{df.memory_usage(deep=True).sum() / 1024 / 1024:.2f} MB"
        }

        # Preview data (first 5 rows) with NaN replaced by None
        preview_df = df.head().replace({np.nan: None})
        report['preview'] = preview_df.to_dict(orient="records")
        # Preview data (first 5 rows)
        preview_df = df.head().replace({np.nan: None})
        report['preview'] = preview_df.to_dict(orient="records")

        # Null values analysis
        nulls = df.isnull().sum()
        report['nulls'] = nulls[nulls > 0].to_dict()
        
        # Calculate null percentage
        total_cells = len(df) * len(df.columns)
        null_percentage = (df.isnull().sum().sum() / total_cells) * 100 if total_cells > 0 else 0

        # Duplicate analysis
        duplicate_count = int(df.duplicated().sum())
        report['duplicates'] = duplicate_count
        duplicate_percentage = (duplicate_count / len(df)) * 100 if len(df) > 0 else 0

        # Data type suggestions
        suggested_dtypes = {}
        for col in df.columns:
            suggested_type = get_suggested_dtype(df[col])
            if suggested_type:
                suggested_dtypes[col] = suggested_type
        report['suggested_dtypes'] = suggested_dtypes

        # Statistical summary for numeric columns
        numeric_cols = df.select_dtypes(include=['number']).columns
        if len(numeric_cols) > 0:
            numeric_df = df[numeric_cols]
            report['statistical_summary'] = {
                'mean': numeric_df.mean().to_dict(),
                'std': numeric_df.std().to_dict(),
                'min': numeric_df.min().to_dict(),
                'max': numeric_df.max().to_dict(),
                'median': numeric_df.median().to_dict()
            }

        # Quality metrics
        report['quality_metrics'] = {
            'null_percentage': round(null_percentage, 2),
            'duplicate_percentage': round(duplicate_percentage, 2),
            'completeness_score': round(100 - null_percentage, 2),
            'uniqueness_score': round(100 - duplicate_percentage, 2),
            'data_types_optimized': len(suggested_dtypes) == 0
        }

        # Overall data quality score (0-100)
        completeness_weight = 0.4
        uniqueness_weight = 0.3
        type_optimization_weight = 0.3
        
        quality_score = (
            (100 - null_percentage) * completeness_weight +
            (100 - duplicate_percentage) * uniqueness_weight +
            (100 if len(suggested_dtypes) == 0 else 70) * type_optimization_weight
        )
        
        report['data_quality_score'] = round(quality_score, 1)

    except Exception as e:
        app.logger.error(f"Error generating data quality report: {str(e)}")
        report['error'] = f"Error generating report: {str(e)}"

    return report

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'Backend is running',
        'upload_folder': app.config['UPLOAD_FOLDER'],
        'files_count': len(os.listdir(app.config['UPLOAD_FOLDER']))
    }), 200

@app.errorhandler(413)
def too_large(e):
    return jsonify({'error': 'File too large. Maximum size is 10MB.'}), 413

@app.errorhandler(500)
def internal_error(e):
    return jsonify({'error': 'Internal server error. Please try again.'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
