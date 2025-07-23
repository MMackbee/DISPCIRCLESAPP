// Golf club ordering utility
// Note: PGA rules allow maximum 14 clubs in bag, with 1 typically being a putter
// Users can select up to 13 clubs for analysis, but may test more than 13
// Order: Wedges-Irons-Hybrids-Woods-Driver
// LW, SW, GW, PW, 9I, 8I, 7I, 6I, 5I, 4I, H3, H4, H5, H6, 5W, 3W, DR

/**
 * Format a value as yards, rounded to the nearest tenth (e.g., 152.7 yds)
 * @param {number} value
 * @returns {string}
 */
export function formatYards(value) {
  if (isNaN(value)) return '-';
  return `${Math.round(value * 10) / 10}`; // Removed " yds" for cleaner tables
}

/**
 * Format a value as a whole integer (no decimals)
 * @param {number} value
 * @returns {string}
 */
export function formatInteger(value) {
  if (isNaN(value)) return '-';
  return `${Math.round(value)}`;
}

/**
 * Format a value as speed (mph)
 * @param {number} value
 * @returns {string}
 */
export function formatSpeed(value) {
  if (isNaN(value)) return '-';
  return `${Math.round(value)}`;
}

/**
 * Format a value as angle (degrees with 1 decimal)
 * @param {number} value
 * @returns {string}
 */
export function formatAngle(value) {
  if (isNaN(value)) return '-';
  return `${value.toFixed(1)}°`;
}

/**
 * Format a value as height (feet with 1 decimal)
 * @param {number} value
 * @returns {string}
 */
export function formatHeight(value) {
  if (isNaN(value)) return '-';
  return `${value.toFixed(1)}'`;
}

/**
 * Format a value as height with unit preference
 * @param {number} value - Value in feet
 * @param {string} unit - 'feet', 'yards', or 'meters'
 * @returns {string}
 */
export function formatHeightWithUnit(value, unit = 'feet') {
  if (isNaN(value)) return '-';
  
  if (unit === 'yards') {
    const yards = value / 3;
    return `${yards.toFixed(1)} yds`;
  } else if (unit === 'meters') {
    const meters = value * 0.3048; // Convert feet to meters
    return `${meters.toFixed(1)} m`;
  } else {
    return `${value.toFixed(1)}'`;
  }
}

/**
 * Format a value as speed with unit preference
 * @param {number} value - Value in mph
 * @param {string} unit - 'mph' or 'kmh'
 * @returns {string}
 */
export function formatSpeedWithUnit(value, unit = 'mph') {
  if (isNaN(value)) return '-';
  
  if (unit === 'kmh') {
    const kmh = value * 1.60934;
    return `${Math.round(kmh)} km/h`;
  } else {
    return `${Math.round(value)} mph`;
  }
}

/**
 * Format a value as distance with unit preference
 * @param {number} value - Value in yards
 * @param {string} unit - 'yards' or 'meters'
 * @returns {string}
 */
export function formatDistanceWithUnit(value, unit = 'yards') {
  if (isNaN(value)) return '-';
  
  if (unit === 'meters') {
    const meters = value * 0.9144;
    return `${Math.round(meters)} m`;
  } else {
    return `${Math.round(value)} yds`;
  }
}

// Standardized Color System (10%, 20%, 30% thresholds)
export const COLOR_THRESHOLDS = {
  EXCELLENT: 0.10,    // 10% - Green
  GOOD: 0.20,         // 20% - Yellow  
  POOR: 0.30          // 30% - Red
};

/**
 * Get standardized color based on percentage difference from target
 * @param {number} actual - Actual value
 * @param {number} target - Target/reference value
 * @param {boolean} lowerIsBetter - Whether lower values are better (default: false)
 * @returns {Object} - Color analysis with quality, color, and message
 */
