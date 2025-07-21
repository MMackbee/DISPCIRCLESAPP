import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { formatYards } from '../utils/formatters';
import { normalizeClubName } from '../clubOrdering';

const ComparisonView = ({ user }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [sessionsData, setSessionsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedClubs, setSelectedClubs] = useState({});
  const [showEllipse, setShowEllipse] = useState(true);
  const [zoom, setZoom] = useState(1);

  // Wrap batchIds in useMemo to prevent unnecessary re-renders
  const batchIds = useMemo(() => {
    return searchParams.get('ids')?.split(',') || [];
  }, [searchParams]);

  useEffect(() => {
    const fetchSessionsData = async () => {
      if (!user || batchIds.length === 0) return;

      try {
        const shotsRef = collection(db, 'userData');
        const q = query(
          shotsRef,
          where('uid', '==', user.uid),
          where('batchId', 'in', batchIds)
        );

        const querySnapshot = await getDocs(q);
        const shotsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Group shots by batchId
        const groupedData = {};
        batchIds.forEach(batchId => {
          groupedData[batchId] = shotsData.filter(shot => shot.batchId === batchId);
        });

        setSessionsData(groupedData);
      } catch (error) {
        console.error('Error fetching sessions data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessionsData();
  }, [user, batchIds]);

  // Get available clubs across all sessions
  const availableClubs = useMemo(() => {
    const allClubs = new Set();
    Object.values(sessionsData).forEach(shots => {
      shots.forEach(shot => {
        if (shot.club) {
          allClubs.add(normalizeClubName(shot.club));
        }
      });
    });
    return Array.from(allClubs).sort();
  }, [sessionsData]);

  // Filter shots based on selected clubs
  const filteredShots = useMemo(() => {
    const clubs = Object.keys(selectedClubs).length ? selectedClubs : Object.fromEntries(availableClubs.map(c => [c, true]));
    
    const filtered = {};
    Object.entries(sessionsData).forEach(([batchId, shots]) => {
      filtered[batchId] = shots.filter(shot => clubs[normalizeClubName(shot.club || 'Unknown')]);
    });
    return filtered;
  }, [sessionsData, selectedClubs, availableClubs]);

  // Calculate session statistics
  const sessionStats = useMemo(() => {
    const stats = {};
    
    Object.entries(filteredShots).forEach(([batchId, shots]) => {
      if (shots.length === 0) {
        stats[batchId] = {};
        return;
      }

      const clubStats = {};
      const normalizedClubs = shots.map(shot => normalizeClubName(shot.club || 'Unknown'));
      const uniqueClubs = [...new Set(normalizedClubs)];

      uniqueClubs.forEach(club => {
        const clubShots = shots.filter(shot => normalizeClubName(shot.club || 'Unknown') === club);
        
        const totalDistances = clubShots.map(s => parseFloat(s.total_distance || s.carry_distance || s.carry)).filter(d => !isNaN(d));
        const carryDistances = clubShots.map(s => parseFloat(s.carry_distance || s.carry)).filter(d => !isNaN(d));
        const sideDistances = clubShots.map(s => parseFloat(s.side_total || s.side)).filter(d => !isNaN(d));
        const ballSpeeds = clubShots.map(s => parseFloat(s.ball_speed)).filter(d => !isNaN(d));
        const clubSpeeds = clubShots.map(s => parseFloat(s.club_speed)).filter(d => !isNaN(d));
        const spinRates = clubShots.map(s => parseFloat(s.spin_rate)).filter(d => !isNaN(d));

        clubStats[club] = {
          shotCount: clubShots.length,
          totalDistance: {
            avg: totalDistances.length > 0 ? totalDistances.reduce((a, b) => a + b, 0) / totalDistances.length : 0,
            min: totalDistances.length > 0 ? Math.min(...totalDistances) : 0,
            max: totalDistances.length > 0 ? Math.max(...totalDistances) : 0
          },
          carryDistance: {
            avg: carryDistances.length > 0 ? carryDistances.reduce((a, b) => a + b, 0) / carryDistances.length : 0,
            min: carryDistances.length > 0 ? Math.min(...carryDistances) : 0,
            max: carryDistances.length > 0 ? Math.max(...carryDistances) : 0
          },
          sideDistance: {
            avg: sideDistances.length > 0 ? sideDistances.reduce((a, b) => a + b, 0) / sideDistances.length : 0,
            min: sideDistances.length > 0 ? Math.min(...sideDistances) : 0,
            max: sideDistances.length > 0 ? Math.max(...sideDistances) : 0
          },
          ballSpeed: {
            avg: ballSpeeds.length > 0 ? ballSpeeds.reduce((a, b) => a + b, 0) / ballSpeeds.length : 0,
            min: ballSpeeds.length > 0 ? Math.min(...ballSpeeds) : 0,
            max: ballSpeeds.length > 0 ? Math.max(...ballSpeeds) : 0
          },
          clubSpeed: {
            avg: clubSpeeds.length > 0 ? clubSpeeds.reduce((a, b) => a + b, 0) / clubSpeeds.length : 0,
            min: clubSpeeds.length > 0 ? Math.min(...clubSpeeds) : 0,
            max: clubSpeeds.length > 0 ? Math.max(...clubSpeeds) : 0
          },
          spinRate: {
            avg: spinRates.length > 0 ? spinRates.reduce((a, b) => a + b, 0) / spinRates.length : 0,
            min: spinRates.length > 0 ? Math.min(...spinRates) : 0,
            max: spinRates.length > 0 ? Math.max(...spinRates) : 0
          }
        };
      });

      stats[batchId] = clubStats;
    });

    return stats;
  }, [filteredShots]);

  // Generate colors for sessions
  const sessionColors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

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

  if (loading) {
    return (
      <div className="p-6 lg:p-12 animate-fade-in">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-300 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading comparison data...</p>
        </div>
      </div>
    );
  }

  if (batchIds.length < 2) {
    return (
      <div className="p-6 lg:p-12 animate-fade-in">
        <div className="text-center py-16">
          <div className="text-7xl mb-4">⚠️</div>
          <h2 className="text-3xl font-extrabold text-gray-800 mb-4">Invalid Comparison</h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto text-lg">
            Please select at least 2 sessions to compare.
          </p>
          <button
            onClick={() => navigate('/compare')}
            className="chunky-button chunky-button-primary"
          >
            Back to Session Selection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-12 animate-fade-in">
      {/* Neo-Brutalism Header */}
      <div className="mb-12">
        <div className="chunky-card bg-gradient-to-r from-violet-500 to-purple-600">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
                🔄 SESSION COMPARISON
              </h1>
              <p className="text-white/90 text-lg font-medium">
                Compare Multiple Practice Sessions
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-6xl">📈</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Session Overview */}
        <div className="chunky-card">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Session Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {batchIds.map((batchId, index) => {
              const shots = sessionsData[batchId] || [];
              const totalShots = shots.length;
              const avgDistance = shots.length > 0 
                ? shots.reduce((sum, shot) => sum + parseFloat(shot.total_distance || shot.carry_distance || 0), 0) / shots.length 
                : 0;

              return (
                <div key={batchId} className="p-4 rounded-xl border-2" style={{ borderColor: sessionColors[index % sessionColors.length] }}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800">Session {index + 1}</h3>
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: sessionColors[index % sessionColors.length] }}></div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Batch ID:</span>
                      <span className="font-mono text-gray-800">{batchId.substring(0, 8)}...</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Shots:</span>
                      <span className="font-semibold text-gray-800">{totalShots}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Distance:</span>
                      <span className="font-semibold text-gray-800">{formatYards(avgDistance)} yds</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

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

        {/* Comparative Data Table */}
        <div className="chunky-card overflow-x-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Comparative Performance Data</h2>
          <table className="chunky-table w-full text-left text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 bg-gray-100">Club</th>
                {batchIds.map((batchId, index) => (
                  <th key={batchId} className="text-center" style={{ color: sessionColors[index % sessionColors.length] }}>
                    Session {index + 1}
                  </th>
                ))}
                <th className="text-center">Difference</th>
              </tr>
            </thead>
            <tbody>
              {availableClubs.map(club => {
                const clubData = batchIds.map(batchId => sessionStats[batchId]?.[club]);
                const hasData = clubData.some(data => data && data.shotCount > 0);
                
                if (!hasData) return null;

                return (
                  <tr key={club} className="hover:bg-yellow-50 transition-colors">
                    <td className="font-bold flex items-center space-x-2 sticky left-0 bg-white">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: generateColor(club) }}></div>
                      <span className="text-gray-800">{club}</span>
                    </td>
                    {batchIds.map((batchId, index) => {
                      const data = sessionStats[batchId]?.[club];
                      return (
                        <td key={batchId} className="text-center">
                          {data && data.shotCount > 0 ? (
                            <div className="space-y-1">
                              <div className="text-xs text-gray-500">{data.shotCount} shots</div>
                              <div className="font-semibold">{formatYards(data.carryDistance.avg)} yds</div>
                              <div className="text-xs text-gray-600">±{formatYards(data.sideDistance.avg)}</div>
                            </div>
                          ) : (
                            <div className="text-gray-400 text-xs">No data</div>
                          )}
                        </td>
                      );
                    })}
                    <td className="text-center">
                      {(() => {
                        const validData = clubData.filter(data => data && data.shotCount > 0);
                        if (validData.length < 2) return <span className="text-gray-400 text-xs">N/A</span>;
                        
                        const distances = validData.map(d => d.carryDistance.avg);
                        const max = Math.max(...distances);
                        const min = Math.min(...distances);
                        const diff = max - min;
                        
                        return (
                          <div className="font-semibold text-orange-600">
                            {formatYards(diff)} yds
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Overlaid Scatter Plot */}
        <div className="chunky-card">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Shot Dispersion Comparison</h2>
          
          {/* Controls */}
          <div className="mb-4 flex flex-wrap gap-4 items-center">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showEllipse"
                checked={showEllipse}
                onChange={(e) => setShowEllipse(e.target.checked)}
                className="chunky-checkbox"
              />
              <label htmlFor="showEllipse" className="text-sm font-medium text-gray-700">
                Show Dispersion Ellipses
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Zoom:</span>
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
            </div>
          </div>

          {/* Legend */}
          <div className="mb-4 flex flex-wrap gap-4">
            {batchIds.map((batchId, index) => (
              <div key={batchId} className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: sessionColors[index % sessionColors.length] }}></div>
                <span className="text-sm font-medium text-gray-700">Session {index + 1}</span>
              </div>
            ))}
          </div>

          {/* SVG Plot */}
          <div className="w-full flex justify-center items-center">
            <svg
              width={800 * zoom}
              height={600 * zoom}
              viewBox="0 0 800 600"
              style={{ transition: 'width 0.2s, height 0.2s' }}
            >
              {/* Grid and axes */}
              <line x1="400" y1="50" x2="400" y2="550" stroke="rgba(255,0,0,0.5)" strokeWidth="2" strokeDasharray="5,5" />
              <line x1="50" y1="550" x2="750" y2="550" stroke="#aaa" strokeWidth="1" />
              
              {/* Shot points */}
              {batchIds.map((batchId, sessionIndex) => {
                const shots = filteredShots[batchId] || [];
                const color = sessionColors[sessionIndex % sessionColors.length];
                
                return shots.map((shot, shotIndex) => {
                  const side = parseFloat(shot.side_total || shot.side || 0);
                  const carry = parseFloat(shot.carry_distance || 0);
                  
                  // Scale coordinates to fit SVG
                  const x = 400 + (side * 2); // Scale side distance
                  const y = 550 - (carry * 0.5); // Scale carry distance
                  
                  return (
                    <g key={`${batchId}-${shotIndex}`}>
                      <circle
                        cx={x}
                        cy={y}
                        r={8 / zoom}
                        fill={color}
                        stroke="#222"
                        strokeWidth={2 / zoom}
                        opacity="0.7"
                      />
                    </g>
                  );
                });
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparisonView; 