import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams } from "react-router-dom";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
// Spinner import removed as it's no longer used
import { sortClubs, analyzeGaps, getStandardizedColor, getColorClass, analyzePerformance, normalizeClubName, parseNumber, formatYards, formatInteger, formatAngle, formatSpeedWithUnit, formatHeightWithUnit, formatDistanceWithUnit, getReference, COMPARISON_DATASETS, analyzeSideDispersion } from './clubOrdering';
import { useUserPreferences } from './UserPreferencesContext';
import { useComparison } from './ComparisonContext';
import Tooltip from './components/Tooltip';
import LoadingSkeleton from './components/LoadingSkeleton';

// Generate distinct color for each club
const generateColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    let value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
};

// --- DistanceChart component (sorted longest to shortest) ---
const DistanceChart = ({ data, dataKey, title }) => {
  const { preferences } = useUserPreferences();
  // Sort clubs by avg distance (longest to shortest)
  const sorted = [...data].sort((a, b) => (b.stats[dataKey]?.avg || 0) - (a.stats[dataKey]?.avg || 0));
  const svgWidth = 600;
  const svgHeight = sorted.length * 40 + 40;
  const margin = { top: 20, right: 30, bottom: 20, left: 100 };
  const width = svgWidth - margin.left - margin.right;
  const height = svgHeight - margin.top - margin.bottom;
  const maxDist = Math.max(...sorted.map(d => d.stats[dataKey]?.max || 0), 100);
  const xScale = (value) => (value / maxDist) * width;
  return (
    <div className="chunky-card">
      <h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3>
      <svg width="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
        <g transform={`translate(${margin.left},${margin.top})`}>
          {sorted.map((d, i) => (
            <text key={i} x={-10} y={i * 40 + 20} dy=".35em" textAnchor="end" fill="white" className="text-sm font-semibold">
              {d.club}
            </text>
          ))}
          {sorted.map((d, i) => {
            const stats = d.stats[dataKey];
            if (!stats || stats.avg === undefined) return null;
            const clubColor = generateColor(d.club);
            return (
              <g key={i} transform={`translate(0, ${i * 40 + 10})`}>
                <line
                  x1={xScale(stats.min)}
                  x2={xScale(stats.max)}
                  y1={10}
                  y2={10}
                  stroke={clubColor}
                  strokeWidth="8"
                  strokeLinecap="round"
                  opacity="0.6"
                />
                <circle
                  cx={xScale(stats.avg)}
                  cy={10}
                  r="6"
                  fill={clubColor}
                  stroke="white"
                  strokeWidth="2"
                />
                <text x={xScale(stats.avg)} y={-2} fill="white" className="text-xs font-bold font-sans" textAnchor="middle">{formatDistanceWithUnit(stats.avg, preferences.distanceUnit)}</text>
              </g>
            );
          })}
          <line x1="0" y1={height} x2={width} y2={height} stroke="#4A5568" />
        </g>
      </svg>
    </div>
  );
};