export const getStandardizedColor = (actual, target, lowerIsBetter = false) => {
  if (!target || target === 0) {
    return { quality: 'unknown', color: 'gray', message: 'No reference data' };
  }

  const percentageDiff = Math.abs(actual - target) / target;
  
  if (lowerIsBetter) {
    // For metrics where lower is better (e.g., dispersion, side distance)
    if (percentageDiff <= COLOR_THRESHOLDS.EXCELLENT) {
      return { quality: 'excellent', color: 'green', message: 'Excellent (within 10%)' };
    } else if (percentageDiff <= COLOR_THRESHOLDS.GOOD) {
      return { quality: 'good', color: 'yellow', message: 'Good (within 20%)' };
    } else if (percentageDiff <= COLOR_THRESHOLDS.POOR) {
      return { quality: 'poor', color: 'red', message: 'Needs improvement (within 30%)' };
    } else {
      return { quality: 'critical', color: 'red', message: 'Critical issue (>30% off)' };
    }
  } else {
    // For metrics where higher is better (e.g., distance, accuracy)
    if (percentageDiff <= COLOR_THRESHOLDS.EXCELLENT) {
      return { quality: 'excellent', color: 'green', message: 'Excellent (within 10%)' };
    } else if (percentageDiff <= COLOR_THRESHOLDS.GOOD) {
      return { quality: 'good', color: 'yellow', message: 'Good (within 20%)' };
    } else if (percentageDiff <= COLOR_THRESHOLDS.POOR) {
      return { quality: 'poor', color: 'red', message: 'Needs improvement (within 30%)' };
    } else {
      return { quality: 'critical', color: 'red', message: 'Critical issue (>30% off)' };
    }
  }
};

/**
 * Get color class for Tailwind CSS
 * @param {string} color - Color name (green, yellow, red, gray)
 * @param {string} type - Type of element (text, bg, border)
 * @returns {string} - Tailwind CSS class
 */
export const getColorClass = (color, type = 'text') => {
  const colorMap = {
    green: {
      text: 'text-green-300',
      bg: 'bg-green-500/10',
      border: 'border-green-500/30'
    },
    yellow: {
      text: 'text-yellow-300',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30'
    },
    red: {
      text: 'text-red-300',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30'
    },
    gray: {
      text: 'text-gray-400',
      bg: 'bg-gray-500/10',
      border: 'border-gray-500/30'
    }
  };
  
  return colorMap[color]?.[type] || colorMap.gray[type];
};

/**
 * Analyze performance against standards using standardized thresholds
 * @param {number} actual - Actual performance value
 * @param {number} standard - Standard value
 * @param {boolean} lowerIsBetter - Whether lower values are better
 * @param {string} dataset - Dataset name for display
 * @returns {Object} - Performance analysis
 */
export const analyzePerformance = (actual, standard, lowerIsBetter = false, dataset = 'PGA Tour') => {
  if (!standard || standard === 0) {
    return { quality: 'unknown', color: 'gray', message: 'No reference data' };
  }

  const percentageDiff = ((actual - standard) / standard) * 100;
  const roundedPercentage = Math.round(percentageDiff * 10) / 10;
  
  // New logic: Green if better than standard, Yellow/Red based on how much worse
  let color, quality, message;
  
  if (lowerIsBetter) {
    // For metrics where lower is better (like gaps, dispersion)
    if (percentageDiff <= 0) {
      // User's value is equal to or better than standard (lower gap is better)
      color = 'green';
      quality = 'excellent';
      message = `${roundedPercentage}% vs ${dataset}`;
    } else if (percentageDiff <= 10) {
      // User's value is 0.01% to 10% worse than standard
      color = 'yellow';
      quality = 'good';
      message = `+${roundedPercentage}% vs ${dataset}`;
    } else if (percentageDiff <= 20) {
      // User's value is 10.01% to 20% worse than standard
      color = 'red';
      quality = 'poor';
      message = `+${roundedPercentage}% vs ${dataset}`;
    } else {
      // User's value is more than 20% worse than standard
      color = 'red';
      quality = 'critical';
      message = `+${roundedPercentage}% vs ${dataset}`;
    }
  } else {
    // For metrics where higher is better (like distance)
    if (percentageDiff >= 0) {
      // User's value is equal to or better than standard
      color = 'green';
      quality = 'excellent';
      message = `+${roundedPercentage}% vs ${dataset}`;
    } else if (percentageDiff >= -10) {
      // User's value is 0.01% to 10% worse than standard
      color = 'yellow';
      quality = 'good';
      message = `${roundedPercentage}% vs ${dataset}`;
    } else if (percentageDiff >= -20) {
      // User's value is 10.01% to 20% worse than standard
      color = 'red';
      quality = 'poor';
      message = `${roundedPercentage}% vs ${dataset}`;
    } else {
      // User's value is more than 20% worse than standard
      color = 'red';
      quality = 'critical';
      message = `${roundedPercentage}% vs ${dataset}`;
    }
  }
  
  return {
    color,
    quality,
    message,
    actual,
    standard,
    dataset,
    percentageDiff: roundedPercentage,
    difference: Math.round((actual - standard) * 10) / 10
  };
};

