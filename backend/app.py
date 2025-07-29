from flask import Flask, request, jsonify, session, send_from_directory, send_file
import pandas as pd
import os
import json
from datetime import timedelta
from flask_cors import CORS
import traceback
import numpy as np
import warnings
import io
from jinja2 import Template
from playwright.sync_api import sync_playwright
import zipfile

# Global variable to store cleaned dataframe in memory
cleaned_dataframe = None

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
    global cleaned_dataframe
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
        session.pop('cleaned_filename', None)  # Invalidate previous cleaned file
        
        # Clear the stored cleaned dataframe when a new file is uploaded
        cleaned_dataframe = None
        
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
                try:
                    df = pd.read_csv(filepath, encoding='utf-8-sig')
                except UnicodeDecodeError:
                    df = pd.read_csv(filepath, encoding='latin1')
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
    global cleaned_dataframe
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
            try:
                df = pd.read_csv(filepath, encoding='utf-8-sig')
            except UnicodeDecodeError:
                df = pd.read_csv(filepath, encoding='latin1')
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
        
        session['cleaned_filename'] = cleaned_filename  # Track cleaned file for current session
        cleaned_dataframe = df_cleaned # Store the cleaned dataframe in memory

        # --- AFTER REPORT ---
        after_report = data_quality_report(df_cleaned, cleaned_filename)
        after_dtypes = df_cleaned.dtypes.apply(lambda x: x.name).to_dict()
        print('DEBUG: df_cleaned.dtypes after cleaning:', df_cleaned.dtypes)
        print('DEBUG: after_report["suggested_dtypes"]:', after_report.get('suggested_dtypes'))

        # --- DATA TYPE CHANGES ---
        dtype_changes = {}
        data_types_config = config.get('dataTypes', {})
        for col in before_dtypes:
            # Only log if user requested conversion and dtype actually changed
            if col in after_dtypes and before_dtypes[col] != after_dtypes[col] and data_types_config.get(col) == 'convert':
                dtype_changes[col] = {'before': before_dtypes[col], 'after': after_dtypes[col]}

        # --- WARNINGS/SUGGESTIONS ---
        warnings = []
        # Remaining nulls
        if after_report and after_report.get('nulls'):
            for col, count in after_report['nulls'].items():
                warnings.append(f"Column '{col}' still has {count} nulls after cleaning.")
        # Remaining type suggestions
        if after_report and after_report.get('suggested_dtypes'):
            for col, dtype in after_report['suggested_dtypes'].items():
                warnings.append(f"Column '{col}' could be converted to {dtype}.")
        # High null percentage
        if after_report and after_report.get('quality_metrics', {}).get('null_percentage', 0) > 5:
            warnings.append("Some columns still have more than 5% null values.")
        # High duplicate percentage
        if after_report and after_report.get('quality_metrics', {}).get('duplicate_percentage', 0) > 0:
            warnings.append("There are still duplicate rows present.")
        
        # Add success message if no warnings
        if not warnings:
            warnings.append("✓ No issues detected after cleaning.")

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
                'preview': after_report['preview'],
                'outliers': after_report['outliers']
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
                        # Try multiple datetime conversion approaches
                        try:
                            # First try pandas built-in with format inference
                            df[column] = pd.to_datetime(df[column], errors='coerce', infer_datetime_format=True)
                        except:
                            # If that fails, try with specific common formats
                            common_formats = [
                                '%Y-%m-%d',
                                '%m/%d/%Y',
                                '%m-%d-%Y',
                                '%Y/%m/%d',
                                '%Y-%m-%d %H:%M:%S',
                                '%m/%d/%Y %H:%M:%S',
                                '%d/%m/%Y',
                                '%d-%m-%Y',
                                '%Y-%m-%d %H:%M:%S.%f',
                                '%m/%d/%y',
                                '%m-%d-%y'
                            ]
                            
                            converted = False
                            for fmt in common_formats:
                                try:
                                    df[column] = pd.to_datetime(df[column], format=fmt, errors='coerce')
                                    converted = True
                                    break
                                except:
                                    continue
                            
                            # If specific formats fail, try general parsing
                            if not converted:
                                df[column] = pd.to_datetime(df[column], errors='coerce')
                    elif suggested_type == 'boolean':
                        # Convert boolean values
                        df[column] = df[column].map({
                            True: True, False: False,
                            1: True, 0: False,
                            'yes': True, 'no': False,
                            'Yes': True, 'No': False,
                            'true': True, 'false': False,
                            'True': True, 'False': False,
                            'Y': True, 'N': False,
                            'y': True, 'n': False
                        })
                except Exception as e:
                    print(f"Warning: Failed to convert column {column} to {suggested_type}: {str(e)}")
                    pass  # Keep original type if conversion fails

    # Handle outlier cleaning
    outlier_config = config.get('outliers', {})
    for column, outlier_action in outlier_config.items():
        if column in df.columns and pd.api.types.is_numeric_dtype(df[column]):
            method = outlier_action.get('method', 'none')
            action = outlier_action.get('action', 'none')
            col_data = df[column]
            if method == 'none' or action == 'none':
                continue
            if action == 'remove':
                if method == 'winsorizing':
                    q05 = col_data.quantile(0.05)
                    q95 = col_data.quantile(0.95)
                    mask = (col_data >= q05) & (col_data <= q95)
                    df = df[mask]
                elif method == 'iqr':
                    q1 = col_data.quantile(0.25)
                    q3 = col_data.quantile(0.75)
                    iqr = q3 - q1
                    iqr_low = q1 - 1.5 * iqr
                    iqr_high = q3 + 1.5 * iqr
                    mask = (col_data >= iqr_low) & (col_data <= iqr_high)
                    df = df[mask]
                elif method == 'zscore':
                    mean = col_data.mean()
                    std = col_data.std()
                    if std > 0:
                        z_scores = (col_data - mean) / std
                        mask = z_scores.abs() <= 3
                        df = df[mask]
            elif action == 'cap':
                if method == 'winsorizing':
                    q05 = col_data.quantile(0.05)
                    q95 = col_data.quantile(0.95)
                    df[column] = col_data.clip(lower=q05, upper=q95)
                elif method == 'iqr':
                    q1 = col_data.quantile(0.25)
                    q3 = col_data.quantile(0.75)
                    iqr = q3 - q1
                    iqr_low = q1 - 1.5 * iqr
                    iqr_high = q3 + 1.5 * iqr
                    df[column] = col_data.clip(lower=iqr_low, upper=iqr_high)
                elif method == 'zscore':
                    mean = col_data.mean()
                    std = col_data.std()
                    if std > 0:
                        df[column] = col_data.clip(lower=mean - 3*std, upper=mean + 3*std)
    
    return df

