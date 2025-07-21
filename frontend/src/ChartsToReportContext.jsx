import React, { createContext, useState, useContext } from 'react';

const ChartsToReportContext = createContext();

export const useChartsToReport = () => useContext(ChartsToReportContext);

export const ChartsToReportProvider = ({ children }) => {
  const [chartsToReport, setChartsToReport] = useState({});
  return (
    <ChartsToReportContext.Provider value={{ chartsToReport, setChartsToReport }}>
      {children}
    </ChartsToReportContext.Provider>
  );
}; 