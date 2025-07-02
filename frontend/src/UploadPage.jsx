import { useState } from 'react';

function UploadPage({ onUpload }) {
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('dataset', file);

    const response = await fetch('http://127.0.0.1:5001/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    if (response.ok) {
      onUpload();  // switch to report page
    } else {
      alert('Upload failed');
    }
  };

  return (
    <div>
      <h2>Upload a Dataset</h2>
      <input type="file" onChange={handleFileChange} />
      <button onClick={handleUpload} >Upload</button>
    </div>
  );
}

export default UploadPage;