def get_suggested_dtype(series):
    # 1. Check for boolean dtype
    if series.dtype == 'bool':
        return None  # Already boolean, no suggestion needed
    else:
        # 2. Check for only two unique values (excluding NaN)
        unique_vals = series.dropna().unique()
        if len(unique_vals) == 2:
            bool_sets = [
                {True, False},
                {1, 0},
                {'yes', 'no'},
                {'Yes', 'No'},
                {'true', 'false'},
                {'True', 'False'},
                {'Y', 'N'},
                {'y', 'n'}
            ]
            unique_set = set(unique_vals)
            for bset in bool_sets:
                if unique_set == bset:
                    return 'boolean'
    
    # 3. Check if already datetime
    if pd.api.types.is_datetime64_any_dtype(series):
        return None  # Already datetime, no suggestion needed
    
    # 4. Check for datetime before numeric (datetime strings can sometimes be parsed as numeric)
    if series.dtype == 'object':  # Only check string columns for datetime
        non_null_series = series.dropna()
        if len(non_null_series) > 0:
            # Try to parse as datetime with various formats
            try:
                # First try pandas built-in datetime parsing
                parsed_dates = pd.to_datetime(non_null_series, errors='coerce', infer_datetime_format=True)
                # Check if at least 80% of non-null values were successfully parsed as dates
                valid_dates = parsed_dates.dropna()
                if len(valid_dates) >= len(non_null_series) * 0.8:
                    return 'datetime'
            except:
                pass
            
            # Try common datetime patterns
            datetime_patterns = [
                r'\d{4}-\d{2}-\d{2}',  # YYYY-MM-DD
                r'\d{2}/\d{2}/\d{4}',  # MM/DD/YYYY
                r'\d{2}-\d{2}-\d{4}',  # MM-DD-YYYY
                r'\d{4}/\d{2}/\d{2}',  # YYYY/MM/DD
                r'\d{1,2}-\d{1,2}-\d{4}',  # M-D-YYYY or MM-DD-YYYY
                r'\d{1,2}/\d{1,2}/\d{4}',  # M/D/YYYY or MM/DD/YYYY
                r'\d{4}-\d{1,2}-\d{1,2}',  # YYYY-M-D or YYYY-MM-DD
                r'\d{4}/\d{1,2}/\d{1,2}',  # YYYY/M/D or YYYY/MM/DD
                r'\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}',  # YYYY-MM-DD HH:MM:SS
                r'\d{2}/\d{2}/\d{4} \d{2}:\d{2}:\d{2}',  # MM/DD/YYYY HH:MM:SS
            ]
            
            import re
            for pattern in datetime_patterns:
                matches = sum(1 for val in non_null_series.astype(str) if re.match(pattern, str(val)))
                if matches >= len(non_null_series) * 0.8:  # 80% match threshold
                    return 'datetime'
    
    # 5. Check for numeric
    if pd.api.types.is_numeric_dtype(series):
        return None  # Already numeric, no suggestion needed
    try:
        pd.to_numeric(series, errors='coerce')
        numeric_count = pd.to_numeric(series, errors='coerce').count()
        if numeric_count >= len(series.dropna()) * 0.8:  # 80% of values can be converted to numeric
            return 'numeric'
    except:
        pass
    
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
        'data_quality_score': 0,
        'outliers': {}  # <-- Add outliers key
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

            # Outlier detection for each numeric column
            for col in numeric_cols:
                col_data = df[col].dropna()
                outlier_info = {}
                # Winsorizing (outside 5th/95th percentiles)
                q05 = col_data.quantile(0.05)
                q95 = col_data.quantile(0.95)
                winsor_idx = col_data[(col_data < q05) | (col_data > q95)].index.tolist()
                outlier_info['winsorizing'] = {
                    'count': len(winsor_idx),
                    'indices': winsor_idx
                }
                # IQR method
                q1 = col_data.quantile(0.25)
                q3 = col_data.quantile(0.75)
                iqr = q3 - q1
                iqr_low = q1 - 1.5 * iqr
                iqr_high = q3 + 1.5 * iqr
                iqr_idx = col_data[(col_data < iqr_low) | (col_data > iqr_high)].index.tolist()
                outlier_info['iqr'] = {
                    'count': len(iqr_idx),
                    'indices': iqr_idx
                }
                # Z-score method (|z| > 3)
                mean = col_data.mean()
                std = col_data.std()
                if std > 0:
                    z_scores = (col_data - mean) / std
                    z_idx = z_scores[abs(z_scores) > 3].index.tolist()
                else:
                    z_idx = []
                outlier_info['zscore'] = {
                    'count': len(z_idx),
                    'indices': z_idx
                }
                report['outliers'][col] = outlier_info

        # Quality metrics
        report['quality_metrics'] = {
            'null_percentage': round(null_percentage, 2),
            'duplicate_percentage': round(duplicate_percentage, 2),
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

@app.route('/analysis', methods=['GET'])
def analysis_metadata():
    """Return column names, dtypes, grouped types, and preview from the latest cleaned dataset if available, otherwise from the raw uploaded dataset."""
    try:
        global cleaned_dataframe
        if cleaned_dataframe is None:
            upload_folder = app.config['UPLOAD_FOLDER']
            uploaded_filename = session.get('filename')
            cleaned_filename = session.get('cleaned_filename')
            print('DEBUG /analysis: session[filename]=', uploaded_filename)
            print('DEBUG /analysis: session[cleaned_filename]=', cleaned_filename)
            expected_cleaned_filename = f"cleaned_{uploaded_filename}"
            use_cleaned = cleaned_filename == expected_cleaned_filename
            print('DEBUG /analysis: expected_cleaned_filename=', expected_cleaned_filename)
            print('DEBUG /analysis: use_cleaned=', use_cleaned)
            if not uploaded_filename:
                return jsonify({'error': 'No uploaded file found. Please upload a dataset first.'}), 400

            # Prefer the latest cleaned file if available
            cleaned_files = [
                f for f in os.listdir(upload_folder)
                if f.startswith('cleaned_') and f.endswith(uploaded_filename)
            ]
            if cleaned_files:
                # Pick the one with the most 'cleaned_' prefixes (i.e., the longest name)
                cleaned_files.sort(key=lambda x: x.count('cleaned_'), reverse=True)
                analysis_filepath = os.path.join(upload_folder, cleaned_files[0])
                print('DEBUG /analysis: using latest cleaned file:', cleaned_files[0])
            else:
                analysis_filepath = os.path.join(upload_folder, uploaded_filename)
                print('DEBUG /analysis: using original file:', uploaded_filename)
            print('DEBUG /analysis: analysis_filepath=', analysis_filepath)

            if not os.path.exists(analysis_filepath):
                return jsonify({'error': 'Analysis file not found. Please upload a dataset first.'}), 400

            ext = analysis_filepath.split('.')[-1].lower()
            if ext == 'csv':
                df = pd.read_csv(analysis_filepath)
            elif ext in ['xls', 'xlsx']:
                df = pd.read_excel(analysis_filepath)
            elif ext == 'json':
                df = pd.read_json(analysis_filepath, orient='records')
            else:
                return jsonify({'error': 'Unsupported file format'}), 400

            # Group columns by type
            columns = []
            for col in df.columns:
                dtype = df[col].dtype.name
                if pd.api.types.is_numeric_dtype(df[col]):
                    group = 'Numerical'
                elif pd.api.types.is_datetime64_any_dtype(df[col]):
                    group = 'Date/Time'
                elif df[col].dtype == 'bool':
                    group = 'Boolean'
                else:
                    group = 'Categorical'
                columns.append({'name': col, 'dtype': dtype, 'group': group})

            preview = df.head().replace({np.nan: None}).to_dict(orient='records')
            data = df.replace({np.nan: None}).to_dict(orient='records')
            return jsonify({
                'filename': os.path.basename(analysis_filepath),
                'columns': columns,
                'preview': preview,
                'data': data
            }), 200
        else:
            # Use the stored cleaned_dataframe
            df = cleaned_dataframe
            columns = []
            for col in df.columns:
                dtype = df[col].dtype.name
                if pd.api.types.is_numeric_dtype(df[col]):
                    group = 'Numerical'
                elif pd.api.types.is_datetime64_any_dtype(df[col]):
                    group = 'Date/Time'
                elif df[col].dtype == 'bool':
                    group = 'Boolean'
                else:
                    group = 'Categorical'
                columns.append({'name': col, 'dtype': dtype, 'group': group})

            preview = df.head().replace({np.nan: None}).to_dict(orient='records')
            data = df.replace({np.nan: None}).to_dict(orient='records')
            return jsonify({
                'filename': 'cleaned_dataset.csv', # Placeholder, actual filename is not available here
                'columns': columns,
                'preview': preview,
                'data': data
            }), 200
    except Exception as e:
        app.logger.error(traceback.format_exc())
        return jsonify({'error': f'Failed to load analysis metadata: {str(e)}'}), 500


@app.route('/export', methods=['POST'])
def export_report():
    try:
        import datetime
        data = request.json
        
        # Extract options from request
        report_title = data.get('reportTitle', 'EDA Report')
        report_format = data.get('reportFormat', 'html')
        # Accept both camelCase and snake_case for included_sections
        included_sections = data.get('included_sections') or data.get('includedSections', {})
        charts = data.get('charts', [])
        download_cleaned = data.get('downloadCleaned', False)
        project_name = data.get('projectName', '')
        author_name = data.get('authorName', '')
        final_insights = data.get('finalInsights', '')

        # Check if original dataset info is provided (no cleaning performed)
        original_dataset_info = data.get('originalDatasetInfo')
        original_columns = data.get('originalColumns')
        
        # Find latest cleaned file for stats
        upload_folder = app.config['UPLOAD_FOLDER']
        files = [os.path.join(upload_folder, f) for f in os.listdir(upload_folder)
                 if os.path.isfile(os.path.join(upload_folder, f)) and f.startswith('cleaned_')]
        
        if files:
            # Use cleaned data
            cleaned_filepath = max(files, key=os.path.getctime)
            ext = cleaned_filepath.split('.')[-1].lower()
            if ext == 'csv':
                df = pd.read_csv(cleaned_filepath)
            elif ext in ['xls', 'xlsx']:
                df = pd.read_excel(cleaned_filepath)
            elif ext == 'json':
                df = pd.read_json(cleaned_filepath, orient='records')
            else:
                df = pd.DataFrame()
            file_size = f"{os.path.getsize(cleaned_filepath)/1024/1024:.2f} MB"
        elif original_dataset_info:
            # Use original dataset info (no cleaning performed)
            df = pd.DataFrame()  # Empty DataFrame for stats calculation
            file_size = original_dataset_info.get('dataset_info', {}).get('memory_usage', '-')
        else:
            # Fallback to original uploaded file
            uploaded_filename = session.get('filename')
            if uploaded_filename:
                original_filepath = os.path.join(upload_folder, uploaded_filename)
                if os.path.exists(original_filepath):
                    ext = original_filepath.split('.')[-1].lower()
                    if ext == 'csv':
                        df = pd.read_csv(original_filepath)
                    elif ext in ['xls', 'xlsx']:
                        df = pd.read_excel(original_filepath)
                    elif ext == 'json':
                        df = pd.read_json(original_filepath, orient='records')
                    else:
                        df = pd.DataFrame()
                    file_size = f"{os.path.getsize(original_filepath)/1024/1024:.2f} MB"
                else:
                    df = pd.DataFrame()
                    file_size = '-'
            else:
                df = pd.DataFrame()
                file_size = '-'

        # Overview - use original dataset info if available
        if original_dataset_info and original_columns and not files:
            # Use original dataset info (no cleaning performed)
            dataset_info = original_dataset_info.get('dataset_info', {})
            total_rows = dataset_info.get('rows', 0)
            total_columns = dataset_info.get('columns', 0)
            
            # Count column types from original dataset
            num_numerical = len([c for c in original_columns if c.get('group') == 'Numerical'])
            num_boolean = len([c for c in original_columns if c.get('group') == 'Boolean'])
            num_categorical = len([c for c in original_columns if c.get('group') == 'Categorical'])
            num_datetime = len([c for c in original_columns if c.get('group') == 'Date/Time'])
            
            # Data Quality Summary from original dataset
            quality_metrics = original_dataset_info.get('quality_metrics', {})
            null_percentage = quality_metrics.get('null_percentage', 0)
            total_cells = total_rows * total_columns
            null_count = int((null_percentage / 100) * total_cells) if total_cells > 0 else 0
            missing_values = f"{null_count} ({null_percentage:.2f}%)"
            nulls_dict = original_dataset_info.get('nulls', {})
            duplicates = original_dataset_info.get('duplicates', 0)
        else:
            # Use cleaned data or fallback
            total_rows = len(df)
            total_columns = len(df.columns)
            num_numerical = len([c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])])
            num_boolean = len([c for c in df.columns if df[c].dtype == 'bool'])
            num_categorical = len([c for c in df.columns if df[c].dtype == 'object'])
            num_datetime = len([c for c in df.columns if pd.api.types.is_datetime64_any_dtype(df[c])])

            # Data Quality Summary
            missing_values = f"{df.isnull().sum().sum()} ({(df.isnull().sum().sum()/(len(df)*len(df.columns))*100 if len(df)*len(df.columns) else 0):.2f}%)" if not df.empty else '0 (0.00%)'
            nulls = df.isnull().sum()
            nulls_dict = nulls[nulls > 0].to_dict()
            duplicates = df.duplicated().sum() if not df.empty else 0
        # Dummy dtype fixes (should be provided by frontend or computed)
        dtype_fixes = data.get('dtypeFixes', [])

        # Cleaning Summary
        cleaning_actions = data.get('cleaningActions', [])
        cleaning_table = data.get('cleaning_table', [])

        # Outlier Detection Summary
        outlier_table = data.get('outlierTable', [])

        # Charts (visualisations)
        charts_data = []
        for chart in charts:
            chart_info = {
                'title': chart.get('title', ''),
                'type': chart.get('type', ''),
                'columns': ', '.join(chart.get('columns', [])) if chart.get('columns') else '',
                'insight': chart.get('insight', ''),
                'image_base64': chart.get('image_base64', ''),
                'filter': chart.get('filter', ''),
                'sort': chart.get('sort', '')
            }
            # Add aggregation type if applicable
            if chart.get('aggregationType') and chart.get('type') in ['bar', 'horizontalBar', 'groupedBar', 'stackedBar', 'pie', 'donut']:
                chart_info['aggregationType'] = chart.get('aggregationType')
            charts_data.append(chart_info)

        # Date & Time of Export
        export_datetime = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        # 1. Generate HTML report using Jinja2 template
        with open('templates/eda_report_template.html', 'r', encoding='utf-8') as f:
            html_template = f.read()
        template = Template(html_template)
        context = dict(
            title=report_title,
            export_datetime=export_datetime,
            project_name=project_name,
            author_name=author_name,
            total_rows=total_rows,
            total_columns=total_columns,
            file_size=file_size,
            num_numerical=num_numerical,
            num_boolean=num_boolean,
            num_categorical=num_categorical,
            num_datetime=num_datetime,
            missing_values=missing_values,
            nulls=nulls_dict,
            duplicates=duplicates,
            dtype_fixes=dtype_fixes,
            cleaning_actions=cleaning_actions,
            cleaning_table=cleaning_table,
            outlier_table=outlier_table,
            charts=charts_data,
            final_insights=final_insights,
            included_sections=included_sections  # <-- always pass this
        )
        html_content = template.render(**context)

        # 2. Prepare report file (HTML or PDF)
        report_bytes = None
        report_filename = None
        if report_format == 'pdf':
            try:
                # Generate PDF using Playwright
                with sync_playwright() as p:
                    browser = p.chromium.launch()
                    page = browser.new_page()
                    page.set_content(html_content)
                    pdf_bytes = page.pdf(format='A4', print_background=True)
                    browser.close()
                
                report_bytes = pdf_bytes
                report_filename = f"{report_title}.pdf"
                report_mimetype = 'application/pdf'
            except Exception as e:
                return jsonify({'error': f'PDF generation failed: {str(e)}'}), 500
        else:
            report_bytes = html_content.encode('utf-8')
            report_filename = f"{report_title}.html"
            report_mimetype = 'text/html'

        # 3. Optionally, prepare cleaned dataset as CSV
        cleaned_csv_bytes = None
        cleaned_csv_filename = None
        if download_cleaned and not df.empty:
            buf = io.StringIO()
            df.to_csv(buf, index=False)
            cleaned_csv_bytes = buf.getvalue().encode('utf-8')
            cleaned_csv_filename = os.path.basename(cleaned_filepath)

        # 4. Return as ZIP if both report and CSV are requested
        if download_cleaned and cleaned_csv_bytes:
            zip_buf = io.BytesIO()
            with zipfile.ZipFile(zip_buf, 'w') as zf:
                zf.writestr(report_filename, report_bytes)
                if cleaned_csv_filename is not None:
                    zf.writestr(cleaned_csv_filename, cleaned_csv_bytes)
            zip_buf.seek(0)
            return send_file(
                zip_buf,
                mimetype='application/zip',
                as_attachment=True,
                download_name=f"{report_title}_export.zip"
            )

        # 5. Otherwise, return just the report
        return send_file(
            io.BytesIO(report_bytes),
            mimetype=report_mimetype,
            as_attachment=True,
            download_name=report_filename
        )
    
    except Exception as e:
        app.logger.error(f"Export error: {traceback.format_exc()}")
        return jsonify({'error': f'Failed to generate report: {str(e)}'}), 500