/**
 * Analyze side dispersion as a percentage of total distance
 * @param {number} sideDispersion - Side dispersion in yards
 * @param {number} totalDistance - Total distance in yards
 * @returns {Object} - Color analysis with quality, color, and message
 */
export const analyzeSideDispersion = (sideDispersion, totalDistance) => {
  if (!totalDistance || totalDistance === 0) {
    return { quality: 'unknown', color: 'gray', message: 'No distance data' };
  }

  const percentage = (Math.abs(sideDispersion) / totalDistance) * 100;
  
  if (percentage <= 10) {
    return { quality: 'excellent', color: 'green', message: 'Excellent accuracy (≤10% of distance)' };
  } else if (percentage <= 20) {
    return { quality: 'good', color: 'yellow', message: 'Good accuracy (≤20% of distance)' };
  } else {
    return { quality: 'poor', color: 'red', message: 'Needs improvement (>20% of distance)' };
  }
};

// --- PGA TOUR STANDARDS ---
const PGA_TOUR_STANDARDS = {
  'DR': { avg: 275 }, '3W': { avg: 243 }, '5W': { avg: 230 },
  'H3': { avg: 225 }, 'H4': { avg: 215 }, 'H5': { avg: 205 },
  '4I': { avg: 203 }, '5I': { avg: 194 }, '6I': { avg: 185 },
  '7I': { avg: 172 }, '8I': { avg: 160 }, '9I': { avg: 148 },
  'PW': { avg: 136 }, 'GW': { avg: 120 }, 'SW': { avg: 100 }, 'LW': { avg: 85 },
};

// --- NEW: 0 HANDICAP STANDARDS ---
const ZERO_HCP_STANDARDS = {
  'DR': { avg: 255 }, '3W': { avg: 225 }, '5W': { avg: 210 },
  'H3': { avg: 205 }, 'H4': { avg: 195 },
  '4I': { avg: 190 }, '5I': { avg: 180 }, '6I': { avg: 170 },
  '7I': { avg: 160 }, '8I': { avg: 150 }, '9I': { avg: 140 },
  'PW': { avg: 128 }, 'GW': { avg: 115 }, 'SW': { avg: 95 }, 'LW': { avg: 80 },
};

// --- NEW: 10 HANDICAP STANDARDS ---
const TEN_HCP_STANDARDS = {
  'DR': { avg: 230 }, '3W': { avg: 205 }, '5W': { avg: 190 },
  'H4': { avg: 180 },
  '4I': { avg: 175 }, '5I': { avg: 165 }, '6I': { avg: 155 },
  '7I': { avg: 145 }, '8I': { avg: 135 }, '9I': { avg: 125 },
  'PW': { avg: 115 }, 'GW': { avg: 100 }, 'SW': { avg: 85 }, 'LW': { avg: 70 },
};

// --- NEW: 20 HANDICAP STANDARDS ---
const TWENTY_HCP_STANDARDS = {
  'DR': { avg: 205 }, '3W': { avg: 185 }, '5W': { avg: 170 },
  'H4': { avg: 160 },
  '5I': { avg: 150 }, '6I': { avg: 140 }, '7I': { avg: 130 },
  '8I': { avg: 120 }, '9I': { avg: 110 },
  'PW': { avg: 100 }, 'GW': { avg: 85 }, 'SW': { avg: 70 },
};

// --- Main Exported Datasets Object ---
export const COMPARISON_DATASETS = {
  'pga_tour': { name: 'PGA Tour', data: PGA_TOUR_STANDARDS },
  'zero_hcp': { name: '0 Handicap', data: ZERO_HCP_STANDARDS },
  'ten_hcp': { name: '10 Handicap', data: TEN_HCP_STANDARDS },
  'twenty_hcp': { name: '20 Handicap', data: TWENTY_HCP_STANDARDS },
};

// Gap Analysis Standards (based on PGA Tour data)
const GAP_STANDARDS = {
  // Optimal gap corridors by club type
  wedges: { optimal: [8, 12], caution: [5, 7, 13, 16], issue: [0, 4, 17, 25] },
  irons: { optimal: [10, 14], caution: [7, 9, 15, 18], issue: [0, 6, 19, 25] },
  hybrids: { optimal: [12, 18], caution: [8, 11, 19, 22], issue: [0, 7, 23, 30] },
  woods: { optimal: [18, 25], caution: [15, 17, 26, 30], issue: [0, 14, 31, 40] },
  driver: { optimal: [0, 0], caution: [0, 0], issue: [0, 0] } // Driver is end point
};

