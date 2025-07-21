// User Preferences Management
// Handles user's preferred comparison dataset and other settings

const USER_PREFERENCES_KEY = 'dispersion_circles_user_preferences';

// Default preferences
const DEFAULT_PREFERENCES = {
  comparisonDataset: 'pga_tour',
  theme: 'dark',
  showTooltips: true,
  autoSave: true
};

/**
 * Get user preferences from localStorage
 * @returns {Object} - User preferences object
 */
export const getUserPreferences = () => {
  try {
    const stored = localStorage.getItem(USER_PREFERENCES_KEY);
    if (stored) {
      const preferences = JSON.parse(stored);
      // Merge with defaults to ensure all keys exist
      return { ...DEFAULT_PREFERENCES, ...preferences };
    }
  } catch (error) {
    console.warn('Error loading user preferences:', error);
  }
  return { ...DEFAULT_PREFERENCES };
};

/**
 * Save user preferences to localStorage
 * @param {Object} preferences - Preferences object to save
 */
export const saveUserPreferences = (preferences) => {
  try {
    const currentPrefs = getUserPreferences();
    const updatedPrefs = { ...currentPrefs, ...preferences };
    localStorage.setItem(USER_PREFERENCES_KEY, JSON.stringify(updatedPrefs));
  } catch (error) {
    console.warn('Error saving user preferences:', error);
  }
};

/**
 * Update a specific preference
 * @param {string} key - Preference key
 * @param {any} value - Preference value
 */
export const updateUserPreference = (key, value) => {
  const currentPrefs = getUserPreferences();
  currentPrefs[key] = value;
  saveUserPreferences(currentPrefs);
};

/**
 * Get the user's preferred comparison dataset
 * @returns {string} - Dataset key (e.g., 'pga_tour', 'zero_hcp', etc.)
 */
export const getPreferredDataset = () => {
  return getUserPreferences().comparisonDataset;
};

/**
 * Set the user's preferred comparison dataset
 * @param {string} datasetKey - Dataset key to set as preferred
 */
export const setPreferredDataset = (datasetKey) => {
  updateUserPreference('comparisonDataset', datasetKey);
};

/**
 * Reset user preferences to defaults
 */
export const resetUserPreferences = () => {
  try {
    localStorage.removeItem(USER_PREFERENCES_KEY);
  } catch (error) {
    console.warn('Error resetting user preferences:', error);
  }
};

/**
 * Get all available comparison datasets for UI selection
 * @returns {Array} - Array of dataset objects with key, name, and description
 */
export const getAvailableDatasets = () => {
  return [
    {
      key: 'pga_tour',
      name: 'PGA Tour',
      description: 'Professional tour standards - highest level'
    },
    {
      key: 'zero_hcp',
      name: '0 Handicap',
      description: 'Scratch golfer standards - excellent amateur level'
    },
    {
      key: 'ten_hcp',
      name: '10 Handicap',
      description: 'Single digit handicap - good amateur level'
    },
    {
      key: 'twenty_hcp',
      name: '20 Handicap',
      description: 'Mid-handicap golfer - recreational level'
    }
  ];
}; 