@app.route('/reset', methods=['POST'])
def reset():
    session.clear()
    # Optionally, delete all files in the uploads folder
    upload_folder = app.config['UPLOAD_FOLDER']
    for f in os.listdir(upload_folder):
        file_path = os.path.join(upload_folder, f)
        if os.path.isfile(file_path):
            os.remove(file_path)
    # Clear the stored cleaned dataframe
    global cleaned_dataframe
    cleaned_dataframe = None
    return jsonify({'message': 'Session and uploads reset.'}), 200

@app.route('/download-cleaned', methods=['GET'])
def download_cleaned():
    upload_folder = app.config['UPLOAD_FOLDER']
    # List all files for debugging
    print("Files in upload folder:", os.listdir(upload_folder))
    # Find latest cleaned file (filename starts with 'cleaned_')
    files = [os.path.join(upload_folder, f) for f in os.listdir(upload_folder)
             if os.path.isfile(os.path.join(upload_folder, f)) and f.startswith('cleaned_')]
    if not files:
        return jsonify({'error': 'No cleaned files found.'}), 404
    cleaned_filepath = max(files, key=os.path.getctime)
    # Remove all cleaned_ prefixes for download
    original_name = os.path.basename(cleaned_filepath)
    base_name = original_name
    while base_name.startswith('cleaned_'):
        base_name = base_name[len('cleaned_'):]
    download_name = f"cleaned_{base_name}"
    return send_file(
        cleaned_filepath,
        as_attachment=True,
        download_name=download_name
    )

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