/**
 * Get optimal gap range for a specific club type
 * @param {string} club - Club name
 * @returns {Object} - Optimal gap standards for that club type
 */
export const getGapStandards = (club) => {
  const normalizedClub = club.trim().toUpperCase();
  
  if (['LW', 'SW', 'GW', 'PW'].includes(normalizedClub)) {
    return GAP_STANDARDS.wedges;
  } else if (/^\dI$/.test(normalizedClub)) {
    return GAP_STANDARDS.irons;
  } else if (/^H\d$/.test(normalizedClub)) {
    return GAP_STANDARDS.hybrids;
  } else if (/^\dW$/.test(normalizedClub)) {
    return GAP_STANDARDS.woods;
  } else if (normalizedClub === 'DR') {
    return GAP_STANDARDS.driver;
  }
  
  // Default to iron standards for unknown clubs
  return GAP_STANDARDS.irons;
};

/**
 * Analyze gap quality based on PGA Tour standards
 * @param {number} gap - Gap distance in yards
 * @param {string} fromClub - Club name (for determining standards)
 * @returns {Object} - Gap quality analysis
 */
export const analyzeGapQuality = (gap, fromClub) => {
  const standards = getGapStandards(fromClub);
  
  if (gap >= standards.optimal[0] && gap <= standards.optimal[1]) {
    return { quality: 'optimal', color: 'green', message: 'PGA Tour standard gap' };
  } else if ((gap >= standards.caution[0] && gap <= standards.caution[1]) || 
             (gap >= standards.caution[2] && gap <= standards.caution[3])) {
    return { quality: 'caution', color: 'yellow', message: 'Slightly off optimal range' };
  } else {
    return { quality: 'issue', color: 'red', message: 'Significant gap issue' };
  }
};

/**
 * Get reference distance for a club from specified dataset
 * @param {string} club - Club name
 * @param {string} dataset - Dataset key ('pga_tour', 'zero_hcp', 'fifteen_hcp')
 * @returns {Object} - Reference distance data
 */
export const getReference = (club, dataset = 'pga_tour') => {
  const normalizedClub = normalizeClubName(club);
  const datasetData = COMPARISON_DATASETS[dataset]?.data || PGA_TOUR_STANDARDS;
  return datasetData[normalizedClub] || null;
};

/**
 * Get reference distance for a club using user's preferred dataset
 * @param {string} club - Club name
 * @returns {Object} - Reference distance data
 */
export const getPGAReference = (club) => {
  // Import here to avoid circular dependencies
  const { getPreferredDataset } = require('./userPreferences');
  const preferredDataset = getPreferredDataset();
  return getReference(club, preferredDataset);
};

const CLUB_ORDER = [
  'LW', 'SW', 'GW', 'PW', // Wedges
  '9I', '8I', '7I', '6I', '5I', '4I', // Irons
  'H3', 'H4', 'H5', 'H6', // Hybrids
  '5W', '3W', // Woods
  'DR' // Driver
];

// Create a map for quick lookup (all uppercase)
const CLUB_ORDER_MAP = CLUB_ORDER.reduce((acc, club, index) => {
  acc[club.toUpperCase()] = index;
  return acc;
}, {});

/**
 * Count clubs in a bag and provide feedback on composition
 * @param {Array} clubs - Array of club names
 * @returns {Object} - Bag analysis with counts and recommendations
 */
