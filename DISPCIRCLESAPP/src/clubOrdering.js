// Golf club ordering utility
// Order: LW, SW, GW, PW, 9i, 8i, 7i, 6i, 5i, 4i, 5w, 3w, Dr

const CLUB_ORDER = [
  'LW', 'SW', 'GW', 'PW', 
  '9i', '8i', '7i', '6i', '5i', '4i', 
  '5w', '3w', 'Dr'
];

// Create a map for quick lookup
const CLUB_ORDER_MAP = CLUB_ORDER.reduce((acc, club, index) => {
  acc[club] = index;
  return acc;
}, {});

/**
 * Get the order index for a club
 * @param {string} club - The club name
 * @returns {number} - The order index (lower = higher priority)
 */
export const getClubOrder = (club) => {
  if (!club) return 999; // Unknown clubs go to the end
  
  // Normalize the club name (remove spaces, convert to uppercase)
  const normalizedClub = club.trim().toUpperCase();
  
  // Check exact match first
  if (CLUB_ORDER_MAP[normalizedClub] !== undefined) {
    return CLUB_ORDER_MAP[normalizedClub];
  }
  
  // Handle common variations
  const clubVariations = {
    'DRIVER': 'Dr',
    'DR': 'Dr',
    'D': 'Dr',
    '3 WOOD': '3w',
    '3W': '3w',
    '3 WOODS': '3w',
    '5 WOOD': '5w',
    '5W': '5w',
    '5 WOODS': '5w',
    '4 IRON': '4i',
    '4I': '4i',
    '4 IRONS': '4i',
    '5 IRON': '5i',
    '5I': '5i',
    '5 IRONS': '5i',
    '6 IRON': '6i',
    '6I': '6i',
    '6 IRONS': '6i',
    '7 IRON': '7i',
    '7I': '7i',
    '7 IRONS': '7i',
    '8 IRON': '8i',
    '8I': '8i',
    '8 IRONS': '8i',
    '9 IRON': '9i',
    '9I': '9i',
    '9 IRONS': '9i',
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
  
  // Check for partial matches (e.g., "9 Iron" should match "9i")
  for (let i = 0; i < CLUB_ORDER.length; i++) {
    const orderedClub = CLUB_ORDER[i];
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

const clubOrdering = {
  CLUB_ORDER,
  getClubOrder,
  sortClubs,
  sortDataByClub
};

export default clubOrdering; 