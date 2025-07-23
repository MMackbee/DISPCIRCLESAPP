import React from 'react';
import { useUserPreferences } from '../UserPreferencesContext';

const PreferencesModal = ({ isOpen, onClose }) => {
  const { preferences, updatePreferences } = useUserPreferences();

  if (!isOpen) return null;

  const handleUnitChange = (type, value) => {
    updatePreferences({ [type]: value });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="chunky-card max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <span className="mr-2">⚙️</span>
            Global Preferences
          </h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 text-2xl font-bold"
          >
            ×
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mb-6">
          These settings apply globally across all views and will be saved for future sessions.
        </p>

        <div className="space-y-6">
          {/* Distance Units */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              📏 Distance Units
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="distanceUnit"
                  value="yards"
                  checked={preferences.distanceUnit === 'yards'}
                  onChange={(e) => handleUnitChange('distanceUnit', e.target.value)}
                  className="mr-2 text-green-600 focus:ring-green-600"
                />
                <span className="text-gray-700 font-medium">Yards</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="distanceUnit"
                  value="meters"
                  checked={preferences.distanceUnit === 'meters'}
                  onChange={(e) => handleUnitChange('distanceUnit', e.target.value)}
                  className="mr-2 text-green-600 focus:ring-green-600"
                />
                <span className="text-gray-700 font-medium">Meters</span>
              </label>
            </div>
          </div>

          {/* Speed Units */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              🚀 Speed Units
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="speedUnit"
                  value="mph"
                  checked={preferences.speedUnit === 'mph'}
                  onChange={(e) => handleUnitChange('speedUnit', e.target.value)}
                  className="mr-2 text-green-600 focus:ring-green-600"
                />
                <span className="text-gray-700 font-medium">MPH</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="speedUnit"
                  value="kmh"
                  checked={preferences.speedUnit === 'kmh'}
                  onChange={(e) => handleUnitChange('speedUnit', e.target.value)}
                  className="mr-2 text-green-600 focus:ring-green-600"
                />
                <span className="text-gray-700 font-medium">KM/H</span>
              </label>
            </div>
          </div>

          {/* Height Units */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              📐 Height Units
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="heightUnit"
                  value="feet"
                  checked={preferences.heightUnit === 'feet'}
                  onChange={(e) => handleUnitChange('heightUnit', e.target.value)}
                  className="mr-2 text-green-600 focus:ring-green-600"
                />
                <span className="text-gray-700 font-medium">Feet</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="heightUnit"
                  value="yards"
                  checked={preferences.heightUnit === 'yards'}
                  onChange={(e) => handleUnitChange('heightUnit', e.target.value)}
                  className="mr-2 text-green-600 focus:ring-green-600"
                />
                <span className="text-gray-700 font-medium">Yards</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="heightUnit"
                  value="meters"
                  checked={preferences.heightUnit === 'meters'}
                  onChange={(e) => handleUnitChange('heightUnit', e.target.value)}
                  className="mr-2 text-green-600 focus:ring-green-600"
                />
                <span className="text-gray-700 font-medium">Meters</span>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t-4 border-gray-300">
          <div className="text-sm text-gray-600 mb-4">
            <p className="font-bold mb-2">Current settings:</p>
            <p>• Distance: {preferences.distanceUnit === 'yards' ? 'Yards' : 'Meters'}</p>
            <p>• Speed: {preferences.speedUnit === 'mph' ? 'MPH' : 'KM/H'}</p>
            <p>• Height: {preferences.heightUnit === 'feet' ? 'Feet' : preferences.heightUnit === 'yards' ? 'Yards' : 'Meters'}</p>
          </div>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="chunky-button chunky-button-primary"
            >
              ✅ Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PreferencesModal; 