export const analyzeBag = (clubs) => {
  if (!clubs || clubs.length === 0) {
    return {
      totalClubs: 0,
      bagStatus: 'empty',
      message: 'No clubs in bag',
      recommendations: ['Add clubs to start analyzing your bag composition']
    };
  }

  const totalClubs = clubs.length;
  const maxClubs = 13; // 14 total - 1 putter
  const isOverLimit = totalClubs > maxClubs;

  // Categorize clubs
  const wedges = clubs.filter(club => ['LW', 'SW', 'GW', 'PW'].includes(club.toUpperCase()));
  const irons = clubs.filter(club => {
    const normalized = club.toUpperCase().replace(/[-\s]/g, '');
    // Match 4I, 5I, 6I, 7I, 8I, 9I, I4, I5, I6, I7, I8, I9
    return (/^\dI$/.test(normalized) || /^I\d$/.test(normalized) ||
            /^\dIRON$/.test(normalized) || /^I\dIRON$/.test(normalized) ||
            /^\d-IRON$/.test(normalized) || /^I\d-IRON$/.test(normalized) ||
            /^\d IRON$/.test(normalized) || /^I\d IRON$/.test(normalized));
  });
  const hybrids = clubs.filter(club => /^H\d$/.test(club.toUpperCase()));
  const woods = clubs.filter(club => /^\dW$/.test(club.toUpperCase()));
  const drivers = clubs.filter(club => /^DR$/.test(club.toUpperCase()));

  let bagStatus = 'good';
  let message = '';
  let recommendations = [];

  if (isOverLimit) {
    bagStatus = 'over_limit';
    message = `Bag has ${totalClubs} clubs (max 13 + 1 putter = 14 total)`;
    recommendations.push('Consider removing some clubs to stay within PGA rules');
  } else if (totalClubs === maxClubs) {
    bagStatus = 'full';
    message = `Bag is full (${totalClubs}/13 clubs + 1 putter)`;
  } else {
    bagStatus = 'good';
    message = `Bag has ${totalClubs}/13 clubs + 1 putter`;
  }

  // Provide composition recommendations based on PGA Tour standards
  if (wedges.length < 2) {
    recommendations.push('PGA Tour players typically carry 3-4 wedges for short game precision');
  }
  if (wedges.length > 4) {
    recommendations.push('Many wedges - ensure you have consistent 8-12 yard gaps');
  }

  if (irons.length < 4) {
    recommendations.push('Few irons - PGA Tour players carry 5-7 irons for distance control');
  }
  if (irons.length > 7) {
    recommendations.push('Many irons - consider hybrids for easier long iron shots');
  }

  if (hybrids.length === 0 && irons.length > 5) {
    recommendations.push('PGA Tour players often use hybrids for 3-4 iron replacement');
  }

  if (woods.length === 0 && drivers.length === 0) {
    recommendations.push('Add woods/driver for longer shots - essential for scoring');
  }

  return {
    totalClubs,
    bagStatus,
    message,
    recommendations,
    composition: {
      wedges: wedges.length,
      irons: irons.length,
      hybrids: hybrids.length,
      woods: woods.length,
      drivers: drivers.length
    }
  };
};

/**
 * Analyze distance gaps between clubs in a bag using PGA Tour standards
 * @param {Array} clubData - Array of objects with club name and average distance
 * @returns {Object} - Gap analysis with recommendations
 */
