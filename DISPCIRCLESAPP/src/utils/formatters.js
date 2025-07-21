// Utility functions for formatting data

export const formatDate = (date) => {
  if (!date) return 'Unknown Date';
  
  const dateObj = date.toDate ? date.toDate() : new Date(date);
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatInteger = (value) => {
  if (value === null || value === undefined) return '0';
  return Math.round(value).toLocaleString();
};

export const formatYards = (value) => {
  if (value === null || value === undefined) return '0';
  return Math.round(value).toString();
};

export const formatDistanceWithUnit = (value, unit = 'yards') => {
  if (value === null || value === undefined) return '0 ' + unit;
  return `${Math.round(value)} ${unit}`;
};

export const formatSpeedWithUnit = (value, unit = 'mph') => {
  if (value === null || value === undefined) return '0 ' + unit;
  return `${Math.round(value)} ${unit}`;
};

export const formatHeightWithUnit = (value, unit = 'ft') => {
  if (value === null || value === undefined) return '0 ' + unit;
  return `${Math.round(value)} ${unit}`;
};

export const formatAngle = (value) => {
  if (value === null || value === undefined) return '0°';
  return `${Math.round(value)}°`;
}; 