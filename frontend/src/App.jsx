import { useState } from 'react';
import UploadPage from './UploadPage';
import ReportPage from './ReportPage';

function App() {
  const [uploaded, setUploaded] = useState(false);

  return (
    <div>
      {!uploaded ? (
        <UploadPage onUpload={() => setUploaded(true)} />
      ) : (
        <ReportPage />
      )}
    </div>
  );
}

export default App;