export const analyzeGaps = (clubData) => {
  if (!clubData || clubData.length < 2) {
    return {
      gaps: [],
      recommendations: ['Need at least 2 clubs to analyze gaps'],
      averageGap: 0,
      hasLargeGaps: false,
      hasSmallGaps: false
    };
  }

  // Sort clubs by distance (shortest to longest)
  const sortedClubs = [...clubData].sort((a, b) => {
    const distA = a.avgDistance || a.avg || 0;
    const distB = b.avgDistance || b.avg || 0;
    return distA - distB;
  });

  const gaps = [];
  const largeGaps = [];
  const smallGaps = [];
  let totalGap = 0;

  // Calculate gaps between consecutive clubs
  for (let i = 0; i < sortedClubs.length - 1; i++) {
    const currentClub = sortedClubs[i];
    const nextClub = sortedClubs[i + 1];
    const currentDist = currentClub.avgDistance || currentClub.avg || 0;
    const nextDist = nextClub.avgDistance || nextClub.avg || 0;
    const gap = nextDist - currentDist;

    // Analyze gap quality using PGA Tour standards
    const gapQuality = analyzeGapQuality(gap, currentClub.club);
    const pgaReference = getPGAReference(currentClub.club);

    gaps.push({
      from: currentClub.club,
      to: nextClub.club,
      fromDistance: currentDist,
      toDistance: nextDist,
      gap: gap,
      quality: gapQuality.quality,
      color: gapQuality.color,
      message: gapQuality.message,
      pgaReference: pgaReference,
      isLarge: gap > 25, // Legacy support
      isSmall: gap < 8   // Legacy support
    });

    totalGap += gap;

    if (gapQuality.quality === 'issue') {
      // Skip driver gap recommendations as they're most common
      const isDriverGap = nextClub.club === 'DR' || currentClub.club === 'DR';
      
      if (!isDriverGap) {
        const recommendation = gap > 25 
          ? `Large gap: Consider adding a club between ${currentClub.club} (${formatYards(currentDist)}) and ${nextClub.club} (${formatYards(nextDist)})`
          : `${currentClub.club} and ${nextClub.club} gap is small, consider bending ${currentClub.club} weak`;
        
        if (gap > 25) {
          largeGaps.push({
            from: currentClub.club,
            to: nextClub.club,
            gap: gap,
            recommendation: recommendation
          });
        } else {
          smallGaps.push({
            from: currentClub.club,
            to: nextClub.club,
            gap: gap,
            recommendation: recommendation
          });
        }
      }
    }
  }

  const averageGap = totalGap / gaps.length;
  const recommendations = [];

  // Generate recommendations based on PGA Tour standards
  if (largeGaps.length > 0) {
    largeGaps.forEach(gap => {
      recommendations.push(gap.recommendation);
    });
  }

  if (smallGaps.length > 0) {
    smallGaps.forEach(gap => {
      recommendations.push(gap.recommendation);
    });
  }

  if (largeGaps.length === 0 && smallGaps.length === 0) {
    recommendations.push('Excellent gap distribution - matches PGA Tour standards');
  }

  return {
    gaps,
    largeGaps,
    smallGaps,
    averageGap: Math.round(averageGap * 10) / 10,
    hasLargeGaps: largeGaps.length > 0,
    hasSmallGaps: smallGaps.length > 0,
    recommendations,
    clubCount: sortedClubs.length,
    distanceRange: {
          shortest: sortedClubs[0]?.club || 'Unknown',
    longest: sortedClubs[sortedClubs.length - 1]?.club || 'Unknown',
    range: Math.round((sortedClubs[sortedClubs.length - 1]?.avgDistance || sortedClubs[sortedClubs.length - 1]?.avg || 0) -
      (sortedClubs[0]?.avgDistance || sortedClubs[0]?.avg || 0))
    },
    pgaComparison: {
      averageGap: 12, // Average gap on PGA Tour
      difference: Math.round((averageGap - 12) * 10) / 10
    }
  };
};

function getHybridOrder(club) {
  // Extract number from H3, H4, H5, H6, etc.
  const match = club.match(/^H(\d)$/i);
  if (match) {
    // Place hybrids after irons, before woods, sorted by number
    // Find the index of 4I (last iron), insert after that
    const baseIndex = CLUB_ORDER.findIndex(c => c.toUpperCase() === '4I');
    // Offset by hybrid number (e.g., H3 -> 1, H4 -> 2, H5 -> 3, H6 -> 4, etc.)
    return baseIndex + 1 + parseInt(match[1], 10);
  }
  return null;
}

/**
 * Get the order index for a club
 * @param {string} club - The club name
 * @returns {number} - The order index (lower = higher priority)
 */
