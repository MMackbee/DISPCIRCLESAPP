// src/ClubsOverview.js

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import Spinner from './Spinner';
import { getClubOrder, sortClubs, normalizeClubName, parseNumber, formatYards, formatInteger, formatAngle, formatSpeedWithUnit, formatHeightWithUnit, formatDistanceWithUnit, analyzeBag, analyzeGaps, getStandardizedColor, getColorClass, analyzePerformance, getReference, COMPARISON_DATASETS, analyzeSideDispersion } from './clubOrdering';
import { useUserPreferences } from './UserPreferencesContext';
import { useComparison } from './ComparisonContext';
import { fitEllipse } from './dispersionUtils';
import Tooltip from './components/Tooltip';

// Enhanced color palette for golf clubs (matching SessionView)
const clubColors = {
  'LW': '#FF6B6B', // Red
  'SW': '#4ECDC4', // Teal
  'GW': '#45B7D1', // Blue
  'PW': '#96CEB4', // Green
  '9i': '#FFEAA7', // Yellow
  '8i': '#DDA0DD', // Plum
  '7i': '#98D8C8', // Mint
  '6i': '#F7DC6F', // Gold
  '5i': '#BB8FCE', // Lavender
  '4i': '#85C1E9', // Sky Blue
  '5w': '#F8C471', // Orange
  '3w': '#82E0AA', // Light Green
  'Dr': '#E74C3C', // Dark Red
};

// Generate distinct color for each club (fallback)
const colorCache = new Map();

const generateColor = (str) => {
  // Check cache first
  if (colorCache.has(str)) {
    return colorCache.get(str);
  }
  
  // Check if we have a predefined color
  if (clubColors[str]) {
    colorCache.set(str, clubColors[str]);
    return clubColors[str];
  }
  
  // Fallback to hash-based color generation
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    let value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  
  // Cache the result
  colorCache.set(str, color);
  return color;
};



// --- Reusable Chart Component for Distance Visualization ---
const DistanceChart = ({ data, dataKey, title }) => {
  const { preferences } = useUserPreferences();
  // Vertical chart: Y-axis is distance, X-axis is clubs
  const svgWidth = 600;
  const svgHeight = 400;
  const margin = { top: 20, right: 30, bottom: 60, left: 60 };
  const width = svgWidth - margin.left - margin.right;
  const height = svgHeight - margin.top - margin.bottom;

  const maxDist = Math.max(...data.map(d => d.stats[dataKey]?.max || 0), 100);
  const minDist = Math.min(...data.map(d => d.stats[dataKey]?.min || 0), 0);

  // Y-scale: distance (bottom to top)
  const yScale = (value) => height - ((value - minDist) / (maxDist - minDist)) * height;
  // X-scale: band scale for clubs (no sorting)
  const xScale = (index) => (index / (data.length - 1)) * width;

  return (
    <div className="chunky-card">
      <h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3>
      <svg width="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Y-axis (distance) */}
          <line x1="0" y1="0" x2="0" y2={height} stroke="#4A5568" />
          {/* Y-axis labels */}
          {[0, 25, 50, 75, 100].map(percent => {
            const value = minDist + (percent / 100) * (maxDist - minDist);
            const y = yScale(value);
            return (
              <g key={percent}>
                <line x1="-5" y1={y} x2="0" y2={y} stroke="#4A5568" />
                <text x="-10" y={y + 4} fill="white" fontSize="12" textAnchor="end" className="font-sans font-medium">
                  {formatDistanceWithUnit(value, preferences.distanceUnit)}
                </text>
              </g>
            );
          })}
          {/* Chart Bars */}
          {data.map((d, i) => {
            const stats = d.stats[dataKey];
            if (!stats || stats.avg === undefined) return null;
            const clubColor = generateColor(d.club);
            const x = xScale(i);
            const yMin = yScale(stats.min);
            const yMax = yScale(stats.max);
            const yAvg = yScale(stats.avg);
            return (
              <g key={i}>
                {/* Min-Max Range Rectangle */}
                <rect
                  x={x - 15}
                  y={yMax}
                  width="30"
                  height={yMin - yMax}
                  fill={clubColor}
                  opacity="0.3"
                  stroke={clubColor}
                  strokeWidth="1"
                />
                {/* Average Line */}
                <line
                  x1={x - 15}
                  y1={yAvg}
                  x2={x + 15}
                  y2={yAvg}
                  stroke={clubColor}
                  strokeWidth="3"
                />
                {/* Club Label */}
                <text x={x} y={height + 20} fill="white" fontSize="12" textAnchor="middle">
                  {d.club}
                </text>
                {/* Average Value Label */}
                <text x={x} y={yAvg - 5} fill="white" fontSize="10" textAnchor="middle" className="font-sans font-bold">
                  {formatYards(stats.avg)}
                </text>
              </g>
            );
          })}
          {/* X-axis line */}
          <line x1="0" y1={height} x2={width} y2={height} stroke="#4A5568" />
        </g>
      </svg>
    </div>
  );
};