// --- SideDispersionChart (sorted by avg total distance) ---
const SideDispersionChart = ({ data }) => {
  const { preferences } = useUserPreferences();
  // Sort clubs by avg total distance (longest to shortest)
  const sorted = [...data].sort((a, b) => (b.stats.total?.avg || 0) - (a.stats.total?.avg || 0));
  const svgWidth = 600;
  const svgHeight = sorted.length * 40 + 40;
  const margin = { top: 20, right: 30, bottom: 20, left: 100 };
  const width = svgWidth - margin.left - margin.right;
  const height = svgHeight - margin.top - margin.bottom;
  const maxAbsSide = Math.max(...sorted.map(d => Math.max(Math.abs(d.stats.side.min), Math.abs(d.stats.side.max))), 10);
  const xScale = (value) => ((value + maxAbsSide) / (2 * maxAbsSide)) * width;
  return (
    <div className="chunky-card">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Side Dispersion Range (X-Axis)</h3>
      <svg width="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
        <g transform={`translate(${margin.left},${margin.top})`}>
          {sorted.map((d, i) => (
            <text key={i} x={-10} y={i * 40 + 20} dy=".35em" textAnchor="end" fill="white" className="text-sm font-semibold">
              {d.club}
            </text>
          ))}
          {/* Zero line (center) */}
          <line x1={xScale(0)} y1={0} x2={xScale(0)} y2={height} stroke="#aaa" strokeDasharray="4,2" />
          {sorted.map((d, i) => {
            const stats = d.stats.side;
            if (!stats || stats.avg === undefined) return null;
            const clubColor = generateColor(d.club);
            return (
              <g key={i} transform={`translate(0, ${i * 40 + 10})`}>
                {/* Min-Max Range Line */}
                <line
                  x1={xScale(stats.min)}
                  x2={xScale(stats.max)}
                  y1={10}
                  y2={10}
                  stroke={clubColor}
                  strokeWidth="8"
                  strokeLinecap="round"
                  opacity="0.6"
                />
                {/* Average Dot */}
                <circle
                  cx={xScale(stats.avg)}
                  cy={10}
                  r="6"
                  fill={clubColor}
                  stroke="white"
                  strokeWidth="2"
                />
                <text x={xScale(stats.avg)} y={-2} fill="white" className="text-xs font-bold font-sans" textAnchor="middle">{formatDistanceWithUnit(stats.avg, preferences.distanceUnit)}</text>
              </g>
            );
          })}
          <line x1="0" y1={height} x2={width} y2={height} stroke="#4A5568" />
        </g>
      </svg>
    </div>
  );
};

// --- Polar Dispersion Chart (Semi-circular fan visualization) ---
const PolarDispersionChart = ({ data, selectedClubs, filterOutliers }) => {
  const { preferences } = useUserPreferences();
  const svgWidth = 600;
  const svgHeight = 400;
  const centerX = svgWidth / 2;
  const centerY = svgHeight - 50; // Bottom center
  const maxRadius = Math.min(centerX - 50, centerY - 50);
  
  // Filter shots by selected clubs and outliers
  let filteredShots = data.filter(shot => selectedClubs[shot.club]);
  
  // Filter out outliers if checkbox is checked
  if (filterOutliers) {
    filteredShots = filteredShots.filter(shot => !shot.isOutlier);
  }
  
  // Calculate max distance for scaling
  const maxDistance = Math.max(...filteredShots.map(shot => shot.carry || shot.carry_distance || 0), 300);
  
  // Convert cartesian to polar coordinates
  const toPolar = (side, distance) => {
    // Side is left/right offset, distance is carry distance
    const radius = (distance / maxDistance) * maxRadius;
    // Convert side offset to angle (0 = straight, negative = left, positive = right)
    const maxSideOffset = 50; // Max 50 yards left/right
    const angle = (side / maxSideOffset) * (Math.PI / 3); // 60 degree spread
    return { radius, angle };
  };
  
  // Convert polar to SVG coordinates
  const toSVG = (radius, angle) => {
    const x = centerX + radius * Math.sin(angle);
    const y = centerY - radius * Math.cos(angle);
    return { x, y };
  };
  
  return (
    <div className="chunky-card">
      <h3 className="text-lg font-bold text-gray-800 mb-4">Polar Shot Dispersion</h3>
      <svg width="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
        {/* Background grid circles */}
        {[0.25, 0.5, 0.75, 1.0].map((ratio, i) => {
          const radius = ratio * maxRadius;
          // Calculate position for text placement (unused but kept for future use)
          // const { x: textX, y: textY } = toSVG(radius, 0);
          return (
            <g key={i}>
              <circle
                cx={centerX}
                cy={centerY}
                r={radius}
                fill="none"
                stroke="#374151"
                strokeWidth="1"
                opacity="0.3"
              />
              <text
                x={centerX}
                y={centerY - radius - 5}
                fill="#9CA3AF"
                fontSize="12"
                textAnchor="middle"
              >
                {formatDistanceWithUnit(ratio * maxDistance, preferences.distanceUnit)}
              </text>
            </g>
          );
        })}
        
        {/* Direction lines */}
        {[-30, -15, 0, 15, 30].map((degrees, i) => {
          const angle = (degrees * Math.PI) / 180;
          const { x: lineX, y: lineY } = toSVG(maxRadius, angle);
          return (
            <g key={i}>
              <line
                x1={centerX}
                y1={centerY}
                x2={lineX}
                y2={lineY}
                stroke="#374151"
                strokeWidth="1"
                opacity="0.3"
              />
              <text
                x={lineX + Math.sin(angle) * 20}
                y={lineY - Math.cos(angle) * 20}
                fill="#9CA3AF"
                fontSize="10"
                textAnchor="middle"
              >
                {degrees}°
              </text>
            </g>
          );
        })}
        
        {/* Shot markers */}
        {filteredShots.map((shot, i) => {
          const side = shot.side || shot.side_total || 0;
          const distance = shot.carry || shot.carry_distance || 0;
          const { radius, angle } = toPolar(side, distance);
          const { x, y } = toSVG(radius, angle);
          const clubColor = generateColor(shot.club);
          
          return (
            <g key={i}>
              <circle
                cx={x}
                cy={y}
                r="4"
                fill={clubColor}
                stroke="white"
                strokeWidth="1"
                opacity="0.8"
              />
              {/* Club label for longer shots */}
              {distance > maxDistance * 0.5 && (
                <text
                  x={x + 8}
                  y={y - 8}
                  fill="white"
                  fontSize="10"
                  className="font-semibold"
                >
                  {shot.club}
                </text>
              )}
            </g>
          );
        })}
        
        {/* Center point */}
        <circle
          cx={centerX}
          cy={centerY}
          r="3"
          fill="#EF4444"
          stroke="white"
          strokeWidth="2"
        />
        
        {/* Legend */}
        <g transform={`translate(20, 20)`}>
          <text fill="white" fontSize="14" fontWeight="bold">Shot Dispersion</text>
          <text fill="#9CA3AF" fontSize="12" y="20">Distance = Radius, Direction = Angle</text>
        </g>
      </svg>
    </div>
  );
};