export const getClubOrder = (club) => {
  if (!club) return 999; // Unknown clubs go to the end
  // Ensure club is a string before trimming
  let normalizedClub = String(club).trim().toUpperCase();

  // Map I6, I7, etc. to 6I, 7I, etc.
  if (/^I\d$/.test(normalizedClub)) {
    normalizedClub = normalizedClub[1] + 'I';
  }
  // Map W3, W5 to 3W, 5W
  if (/^W\d$/.test(normalizedClub)) {
    normalizedClub = normalizedClub[1] + 'W';
  }
  // Map H3, H4, etc. to hybrids
  if (/^H\d$/.test(normalizedClub)) {
    // Will be handled below
  }
  
  // Check exact match first (all uppercase)
  if (CLUB_ORDER_MAP[normalizedClub] !== undefined) {
    return CLUB_ORDER_MAP[normalizedClub];
  }
  
  // Handle hybrids (H3, H4, etc.)
  if (/^H\d$/.test(normalizedClub)) {
    const hybridOrder = getHybridOrder(normalizedClub);
    if (hybridOrder !== null) return hybridOrder;
  }

  // Handle common variations (all uppercase)
  const clubVariations = {
    'DRIVER': 'DR',
    'DR': 'DR',
    'D': 'DR',
    '3 WOOD': '3W',
    '3W': '3W',
    '3 WOODS': '3W',
    '5 WOOD': '5W',
    '5W': '5W',
    '5 WOODS': '5W',
    '4 IRON': '4I',
    '4I': '4I',
    '4 IRONS': '4I',
    '5 IRON': '5I',
    '5I': '5I',
    '5 IRONS': '5I',
    '6 IRON': '6I',
    '6I': '6I',
    '6 IRONS': '6I',
    '7 IRON': '7I',
    '7I': '7I',
    '7 IRONS': '7I',
    '8 IRON': '8I',
    '8I': '8I',
    '8 IRONS': '8I',
    '9 IRON': '9I',
    '9I': '9I',
    '9 IRONS': '9I',
    'PITCHING WEDGE': 'PW',
    'PITCHING': 'PW',
    'GAP WEDGE': 'GW',
    'GAP': 'GW',
    'SAND WEDGE': 'SW',
    'SAND': 'SW',
    'LOB WEDGE': 'LW',
    'LOB': 'LW'
  };
  
  // Check for variations
  if (clubVariations[normalizedClub]) {
    const mappedClub = clubVariations[normalizedClub];
    return CLUB_ORDER_MAP[mappedClub] !== undefined ? CLUB_ORDER_MAP[mappedClub] : 999;
  }
  
  // Check for partial matches (e.g., "9 Iron" should match "9I")
  for (let i = 0; i < CLUB_ORDER.length; i++) {
    const orderedClub = CLUB_ORDER[i].toUpperCase();
    if (normalizedClub.includes(orderedClub) || orderedClub.includes(normalizedClub)) {
      return i;
    }
  }
  
  // If no match found, put it at the end
  return 999;
};

/**
 * Sort an array of clubs according to the golf club order
 * @param {Array} clubs - Array of club names
 * @returns {Array} - Sorted array of clubs
 */
export const sortClubs = (clubs) => {
  return [...clubs].sort((a, b) => {
    const orderA = getClubOrder(a);
    const orderB = getClubOrder(b);
    return orderA - orderB;
  });
};

/**
 * Sort an array of objects that have a 'club' property
 * @param {Array} data - Array of objects with club property
 * @returns {Array} - Sorted array
 */
export const sortDataByClub = (data) => {
  return [...data].sort((a, b) => {
    const orderA = getClubOrder(a.club);
    const orderB = getClubOrder(b.club);
    return orderA - orderB;
  });
};

/**
 * Normalize a club name to a standard string (e.g., 7, "7", "7-iron", "7 Iron" → "7I")
 * @param {string|number} input
 * @returns {string}
 */
export function normalizeClubName(input) {
  if (typeof input === 'number') input = String(input);
  if (!input) return 'UNKNOWN';
  let str = String(input).trim().toUpperCase();
  str = str.replace(/[-_\s]/g, '');
  // Convert 'I4', 'I5', etc. to '4I', '5I', etc.
  str = str.replace(/^I(\d)$/, '$1I');
  // Convert '7IRON' or '7IRON' to '7I'
  str = str.replace(/^(\d+)IRON$/, '$1I');
  // Convert '7' to '7I' if it's just a number
  if (/^\d$/.test(str)) str = str + 'I';
  // Known club aliases
  const aliases = {
    'DRIVER': 'DR', 'D': 'DR',
    '3WOOD': '3W', '5WOOD': '5W', 'W3': '3W', 'W5': '5W',
    'PITCHINGWEDGE': 'PW', 'GAPWEDGE': 'GW', 'SANDWEDGE': 'SW', 'LOBWEDGE': 'LW',
    'PITCHING': 'PW', 'GAP': 'GW', 'SAND': 'SW', 'LOB': 'LW',
  };
  if (aliases[str]) return aliases[str];
  return str;
}

/**
 * Parse a value as a number, fallback to 0 if invalid
 * @param {any} input
 * @param {number} fallback
 * @returns {number}
 */
export function parseNumber(input, fallback = 0) {
  const n = parseFloat(input);
  return isNaN(n) ? fallback : n;
}

const clubOrdering = {
  CLUB_ORDER,
  getClubOrder,
  sortClubs,
  sortDataByClub,
  analyzeBag,
  analyzeGaps,
  getGapStandards,
  analyzeGapQuality,
  getPGAReference,
  getReference,
  PGA_TOUR_STANDARDS,
  GAP_STANDARDS,
  COMPARISON_DATASETS,
  // New standardized color system
  COLOR_THRESHOLDS,
  getStandardizedColor,
  getColorClass,
  analyzePerformance
};

export default clubOrdering; 