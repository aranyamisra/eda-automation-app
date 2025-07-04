import { useEffect, useState } from 'react';

function ReportPage() {
  const [report, setReport] = useState(null);

  // Fetch the report from the backend when the component loads
  useEffect(() => {
    fetch('http://localhost:5001/cleaning', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setReport(data))
      .catch(err => setReport({ error: 'Failed to fetch report' }));
  }, []);

  // Show loading or error messages
  if (!report) return <p>Loading...</p>;
  if (report.error) return <p>Error: {report.error}</p>;

  // Get the preview rows (if available)
  const previewRows = report.preview || [];

  return (
    <div className="p-4">
      <h2>Data Quality Report</h2>

      {/* Preview Table */}
      <h3>Dataset Preview</h3>
      {previewRows.length > 0 ? (
        <table>
          <thead>
            <tr>
              {Object.keys(previewRows[0]).map(col => (
                <th key={col}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, i) => (
              <tr key={i}>
                {Object.values(row).map((val, j) => (
                  <td key={j}>{val}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No preview data available.</p>
      )}

      {/* Null Values */}
      <h3>Null Values</h3>
      {report.nulls && Object.keys(report.nulls).length > 0 ? (
        <ul>
          {Object.entries(report.nulls).map(([col, count]) => (
            <li key={col}>{col}: {count}</li>
          ))}
        </ul>
      ) : (
        <p>No null values found.</p>
      )}

      {/* Duplicate Rows */}
      <h3>Duplicate Rows</h3>
      <p>{report.duplicates}</p>

      {/* Suggested Data Type Fixes */}
      <h3>Suggested Data Type Fixes</h3>
      {report.suggested_dtypes && Object.keys(report.suggested_dtypes).length > 0 ? (
        <ul>
          {Object.entries(report.suggested_dtypes).map(([col, dtype]) => (
            <li key={col}>{col} → {dtype}</li>
          ))}
        </ul>
      ) : (
        <p>No suggestions.</p>
      )}
    </div>
  );
}

export default ReportPage;