const SessionView = ({ user }) => {
  const { batchId } = useParams();
  const { selectedDataset } = useComparison();
  const { preferences } = useUserPreferences();
  const [allShots, setAllShots] = useState([]);
  const [availableClubs, setAvailableClubs] = useState([]);
  const [selectedClubs, setSelectedClubs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Add state and logic for sorting
  const [tableSortKey, setTableSortKey] = useState('club');
  const [tableSortAsc, setTableSortAsc] = useState(true);

  // Dispersion ellipse state
  const [confidenceLevel, setConfidenceLevel] = useState(0.75);
  const [showEllipse, setShowEllipse] = useState(true);
  const [filterOutliers, setFilterOutliers] = useState(false);

  useEffect(() => {
    if (!user || !batchId) return;
    setLoading(true);
    const q = query(
      collection(db, "userData"),
      where("batchId", "==", batchId),
      where("uid", "==", user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setError("No data found for this session.");
        setAllShots([]);
        setLoading(false);
        return;
      }
      
      try {
        const sessionShots = snapshot.docs.map(doc => {
          const data = doc.data();
          if (!data) {
            console.warn("Document has no data:", doc.id);
            return null;
          }
          
          return {
            ...data,
            carry: parseNumber(data.carry_distance),
            side: parseNumber(data.side_total || data.side),
            club: normalizeClubName(data.club || 'Unknown')
          };
        }).filter(shot => shot !== null); // Remove null entries
        
        if (sessionShots.length === 0) {
          setError("No valid shot data found in this session.");
          setAllShots([]);
          setLoading(false);
          return;
        }
              setAllShots(sessionShots);
        const clubs = Array.from(new Set(sessionShots.map(s => s.club)));
        const sortedClubs = sortClubs(clubs);
        setAvailableClubs(sortedClubs);
        const initialSelected = {};
        sortedClubs.forEach(club => (initialSelected[club] = true));
        setSelectedClubs(initialSelected);
        setLoading(false);
      } catch (error) {
        console.error("Error processing session data:", error);
        setError("Error loading session data. Please try again.");
        setAllShots([]);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [user, batchId]);

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

  const filteredShots = useMemo(() => {
    let shots = allShots.filter(shot => selectedClubs[shot.club]);
    
    // Filter out outliers if checkbox is checked
    if (filterOutliers) {
      shots = shots.filter(shot => !shot.isOutlier);
    }
    
    return shots;
  }, [allShots, selectedClubs, filterOutliers]);

  const sessionStats = useMemo(() => {
    if (allShots.length === 0) return [];
    const clubGroups = allShots.reduce((acc, shot) => {
      const club = shot.club || 'Unknown';
      if (!acc[club]) acc[club] = [];
      acc[club].push(shot);
      return acc;
    }, {});
    return Object.entries(clubGroups).map(([club, shots]) => {
      const getStats = (arr) => {
        if (arr.length === 0) return { avg: 0, min: 0, max: 0 };
        const numericArr = arr.map(v => parseFloat(v || 0)).filter(v => !isNaN(v));
        if (numericArr.length === 0) return { avg: 0, min: 0, max: 0 };
        return {
          avg: numericArr.reduce((a, b) => a + b, 0) / numericArr.length,
          min: Math.min(...numericArr),
          max: Math.max(...numericArr),
        };
      };
      return {
        club,
        shotCount: shots.length,
        stats: {
          carry: getStats(shots.map(s => s.carry_distance)),
          total: getStats(shots.map(s => s.total_distance)),
          side: getStats(shots.map(s => s.side_total || s.side)),
          ball_speed: getStats(shots.map(s => s.ball_speed)),
          club_speed: getStats(shots.map(s => s.club_speed)),
          vla: getStats(shots.map(s => s.vla)),
          peak_height: getStats(shots.map(s => s.peak_height)),
          descent_angle: getStats(shots.map(s => s.descent_angle)),
          spin_rate: getStats(shots.map(s => s.spin_rate)),
        },
      };
    });
  }, [allShots]);

  // In sortedSessionStats, always sort by avg total distance (longest to shortest)
  const sortedSessionStats = useMemo(() => {
    const arr = [...sessionStats];
    arr.sort((a, b) => (b.stats.total?.avg || 0) - (a.stats.total?.avg || 0));
    return arr;
  }, [sessionStats]);

  // Calculate gap analysis for the session
  const gapAnalysis = useMemo(() => {
    if (sortedSessionStats.length < 2) {
      return {
        gaps: [],
        recommendations: ['Need at least 2 clubs to analyze gaps'],
        averageGap: 0,
        hasLargeGaps: false,
        hasSmallGaps: false,
        pgaComparison: { averageGap: 12, difference: 0 },
        distanceRange: { shortest: '', longest: '', range: 0 }
      };
    }

    // Create club data for gap analysis
    const clubData = sortedSessionStats.map(({ club, stats }) => ({
      club,
      avgDistance: stats.total.avg || stats.carry.avg
    }));

    return analyzeGaps(clubData);
  }, [sortedSessionStats]);

  // Create aggregated data for the enhanced table
  const aggregatedData = useMemo(() => {
    return sortedSessionStats.map(({ club, shotCount, stats }) => ({
      club,
      shotCount,
      stats
    }));
  }, [sortedSessionStats]);

  // Toggle sort direction on header click
  const handleTableSort = (key) => {
    if (tableSortKey === key) setTableSortAsc(!tableSortAsc);
    else {
      setTableSortKey(key);
      setTableSortAsc(true);
    }
  };

  const svgWidth = 800, svgHeight = 600, padding = 50;
  const maxCarry = Math.max(...allShots.map(s => s.carry), 100);
  // --- Scatter plot axis logic ---
  // X axis: true center at 0 (side), negative = left, positive = right
  const maxAbsSide = Math.max(...allShots.map(s => Math.abs(s.side)), 30);
  const getX = useCallback((side) => (side / (2 * maxAbsSide)) * (svgWidth - 2 * padding) + svgWidth / 2, [maxAbsSide, svgWidth, padding]);
  const getY = useCallback((carry) => svgHeight - padding - (carry / maxCarry) * (svgHeight - 2 * padding), [svgHeight, padding, maxCarry]);

  // --- Dispersion Ellipse Calculation (per club) ---
  const clubEllipses = useMemo(() => {
    if (!showEllipse) return [];
    
          // Group filtered shots by club
      const clubGroups = filteredShots.reduce((acc, shot) => {
        if (!acc[shot.club]) acc[shot.club] = [];
        acc[shot.club].push(shot);
        return acc;
      }, {});
    
          // For each club with 3+ shots, calculate ellipse
      const ellipses = Object.entries(clubGroups).map(([club, shots]) => {
        if (shots.length < 3) {
          return null;
        }
      
      // Use the same coordinate system as the shot points (transformed coordinates)
      const points = shots.map(shot => ({ 
        x: getX(shot.side), 
        y: getY(shot.carry) 
      })).filter(p => !isNaN(p.x) && !isNaN(p.y));
      
      if (points.length < 3) {
        return null;
      }
      
      const centroid = {
        x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
        y: points.reduce((sum, p) => sum + p.y, 0) / points.length
      };
      
      const centeredPoints = points.map(p => ({ x: p.x - centroid.x, y: p.y - centroid.y }));
      const covXX = centeredPoints.reduce((sum, p) => sum + p.x * p.x, 0) / points.length;
      const covYY = centeredPoints.reduce((sum, p) => sum + p.y * p.y, 0) / points.length;
      const covXY = centeredPoints.reduce((sum, p) => sum + p.x * p.y, 0) / points.length;
      
      const trace = covXX + covYY;
      const det = covXX * covYY - covXY * covXY;
      const discriminant = Math.sqrt(trace * trace - 4 * det);
      const lambda1 = (trace + discriminant) / 2;
      const lambda2 = (trace - discriminant) / 2;
      
      const eigenvector1 = { x: covXY, y: lambda1 - covXX };
      const norm1 = Math.sqrt(eigenvector1.x * eigenvector1.x + eigenvector1.y * eigenvector1.y);
      eigenvector1.x /= norm1;
      eigenvector1.y /= norm1;
      const angle = Math.atan2(eigenvector1.y, eigenvector1.x) * 180 / Math.PI;
      
      const chiSquareValues = { 0.75: 2.773, 0.85: 3.841, 0.95: 5.991 };
      const chiSquare = chiSquareValues[confidenceLevel] || 2.773;
      const radiusX = Math.sqrt(lambda1 * chiSquare);
      const radiusY = Math.sqrt(lambda2 * chiSquare);
      
      return {
        club,
        centroid,
        radiusX,
        radiusY,
        angle,
        color: generateColor(club)
      };
    }).filter(Boolean);
    
    return ellipses;
  }, [filteredShots, confidenceLevel, showEllipse, getX, getY]);

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton type="stats" />
        <LoadingSkeleton type="chart" />
        <LoadingSkeleton type="table" rows={8} />
        <LoadingSkeleton type="chart" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center">
          <p className="text-xl text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Neo-Brutalism Header */}
      <div className="mb-12">
        <div className="chunky-card bg-gradient-to-r from-indigo-500 to-purple-600">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
                📊 SESSION ANALYSIS
              </h1>
              <p className="text-white/90 text-lg font-medium">
                Detailed Shot Performance
              </p>
            </div>
            <div className="text-6xl">
              🎯
            </div>
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <p className="text-gray-600 mb-6">Batch ID: {batchId}</p>

        {allShots.length === 0 ? (
          <p className="text-gray-600">No data available for this session.</p>
        ) : (
          <div className="space-y-8">
            {/* Club Filter */}
            <div className="chunky-card">
              <h3 className="text-lg font-bold mb-4 text-gray-800">Filter by Club</h3>
              <div className="flex flex-wrap gap-3">
                {availableClubs.map(club => (
                  <label key={club} className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-yellow-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={!!selectedClubs[club]}
                      onChange={() =>
                        setSelectedClubs(prev => ({ ...prev, [club]: !prev[club] }))
                      }
                      className="chunky-checkbox"
                    />
                    <span className="text-sm font-medium text-gray-700">{club}</span>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: generateColor(club) }}></div>
                  </label>
                ))}
              </div>
            </div>

            {/* Club Stats Table (like ClubsOverview) */}
            <div className="chunky-card overflow-x-auto mb-8">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Club Stats (This Session)</h3>
              <table className="chunky-table w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="cursor-pointer" onClick={() => handleTableSort('club')}>Club</th>
                    <th className="cursor-pointer" onClick={() => handleTableSort('shotCount')}>Shots</th>
                    <th className="cursor-pointer" onClick={() => handleTableSort('total')}>Avg Total Dist.</th>
                    <th className="cursor-pointer" onClick={() => handleTableSort('carry')}>Avg Carry Dist.</th>
                    <th className="cursor-pointer" onClick={() => handleTableSort('side')}>Avg Side</th>
                    <th className="cursor-pointer" onClick={() => handleTableSort('ball_speed')}>Avg Ball Speed</th>
                    <th className="cursor-pointer" onClick={() => handleTableSort('club_speed')}>Avg Club Speed</th>
                    <th className="cursor-pointer" onClick={() => handleTableSort('vla')}>Avg VLA</th>
                    <th className="cursor-pointer" onClick={() => handleTableSort('peak_height')}>Avg Peak Height</th>
                    <th className="cursor-pointer" onClick={() => handleTableSort('descent_angle')}>Avg Descent</th>
                    <th className="cursor-pointer" onClick={() => handleTableSort('spin_rate')}>Avg Spin Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSessionStats.map(({ club, shotCount, stats }) => (
                    <tr key={club} className="hover:bg-yellow-50 transition-colors">
                      <td className="font-bold flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: generateColor(club) }}></div>
                        <span className="text-gray-800">{club}</span>
                      </td>
                      <td className="text-gray-700">{shotCount}</td>
                      <td className="text-gray-700">{formatDistanceWithUnit(stats.total.avg, preferences.distanceUnit)}</td>
                      <td className="text-gray-700">{formatDistanceWithUnit(stats.carry.avg, preferences.distanceUnit)}</td>
                      <td className="text-gray-700">{formatDistanceWithUnit(stats.side.avg, preferences.distanceUnit)}</td>
                      <td className="text-gray-700">{formatSpeedWithUnit(stats.ball_speed.avg, preferences.speedUnit)}</td>
                      <td className="text-gray-700">{formatSpeedWithUnit(stats.club_speed.avg, preferences.speedUnit)}</td>
                      <td className="text-gray-700">{formatAngle(stats.vla.avg)}</td>
                      <td className="text-gray-700">{formatHeightWithUnit(stats.peak_height.avg, preferences.heightUnit)}</td>
                      <td className="text-gray-700">{formatAngle(stats.descent_angle.avg)}</td>
                      <td className="text-gray-700">{formatInteger(stats.spin_rate.avg)} rpm</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Distance and Side Dispersion Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              <DistanceChart data={sortedSessionStats} dataKey="total" title="Total Distance Range" />
              <DistanceChart data={sortedSessionStats} dataKey="carry" title="Carry Distance Range" />
              <SideDispersionChart data={sortedSessionStats} />
            </div>

            {/* Polar Shot Dispersion Chart */}
            <div className="mb-8">
              <PolarDispersionChart data={allShots} selectedClubs={selectedClubs} filterOutliers={filterOutliers} />
            </div>

            {/* Shot Distribution Chart */}
            <div className="chunky-card">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Shot Distribution</h3>
              
              {/* Dispersion Ellipse Controls */}
              <div className="mb-4 flex flex-wrap gap-4 items-center">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="showEllipse"
                    checked={showEllipse}
                    onChange={(e) => setShowEllipse(e.target.checked)}
                    className="chunky-checkbox"
                  />
                  <Tooltip content="Show confidence ellipses around each club's shot dispersion. Higher confidence levels create larger ellipses.">
                    <label htmlFor="showEllipse" className="text-sm text-gray-600 cursor-pointer">
                      Show Dispersion Ellipse <span className="text-blue-600">ⓘ</span>
                    </label>
                  </Tooltip>
                </div>
                
                {showEllipse && (
                  <div className="flex items-center space-x-2">
                    <Tooltip content="Higher confidence levels create larger ellipses that encompass more of your shots. 75% is a good balance.">
                      <label className="text-sm text-gray-600">
                        Confidence Level: <span className="text-blue-600">ⓘ</span>
                      </label>
                    </Tooltip>
                    <select
                      value={confidenceLevel}
                      onChange={(e) => setConfidenceLevel(parseFloat(e.target.value))}
                      className="chunky-select"
                    >
                      <option value={0.75}>75%</option>
                      <option value={0.85}>85%</option>
                      <option value={0.95}>95%</option>
                    </select>
                  </div>
                )}
                
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
                
                {clubEllipses.length > 0 && (
                  <div className="text-xs text-gray-600">
                    {Math.round(confidenceLevel * 100)}% confidence ellipses shown for {clubEllipses.length} club{clubEllipses.length !== 1 ? 's' : ''}
                    {filterOutliers && (
                      <span className="ml-2">
                        ({filteredShots.length} of {allShots.length} shots shown)
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <svg width="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                  {/* Center vertical line (0 side) */}
                  <line x1={svgWidth / 2} y1={padding} x2={svgWidth / 2} y2={svgHeight - padding} stroke="rgba(255,0,0,0.5)" strokeWidth="2" strokeDasharray="5,5" />
                  {/* X axis (ground line at y=0) */}
                  <line x1={padding} y1={svgHeight - padding} x2={svgWidth - padding} y2={svgHeight - padding} stroke="#aaa" strokeWidth="1" />
                  {/* Horizontal grid lines (carry yardage) */}
                  {[...Array(5)].map((_, i) => {
                    const yardage = (maxCarry / 5) * (i + 1);
                    const yPos = getY(yardage);
                    return (
                      <g key={i}>
                        <line x1={padding} y1={yPos} x2={svgWidth - padding} y2={yPos} stroke="rgba(255,255,255,0.1)" />
                        <text x={padding - 10} y={yPos + 4} fill="white" fontSize="12" textAnchor="end">
                          {Math.round(yardage)} yds
                        </text>
                      </g>
                    );
                  })}
                  {/* Dispersion Ellipses (one per club) */}
                  {clubEllipses.map((ellipse, idx) => (
                    <g key={ellipse.club || idx}>
                      <ellipse
                        cx={ellipse.centroid.x}
                        cy={ellipse.centroid.y}
                        rx={ellipse.radiusX}
                        ry={ellipse.radiusY}
                        transform={`rotate(${ellipse.angle} ${ellipse.centroid.x} ${ellipse.centroid.y})`}
                        fill={ellipse.color.replace(')', ', 0.10)').replace('rgb', 'rgba')}
                        stroke={ellipse.color}
                        strokeWidth="2"
                      />
                    </g>
                  ))}
                  {/* Shot points with tooltip */}
                  {filteredShots.map((shot, i) => (
                    <g key={i}>
                      <circle
                        cx={getX(shot.side)}
                        cy={getY(shot.carry)}
                        r="5"
                        fill={generateColor(shot.club)}
                        fillOpacity="0.7"
                        stroke="white"
                        strokeWidth="1"
                      />
                      <title>{`${shot.club}: Carry ${shot.carry} yds, Side ${shot.side > 0 ? '+' : ''}${shot.side} yds`}</title>
                    </g>
                  ))}
                </svg>
              </div>
            </div>

            {/* Session Statistics */}
            <div className="chunky-card">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Session Statistics</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-2xl font-bold text-blue-600">{filteredShots.length}</div>
                  <div className="text-sm text-gray-600">
                    {filterOutliers ? `Shots (${allShots.length - filteredShots.length} outliers filtered)` : 'Total Shots'}
                  </div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-600">
                    {filteredShots.length > 0 ? formatInteger(filteredShots.reduce((sum, shot) => sum + shot.carry, 0) / filteredShots.length) : 0}
                  </div>
                  <div className="text-sm text-gray-600">Avg Carry (yds)</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="text-2xl font-bold text-yellow-600">
                    {filteredShots.length > 0 ? formatInteger(filteredShots.reduce((sum, shot) => sum + Math.abs(shot.side), 0) / filteredShots.length) : 0}
                  </div>
                  <div className="text-sm text-gray-600">Avg Side (yds)</div>
                </div>
              </div>
            </div>

            {/* Gap Analysis Section */}
            <div className="chunky-card">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Distance Gap Analysis</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600">Average Gap:</span>
                      <span className={`text-lg font-bold ${getColorClass(
                        getStandardizedColor(gapAnalysis.averageGap, 12).color, 'text'
                      )}`}>
                        {formatYards(gapAnalysis.averageGap)} yards
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600">PGA Tour Average:</span>
                      <span className="text-gray-800 font-semibold">
                        {gapAnalysis.pgaComparison?.averageGap || 12} yards
                      </span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600">Difference:</span>
                      <span className={`font-semibold ${getColorClass(
                        getStandardizedColor(Math.abs(gapAnalysis.pgaComparison?.difference || 0), 2).color, 'text'
                      )}`}>
                        {gapAnalysis.pgaComparison?.difference > 0 ? '+' : ''}{gapAnalysis.pgaComparison?.difference || 0} yards
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Distance Range:</span>
                      <span className="text-gray-800">
                        {formatYards(gapAnalysis.distanceRange?.shortest)} → {formatYards(gapAnalysis.distanceRange?.longest)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Optimizations:</span>
                      <span className={`font-semibold ${gapAnalysis.hasLargeGaps || gapAnalysis.hasSmallGaps ? 'text-red-600' : 'text-green-600'}`}>
                        {(gapAnalysis.largeGaps?.length || 0) + (gapAnalysis.smallGaps?.length || 0)}
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
                      const gapAnalysis = analyzePerformance(gap.gap, 12, true); // 12 yards is optimal gap
                      
                      return (
                        <div key={index} className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                          <div className="text-sm font-medium text-gray-800">
                            {gap.from} → {gap.to}
                          </div>
                          <div className="text-xs text-gray-600">
                            {gap.fromDistance} → {gap.toDistance} yds
                          </div>
                          <div className={`text-sm font-bold ${getColorClass(gapAnalysis.color, 'text')}`}>
                            Gap: {gap.gap} yds
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {gapAnalysis.message}
                          </div>
                          {pgaRef && (
                            <div className="text-xs text-orange-600 mt-1 font-medium">
                              {COMPARISON_DATASETS[selectedDataset]?.name || 'PGA Tour'}: {pgaRef.avg}yds avg
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
              <table className="chunky-table w-full text-left text-base font-medium">
                <thead>
                  <tr>
                    <th className="p-3">Club</th>
                    <th className="p-3">Shots</th>
                    <th className="p-3">Avg Total Dist.</th>
                    <th className="p-3">Avg Carry Dist.</th>
                    <th className="p-3">Avg Side</th>
                    <th className="p-3">Avg Ball Speed</th>
                    <th className="p-3">Avg Spin Rate</th>
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
                        <td className="p-3 text-blue-300">{shotCount}</td>
                        <td className={`p-3 ${distanceAnalysis ? getColorClass(distanceAnalysis.color, 'text') : 'text-green-300'}`}>
                          {formatYards(stats.total.avg || stats.carry.avg)} yds
                          {distanceAnalysis && (
                            <div className="text-xs text-yellow-400 font-medium">
                              {distanceAnalysis.percentageDiff}% vs {COMPARISON_DATASETS[selectedDataset]?.name || 'PGA Tour'}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-yellow-300">{formatYards(stats.carry.avg)} yds</td>
                        <td className={`p-3 ${getColorClass(sideAnalysis.color, 'text')}`}>
                          {formatYards(stats.side.avg)} yds
                        </td>
                        <td className="p-3 text-green-300">{formatInteger(stats.ball_speed.avg)} mph</td>
                        <td className="p-3 text-yellow-300">{formatInteger(stats.spin_rate.avg)} rpm</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>


          </div>
        )}
      </div>
    </div>
  );
};

export default SessionView;
