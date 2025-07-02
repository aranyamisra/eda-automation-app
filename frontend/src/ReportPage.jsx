import { useEffect, useState } from 'react';

function ReportPage() {
  const [report, setReport] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5001/cleaning', {
      credentials: 'include'
    })
      .then(res => res.json())
      .then(data => setReport(data))
      .catch(err => console.error('Failed to fetch report:', err));
  }, []);

  if (!report) return <p>Loading...</p>;
  if (report.error) return <p>Error: {report.error}</p>;

  return (
    <div className="p-4">
      <h2>Data Quality Report</h2>

      <h3>Null Values</h3>
      {Object.keys(report.nulls).length > 0 ? (
        <ul>
          {Object.entries(report.nulls).map(([col, count]) => (
            <li key={col}>{col}: {count}</li>
          ))}
        </ul>
      ) : <p>No null values found.</p>}

      <h3>Duplicate Rows</h3>
      <p>{report.duplicates}</p>

      <h3>Suggested Data Type Fixes</h3>
      {Object.keys(report.suggested_dtypes).length > 0 ? (
        <ul>
          {Object.entries(report.suggested_dtypes).map(([col, dtype]) => (
            <li key={col}>{col} → {dtype}</li>
          ))}
        </ul>
      ) : <p>No suggestions.</p>}
    </div>
  );
}

export default ReportPage;
