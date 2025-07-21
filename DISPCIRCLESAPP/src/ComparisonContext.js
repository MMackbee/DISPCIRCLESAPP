import React, { createContext, useContext, useState, useEffect } from 'react';
import { COMPARISON_DATASETS } from './clubOrdering';
import { getPreferredDataset, setPreferredDataset } from './userPreferences';

const ComparisonContext = createContext();

export const useComparison = () => {
  const context = useContext(ComparisonContext);
  if (!context) {
    throw new Error('useComparison must be used within a ComparisonProvider');
  }
  return context;
};

export const ComparisonProvider = ({ children }) => {
  const [selectedDataset, setSelectedDataset] = useState('pga_tour');

  // Load user's preferred dataset on mount
  useEffect(() => {
    const preferred = getPreferredDataset();
    setSelectedDataset(preferred);
  }, []);

  const updateSelectedDataset = (datasetKey) => {
    setSelectedDataset(datasetKey);
    setPreferredDataset(datasetKey);
  };

  const value = {
    selectedDataset,
    setSelectedDataset: updateSelectedDataset,
    availableDatasets: COMPARISON_DATASETS,
    currentDataset: COMPARISON_DATASETS[selectedDataset]
  };

  return (
    <ComparisonContext.Provider value={value}>
      {children}
    </ComparisonContext.Provider>
  );
}; 