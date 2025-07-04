from flask import Flask, request, jsonify, session
import pandas as pd
import os
from datetime import timedelta
from flask_cors import CORS

app = Flask(__name__)
app.secret_key = 'your-secret-key'
app.permanent_session_lifetime = timedelta(minutes=10)
app.config['UPLOAD_FOLDER'] = 'uploads'
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}}, supports_credentials=True)

@app.route('/', methods=['GET'])
def home():
    return 'Backend is running! Use the frontend to upload files.'

@app.route('/upload', methods=['POST'])
def upload_file():
    uploaded_file = request.files.get('dataset')
    if uploaded_file and uploaded_file.filename:
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], uploaded_file.filename)
        uploaded_file.save(filepath)
        session['dataset_path'] = filepath
        return jsonify({'message': 'File uploaded successfully', 'filename': uploaded_file.filename}), 200
    return jsonify({'error': 'No file uploaded'}), 400

@app.route('/cleaning', methods=['GET'])
def cleaning_page():
    # Get the latest file in the uploads directory
    upload_folder = app.config['UPLOAD_FOLDER']
    files = [os.path.join(upload_folder, f) for f in os.listdir(upload_folder) if os.path.isfile(os.path.join(upload_folder, f))]
    if not files:
        return jsonify({'error': 'No files uploaded yet'}), 400
    filepath = max(files, key=os.path.getctime) 


    ext = filepath.split('.')[-1].lower()
    try:
        if ext == 'csv':
            df = pd.read_csv(filepath)
        elif ext in ['xls', 'xlsx']:
            df = pd.read_excel(filepath)
        elif ext == 'json':
            df = pd.read_json(filepath)
        else:
            return jsonify({'error': 'Unsupported file format'}), 400
    except Exception as e:
        return jsonify({'error': f'Error loading dataset: {e}'}), 500

    report = data_quality_report(df)
    return jsonify(report), 200

def data_quality_report(df):
    report = {}

    # Add this line to include the first 5 rows as a preview
    report['preview'] = df.head().to_dict(orient="records")

    # nulls
    nulls = df.isnull().sum()
    report['nulls'] = nulls[nulls > 0].to_dict()

    # duplicates
    report['duplicates'] = int(df.duplicated().sum())

    # data type mismatches
    suggested_dtypes = {}
    for col in df.columns:
        try:
            pd.to_numeric(df[col])
            if df[col].dtype not in ['float64', 'int64']:
                suggested_dtypes[col] = 'numeric'
        except:
            try:
                pd.to_datetime(df[col])
                if df[col].dtype != 'datetime64[ns]':
                    suggested_dtypes[col] = 'datetime'
            except:
                continue
    report['suggested_dtypes'] = suggested_dtypes

    return report

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
