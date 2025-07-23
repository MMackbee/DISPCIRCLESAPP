import React, { createContext, useContext, useState, useEffect } from 'react';

const UserPreferencesContext = createContext();

export const useUserPreferences = () => {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
};

export const UserPreferencesProvider = ({ children }) => {
  const [preferences, setPreferences] = useState({
    distanceUnit: 'yards', // 'yards' or 'meters'
    speedUnit: 'mph',      // 'mph' or 'kmh'
    heightUnit: 'feet',    // 'feet', 'yards', or 'meters'
    angleUnit: 'degrees'   // 'degrees' or 'radians' (future use)
  });

  // Load preferences from localStorage on mount
  useEffect(() => {
    const savedPreferences = localStorage.getItem('golfAppPreferences');
    if (savedPreferences) {
      try {
        const parsed = JSON.parse(savedPreferences);
        setPreferences(prev => ({ ...prev, ...parsed }));
      } catch (error) {
        console.error('Error loading user preferences:', error);
      }
    }
  }, []);

  // Save preferences to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('golfAppPreferences', JSON.stringify(preferences));
  }, [preferences]);

  const updatePreferences = (newPreferences) => {
    setPreferences(prev => ({ ...prev, ...newPreferences }));
  };

  const value = {
    preferences,
    updatePreferences
  };

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
}; 