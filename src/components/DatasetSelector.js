import React, { useState, useEffect } from 'react';
import { getPreferredDataset, setPreferredDataset, getAvailableDatasets } from '../userPreferences';
import { COMPARISON_DATASETS } from '../clubOrdering';

const DatasetSelector = ({ onDatasetChange, className = '' }) => {
  const [selectedDataset, setSelectedDataset] = useState('pga_tour');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Load user's preferred dataset on component mount
    const preferred = getPreferredDataset();
    setSelectedDataset(preferred);
    if (onDatasetChange) {
      onDatasetChange(preferred);
    }
  }, [onDatasetChange]);

  const handleDatasetChange = (datasetKey) => {
    setSelectedDataset(datasetKey);
    setPreferredDataset(datasetKey);
    setIsOpen(false);
    
    if (onDatasetChange) {
      onDatasetChange(datasetKey);
    }
  };

  const availableDatasets = getAvailableDatasets();
  const currentDataset = COMPARISON_DATASETS[selectedDataset];

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-white bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-colors"
      >
        <div className="flex items-center space-x-2">
          <span className="text-yellow-400">📊</span>
          <span>Compare vs: {currentDataset?.name || 'PGA Tour'}</span>
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg">
          <div className="py-1">
            {availableDatasets.map((dataset) => (
              <button
                key={dataset.key}
                onClick={() => handleDatasetChange(dataset.key)}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-700 transition-colors ${
                  selectedDataset === dataset.key
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{dataset.name}</div>
                    <div className="text-xs text-gray-400">{dataset.description}</div>
                  </div>
                  {selectedDataset === dataset.key && (
                    <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DatasetSelector; 