// --- Main Page Component ---
const ClubsOverview = ({ user }) => {

  const { selectedDataset } = useComparison();
  const { preferences } = useUserPreferences();
  const [allShots, setAllShots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visibleColumns, setVisibleColumns] = useState({
    side: true,
    ball_speed: true,
    club_speed: true,
    vla: true,
    peak_height: true,
    descent_angle: true,
    spin_rate: true
  });
  const [showColumnCustomizer, setShowColumnCustomizer] = useState(false);
  const [selectedClubs, setSelectedClubs] = useState({});
  const [showEllipse, setShowEllipse] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [filterOutliers, setFilterOutliers] = useState(false);

  // --- Available clubs in this session ---
  const availableClubs = useMemo(() => {
    const clubs = Array.from(new Set(allShots.map(s => normalizeClubName(s.club || 'Unknown'))));
    return sortClubs(clubs);
  }, [allShots]);

  // --- Scatter Plot Dimensions and Utility Functions ---
  const svgWidth = 600;
  const svgHeight = 400;
  const padding = 60; // was 40, now 60 for more space on the left
  // Fixed axis ranges
  const minX = -50;
  const maxX = 50;
  const minY = 0;
  const maxY = 375;
  // X: -50 to 50, Y: 0 to 375
  const getX = useCallback((side) => ((side - minX) / (maxX - minX)) * (svgWidth - 2 * padding) + padding, [svgWidth, padding, minX, maxX]);
  const getY = useCallback((carry) => svgHeight - padding - ((carry - minY) / (maxY - minY)) * (svgHeight - 2 * padding), [svgHeight, padding, minY, maxY]);

  // --- Filtered Shots by Club Selection ---
  const filteredShots = useMemo(() => {
    if (!allShots.length) return [];
    const clubs = Object.keys(selectedClubs).length ? selectedClubs : Object.fromEntries(availableClubs.map(c => [c, true]));
    let shots = allShots.filter(shot => clubs[normalizeClubName(shot.club || 'Unknown')]);
    
    // Filter out outliers if checkbox is checked
    if (filterOutliers) {
      shots = shots.filter(shot => !shot.isOutlier);
    }
    
    return shots;
  }, [allShots, selectedClubs, availableClubs, filterOutliers]);

  // --- Dispersion Ellipse Calculation (per club) ---
  const clubEllipses = useMemo(() => {
    if (!showEllipse) return [];
    // Group filtered shots by club
    const clubGroups = filteredShots.reduce((acc, shot) => {
      const club = normalizeClubName(shot.club || 'Unknown');
      if (!acc[club]) acc[club] = [];
      acc[club].push(shot);
      return acc;
    }, {});
    // For each club with 3+ shots, fit an ellipse
    return Object.entries(clubGroups).map(([club, shots]) => {
      if (shots.length < 3) return null;
      // Get points in [x, y] format
      const points = shots.map(shot => [
        getX(parseNumber(shot.side_total !== undefined && shot.side_total !== null ? shot.side_total : shot.side)),
        getY(parseNumber(shot.carry_distance))
      ]);
      
      // Add error handling for fitEllipse
      let ellipse;
      try {
        ellipse = fitEllipse(points);
      } catch (error) {
        console.warn(`Failed to fit ellipse for club ${club}:`, error);
        return null;
      }
      
      if (!ellipse) return null;
      return {
        club,
        ellipse,
        color: generateColor(club)
      };
    }).filter(Boolean);
  }, [filteredShots, showEllipse, getX, getY]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const q = query(collection(db, 'userData'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const shots = querySnapshot.docs.map(doc => doc.data());
      setAllShots(shots);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // useMemo will re-calculate only when allShots changes
  const aggregatedData = useMemo(() => {
    if (allShots.length === 0) return [];

    const clubGroups = allShots.reduce((acc, shot) => {
      const club = normalizeClubName(shot.club || 'Unknown');
      if (!acc[club]) {
        acc[club] = [];
      }
      acc[club].push(shot);
      return acc;
    }, {});

    return Object.entries(clubGroups).map(([club, shots]) => {
            const getStats = (arr) => {
        if(arr.length === 0) return { avg: 0, min: 0, max: 0 };
        const numericArr = arr.map(v => parseFloat(v)).filter(v => !isNaN(v));
        if(numericArr.length === 0) return { avg: 0, min: 0, max: 0 };
        return {
          avg: numericArr.reduce((a, b) => a + b, 0) / numericArr.length,
          min: Math.min(...numericArr),
          max: Math.max(...numericArr),
        };
      };

      // Fix: parseFloat and filter out NaN/zero for spin rate
      let spinRateValues = shots.map(s => parseFloat(s.spin_rate || s.spinrate || s.spin_rate_value)).filter(v => !isNaN(v) && v !== 0);

      return {
        club,
        shotCount: shots.length,
        stats: {
          carry: getStats(shots.map(s => s.carry_distance)),
          total: getStats(shots.map(s => s.total_distance)),
          side: getStats(shots.map(s => (s.side_total !== undefined && s.side_total !== null) ? s.side_total : s.side)),
          ball_speed: getStats(shots.map(s => s.ball_speed)),
          club_speed: getStats(shots.map(s => s.club_speed)),
          vla: getStats(shots.map(s => s.vla)),
          peak_height: getStats(shots.map(s => s.peak_height)),
          descent_angle: getStats(shots.map(s => s.descent_angle)),
          spin_rate: getStats(spinRateValues),
        },
      };
    }).sort((a,b) => {
      const orderA = getClubOrder(a.club);
      const orderB = getClubOrder(b.club);
      return orderA - orderB;
    }); // Sort by golf club order
  }, [allShots]);

  // Bag analysis
  const bagAnalysis = useMemo(() => {
    const clubs = aggregatedData.map(item => item.club);
    window._debugClubs = clubs; // Also expose for console if needed
    return analyzeBag(clubs);
  }, [aggregatedData]);

    // Gap analysis
  const gapAnalysis = useMemo(() => {
    const clubDataWithDistance = aggregatedData.map(item => ({
      club: item.club,
      avgDistance: item.stats.total.avg || item.stats.carry.avg
    }));
    return analyzeGaps(clubDataWithDistance);
  }, [aggregatedData]);

  // Ensure selectedClubs always includes all available clubs
  useEffect(() => {
    if (availableClubs.length) {
      setSelectedClubs(prev => {
        const updated = { ...prev };
        let changed = false;
        availableClubs.forEach(club => {
          if (!(club in updated)) {
            updated[club] = true;
            changed = true;
          }
        });
        // Remove clubs that are no longer available
        Object.keys(updated).forEach(club => {
          if (!availableClubs.includes(club)) {
            delete updated[club];
            changed = true;
          }
        });
        return changed ? updated : prev;
      });
    }
  }, [availableClubs]);

  if (loading) {
    return <Spinner message="Analyzing all your sessions..." />;
  }

  return (
    <div className="p-6 lg:p-12 animate-fade-in">
      {/* Neo-Brutalism Header */}
      <div className="mb-12">
        <div className="chunky-card bg-gradient-to-r from-cyan-500 to-blue-600">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
                🏌️‍♂️ CLUBS OVERVIEW
              </h1>
              <p className="text-white/90 text-lg font-medium">
                Analyze Your Club Performance
              </p>
            </div>
            <div className="text-6xl">
              ⛳
            </div>
          </div>
        </div>
      </div>

      {aggregatedData.length === 0 ? (
        <p className="text-gray-600 text-lg">No data available. Please upload a session to see your stats.</p>
      ) : (
        <div>
          {/* Bag Analysis Section */}
          <div className="chunky-card mb-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Bag Analysis</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-3 ${
                  bagAnalysis.bagStatus === 'over_limit' ? 'bg-red-100 text-red-800' :
                  bagAnalysis.bagStatus === 'full' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {bagAnalysis.message}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Wedges:</span>
                    <span className="text-gray-800 font-semibold">{formatInteger(bagAnalysis.composition?.wedges)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Irons:</span>
                    <span className="text-gray-800 font-semibold">{formatInteger(bagAnalysis.composition?.irons)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Hybrids:</span>
                    <span className="text-gray-800 font-semibold">{formatInteger(bagAnalysis.composition?.hybrids)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Woods:</span>
                    <span className="text-gray-800 font-semibold">{formatInteger(bagAnalysis.composition?.woods)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Drivers:</span>
                    <span className="text-gray-800 font-semibold">{formatInteger(bagAnalysis.composition?.drivers)}</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Recommendations</h3>
                <ul className="space-y-2">
                  {bagAnalysis.recommendations?.map((rec, index) => (
                    <li key={index} className="text-sm flex items-start">
                      <span className="font-sans text-orange-600">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Gap Analysis Section */}
          <div className="chunky-card">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Distance Gap Analysis ({COMPARISON_DATASETS[selectedDataset]?.name || 'PGA Tour'} Standards)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Your Average Gap:</span>
                    <span className={`text-lg font-bold ${getColorClass(
                      getStandardizedColor(gapAnalysis.averageGap, 12).color, 'text'
                    )}`}>
                      {formatYards(gapAnalysis.averageGap)} yards
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">PGA Tour Average:</span>
                    <span className="text-gray-800 font-semibold">
                      {formatYards(gapAnalysis.pgaComparison?.averageGap || 12)} yards
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Difference:</span>
                    <span className={`font-semibold ${getColorClass(
                      getStandardizedColor(Math.abs(gapAnalysis.pgaComparison?.difference || 0), 2).color, 'text'
                    )}`}>
                      {gapAnalysis.pgaComparison?.difference > 0 ? '+' : ''}{formatInteger(gapAnalysis.pgaComparison?.difference || 0)} yards
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-600">Distance Range:</span>
                    <span className="text-gray-800">
                      {formatYards(gapAnalysis.distanceRange?.shortest)} → {formatYards(gapAnalysis.distanceRange?.longest)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Optimizations:</span>
                    <span className={`font-semibold ${gapAnalysis.hasLargeGaps || gapAnalysis.hasSmallGaps ? 'text-red-600' : 'text-green-600'}`}>
                      {formatInteger((gapAnalysis.largeGaps?.length || 0) + (gapAnalysis.smallGaps?.length || 0))}
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">PGA Tour Recommendations</h3>
                <ul className="space-y-2">
                  {gapAnalysis.recommendations?.map((rec, index) => (
                    <li key={index} className="text-sm flex items-start">
                      <span className="font-sans text-orange-600">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
              
              {/* Gap Details */}
              {gapAnalysis.gaps && gapAnalysis.gaps.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Gap Details (vs {COMPARISON_DATASETS[selectedDataset]?.name || 'PGA Tour'} Standards)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {gapAnalysis.gaps.map((gap, index) => {
                      const pgaRef = getReference(gap.from, selectedDataset);
                      const gapPerformance = analyzePerformance(gap.gap, 12, true); // 12 yards is optimal gap
                      
                      return (
                        <div key={index} className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                          <div className="text-sm font-medium text-gray-800">
                            {gap.from} → {gap.to}
                          </div>
                          <div className="text-xs text-gray-600">
                            {formatYards(gap.fromDistance)} → {formatYards(gap.toDistance)} yds
                          </div>
                          <div className={`text-sm font-bold ${getColorClass(gapPerformance.color, 'text')}`}>
                            Gap: {formatYards(gap.gap)} yds
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {gapPerformance.message}
                          </div>
                          {pgaRef && (
                            <div className="text-xs text-orange-600 mt-1 font-medium">
                              {COMPARISON_DATASETS[selectedDataset]?.name || 'PGA Tour'}: {formatYards(pgaRef.avg)}yds avg
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          
          

          {/* Enhanced Data Table */}
          <div className="chunky-card overflow-x-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Club Performance Data</h2>
              <div className="relative">
                <button
                  onClick={() => setShowColumnCustomizer(!showColumnCustomizer)}
                  className="chunky-button chunky-button-secondary"
                >
                  Customize Columns
                </button>
                
                {showColumnCustomizer && (
                  <div className="absolute right-0 top-full mt-2 chunky-card z-10 min-w-48">
                    <h3 className="text-gray-800 font-semibold mb-3">Toggle Columns</h3>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleColumns.side}
                          onChange={(e) => setVisibleColumns(prev => ({ ...prev, side: e.target.checked }))}
                          className="chunky-checkbox"
                        />
                        <span className="text-gray-700">Side Dispersion</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleColumns.ball_speed}
                          onChange={(e) => setVisibleColumns(prev => ({ ...prev, ball_speed: e.target.checked }))}
                          className="chunky-checkbox"
                        />
                        <span className="text-gray-700">Ball Speed</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleColumns.club_speed}
                          onChange={(e) => setVisibleColumns(prev => ({ ...prev, club_speed: e.target.checked }))}
                          className="chunky-checkbox"
                        />
                        <span className="text-gray-700">Club Speed</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleColumns.vla}
                          onChange={(e) => setVisibleColumns(prev => ({ ...prev, vla: e.target.checked }))}
                          className="chunky-checkbox"
                        />
                        <span className="text-gray-700">VLA (Launch Angle)</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleColumns.peak_height}
                          onChange={(e) => setVisibleColumns(prev => ({ ...prev, peak_height: e.target.checked }))}
                          className="chunky-checkbox"
                        />
                        <span className="text-gray-700">Peak Height</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleColumns.descent_angle}
                          onChange={(e) => setVisibleColumns(prev => ({ ...prev, descent_angle: e.target.checked }))}
                          className="chunky-checkbox"
                        />
                        <span className="text-gray-700">Descent Angle</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleColumns.spin_rate}
                          onChange={(e) => setVisibleColumns(prev => ({ ...prev, spin_rate: e.target.checked }))}
                          className="chunky-checkbox"
                        />
                        <span className="text-gray-700">Spin Rate</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <table className="chunky-table w-full text-left text-base font-medium">
              <thead>
                <tr>
                  <th>Club</th>
                  <th>Shots</th>
                  <th>Avg Total Dist.</th>
                  <th>Avg Carry Dist.</th>
                  {visibleColumns.side && <th>Avg Side</th>}
                  {visibleColumns.ball_speed && <th>Avg Ball Speed</th>}
                  {visibleColumns.club_speed && <th>Avg Club Speed</th>}
                  {visibleColumns.vla && <th>Avg VLA</th>}
                  {visibleColumns.peak_height && <th>Avg Peak Height</th>}
                  {visibleColumns.descent_angle && <th>Avg Descent</th>}
                  {visibleColumns.spin_rate && <th>Avg Spin Rate</th>}
                </tr>
              </thead>
              <tbody>
                {aggregatedData.map(({ club, shotCount, stats }) => {
                  const pgaRef = getReference(club, selectedDataset);
                  const distanceAnalysis = pgaRef ? analyzePerformance(stats.total.avg || stats.carry.avg, pgaRef.avg, false) : null;
                  const sideAnalysis = analyzeSideDispersion(stats.side.avg, stats.total.avg || stats.carry.avg);
                  
                  return (
                    <tr key={club} className="border-b border-gray-800 last:border-b-0 hover:bg-green-50/10 transition-colors rounded-xl cursor-pointer group">
                      <td className="p-3 font-bold flex items-center space-x-2">
                        <div
                          className="w-4 h-4 rounded-full shadow-md group-hover:scale-110 transition-transform duration-150"
                          style={{ backgroundColor: generateColor(club) }}
                        ></div>
                        <span className="text-white">{club}</span>
                      </td>
                      <td className="p-3 text-blue-300">{formatInteger(shotCount)}</td>
                      <td className={`p-3 ${distanceAnalysis ? getColorClass(distanceAnalysis.color, 'text') : 'text-green-300'}`}>
                          {formatDistanceWithUnit(stats.total.avg || stats.carry.avg, preferences.distanceUnit)}
                          {distanceAnalysis && (
                            <div className="text-xs text-yellow-400 font-medium">
                              {distanceAnalysis.percentageDiff}% vs {COMPARISON_DATASETS[selectedDataset]?.name || 'PGA Tour'}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-yellow-300">{formatDistanceWithUnit(stats.carry.avg, preferences.distanceUnit)}</td>
                        {visibleColumns.side && (
                          <td className={`p-3 ${getColorClass(sideAnalysis.color, 'text')}`}>
                            {formatDistanceWithUnit(stats.side.avg, preferences.distanceUnit)}
                          </td>
                        )}
                        {visibleColumns.ball_speed && (
                          <td className="p-3 text-green-300">{formatSpeedWithUnit(stats.ball_speed.avg, preferences.speedUnit)}</td>
                        )}
                        {visibleColumns.club_speed && (
                          <td className="p-3 text-green-300">{formatSpeedWithUnit(stats.club_speed.avg, preferences.speedUnit)}</td>
                        )}
                        {visibleColumns.vla && (
                          <td className="p-3 text-green-300">{formatAngle(stats.vla.avg)}</td>
                        )}
                        {visibleColumns.peak_height && (
                          <td className="p-3 text-green-300">{formatHeightWithUnit(stats.peak_height.avg, preferences.heightUnit)}</td>
                        )}
                        {visibleColumns.descent_angle && (
                          <td className="p-3 text-green-300">{formatAngle(stats.descent_angle.avg)}</td>
                        )}
                        {visibleColumns.spin_rate && (
                          <td className="p-3 text-yellow-300">{formatInteger(stats.spin_rate.avg)} rpm</td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <DistanceChart data={aggregatedData} dataKey="total" title="Total Distance Range" />
              <DistanceChart data={aggregatedData} dataKey="carry" title="Carry Distance Range" />
            </div>

            {/* Shot Scatter Plot with Dispersion Ellipse */}
            <div className="chunky-card mt-12">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Shot Scatter Plot</h3>
              {/* Club Selection Controls */}
              <div className="mb-4 flex flex-col md:flex-row md:flex-wrap md:items-center gap-2 md:gap-4">
                <div className="flex flex-wrap gap-2">
                  {availableClubs.map(club => (
                    <label key={club} className="flex items-center space-x-2 cursor-pointer p-2 rounded hover:bg-gray-100">
                      <input
                        type="checkbox"
                        checked={!!selectedClubs[club]}
                        onChange={() => setSelectedClubs(prev => ({ ...prev, [club]: !prev[club] }))}
                        className="chunky-checkbox"
                      />
                      <span className="text-sm text-gray-800">{club}</span>
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: generateColor(club) }}></div>
                    </label>
                  ))}
                </div>
                {/* Dispersion Ellipse Controls */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showEllipse"
                    checked={showEllipse}
                    onChange={(e) => setShowEllipse(e.target.checked)}
                    className="chunky-checkbox"
                  />
                  <Tooltip content="Show best-fit ellipses around each club's shot dispersion. Helps visualize consistency and accuracy.">
                    <label htmlFor="showEllipse" className="text-sm text-gray-600 cursor-pointer">
                      Show Dispersion Ellipse <span className="text-blue-600">ⓘ</span>
                    </label>
                  </Tooltip>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="filterOutliers"
                    checked={filterOutliers}
                    onChange={(e) => setFilterOutliers(e.target.checked)}
                    className="chunky-checkbox"
                  />
                  <Tooltip content="Filter out shots that are statistical outliers. This can help focus on your typical performance by removing unusual shots.">
                    <label htmlFor="filterOutliers" className="text-sm text-gray-600 cursor-pointer">
                      Filter Outliers <span className="text-blue-600">ⓘ</span>
                    </label>
                  </Tooltip>
                </div>

                <Tooltip content="Zoom in or out on the scatter plot to see more detail or get a broader view of your shot dispersion.">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-300">Zoom:</span>
                    <button
                      onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                      className="chunky-button chunky-button-secondary px-2 py-1 text-sm"
                      disabled={zoom <= 0.5}
                    >
                      -
                    </button>
                    <span className="text-sm text-gray-800 min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
                    <button
                      onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                      className="chunky-button chunky-button-secondary px-2 py-1 text-sm"
                      disabled={zoom >= 3}
                    >
                      +
                    </button>
                    <span className="text-blue-400">ⓘ</span>
                  </div>
                </Tooltip>
                {clubEllipses && clubEllipses.length > 0 && (
                  <div className="text-xs text-gray-600">
                    Best-fit ellipses shown for {clubEllipses.length} club{clubEllipses.length !== 1 ? 's' : ''}
                    {filterOutliers && (
                      <span className="ml-2">
                        ({filteredShots.length} of {allShots.length} shots shown)
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex justify-end mb-2 gap-2">
              </div>
              <div className="w-full flex justify-center items-center">
                <svg
                  width={svgWidth * zoom}
                  height={svgHeight * zoom}
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  style={{ transition: 'width 0.2s, height 0.2s' }}
                > 
                  {/* Center vertical line (0 side) */}
                  <line x1={svgWidth / 2} y1={padding} x2={svgWidth / 2} y2={svgHeight - padding} stroke="rgba(255,0,0,0.5)" strokeWidth="2" strokeDasharray="5,5" />
                  {/* X axis (ground line at y=0) */}
                  <line x1={padding} y1={svgHeight - padding} x2={svgWidth - padding} y2={svgHeight - padding} stroke="#aaa" strokeWidth="1" />
                  {/* Horizontal grid lines (carry yardage) */}
                  {[...Array(5)].map((_, i) => {
                    const yardage = (maxY / 5) * (i + 1);
                    const yPos = getY(yardage);
                    return (
                      <g key={i}>
                        <line x1={padding} y1={yPos} x2={svgWidth - padding} y2={yPos} stroke="rgba(255,255,255,0.1)" />
                        <text x={padding - 15} y={yPos + 4} fill="white" fontSize="12" textAnchor="end">
                          {Math.round(yardage)} yds
                        </text>
                      </g>
                    );
                  })}
                  {/* Dispersion Ellipses per club (now best-fit ellipses) */}
                  {showEllipse && clubEllipses && clubEllipses.length > 0 && clubEllipses.map((ellipseObj, idx) => (
                    <ellipse
                      key={ellipseObj.club}
                      cx={ellipseObj.ellipse.cx}
                      cy={ellipseObj.ellipse.cy}
                      rx={ellipseObj.ellipse.rx}
                      ry={ellipseObj.ellipse.ry}
                      transform={`rotate(${ellipseObj.ellipse.angle} ${ellipseObj.ellipse.cx} ${ellipseObj.ellipse.cy})`}
                      fill={ellipseObj.color.replace(')', ', 0.08)').replace('rgb', 'rgba')}
                      stroke={ellipseObj.color}
                      strokeWidth="2"
                    />
                  ))}
                  {/* Shot points with tooltip */}
                  {filteredShots.map((shot, i) => (
                    <g key={i}>
                      <circle
                        cx={getX(parseNumber(shot.side_total !== undefined && shot.side_total !== null ? shot.side_total : shot.side))}
                        cy={getY(parseNumber(shot.carry_distance))}
                        r={12 / zoom}
                        fill={generateColor(shot.club)}
                        stroke="#222"
                        strokeWidth={2 / zoom}
                        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.4))"
                      />
                      <text
                        x={getX(parseNumber(shot.side_total !== undefined && shot.side_total !== null ? shot.side_total : shot.side))}
                        y={getY(parseNumber(shot.carry_distance)) + 4 / zoom}
                        textAnchor="middle"
                        fontSize={13 / zoom}
                        fontWeight="bold"
                        fill="#fff"
                        style={{ pointerEvents: 'none', fontFamily: 'sans-serif', letterSpacing: '0.5px' }}
                      >
                        {shot.club}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>
  );
};

export default ClubsOverview;