import React, { createContext, useState, useContext, useEffect } from 'react';

const ChartsToReportContext = createContext();

export const useChartsToReport = () => useContext(ChartsToReportContext);

export const ChartsToReportProvider = ({ children }) => {
  // Initialize state from localStorage if available
  const [chartsToReport, setChartsToReport] = useState(() => {
    const stored = localStorage.getItem('chartsToReport');
    return stored ? JSON.parse(stored) : {};
  });

  // Save to localStorage whenever chartsToReport changes
  useEffect(() => {
    localStorage.setItem('chartsToReport', JSON.stringify(chartsToReport));
  }, [chartsToReport]);

  return (
    <ChartsToReportContext.Provider value={{ chartsToReport, setChartsToReport }}>
      {children}
    </ChartsToReportContext.Provider>
  );
}; 