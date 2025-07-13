// src/ClubsOverview.js

import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import Spinner from './Spinner';

// --- Reusable Chart Component for Distance Visualization ---
const DistanceChart = ({ data, dataKey, title }) => {
  const svgWidth = 600;
  const svgHeight = data.length * 40 + 40; // Height adjusts to number of clubs
  const margin = { top: 20, right: 30, bottom: 20, left: 100 };
  const width = svgWidth - margin.left - margin.right;
  const height = svgHeight - margin.top - margin.bottom;

  const maxDist = Math.max(...data.map(d => d.stats[dataKey]?.max || 0), 100);

  const xScale = (value) => (value / maxDist) * width;

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h3 className="text-lg font-bold text-white mb-4">{title}</h3>
      <svg width="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Y-axis labels (Club names) */}
          {data.map((d, i) => (
            <text key={i} x={-10} y={i * 40 + 20} dy=".35em" textAnchor="end" fill="white" className="text-sm font-semibold">
              {d.club}
            </text>
          ))}

          {/* Chart Bars */}
          {data.map((d, i) => {
            const stats = d.stats[dataKey];
            if (!stats || stats.avg === undefined) return null;

            return (
              <g key={i} transform={`translate(0, ${i * 40 + 10})`}>
                {/* Min-Max Range Line */}
                <line
                  x1={xScale(stats.min)}
                  x2={xScale(stats.max)}
                  y1={10}
                  y2={10}
                  stroke="#4A5568" // gray-600
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                {/* Average Dot */}
                <circle
                  cx={xScale(stats.avg)}
                  cy={10}
                  r="5"
                  fill="#48BB78" // green-400
                  stroke="white"
                  strokeWidth="1.5"
                />
                <text x={xScale(stats.avg)} y={-2} fill="white" className="text-xs font-bold" textAnchor="middle">{Math.round(stats.avg)}</text>
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
  const [allShots, setAllShots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      if (!user) return;
      setLoading(true);
      const q = query(collection(db, 'userData'), where('uid', '==', user.uid));
      const querySnapshot = await getDocs(q);
      const shots = querySnapshot.docs.map(doc => doc.data());
      setAllShots(shots);
      setLoading(false);
    };
    fetchAllData();
  }, [user]);

  // useMemo will re-calculate only when allShots changes
  const aggregatedData = useMemo(() => {
    if (allShots.length === 0) return [];

    const clubGroups = allShots.reduce((acc, shot) => {
      const club = shot.club || 'Unknown';
      if (!acc[club]) {
        acc[club] = [];
      }
      acc[club].push(shot);
      return acc;
    }, {});

    return Object.entries(clubGroups).map(([club, shots]) => {
      const getStats = (arr) => {
          if(arr.length === 0) return { avg: 0, min: 0, max: 0 };
          const numericArr = arr.map(v => parseFloat(v || 0)).filter(v => !isNaN(v));
          if(numericArr.length === 0) return { avg: 0, min: 0, max: 0 };
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
          total: getStats(shots.map(s => s.total_distance || s.carry_distance)),
          side: getStats(shots.map(s => s.side_total || s.side)),
          ball_speed: getStats(shots.map(s => s.ball_speed)),
          spin_rate: getStats(shots.map(s => s.spin_rate)),
        },
      };
    }).sort((a,b) => a.club.localeCompare(b.club)); // Sort alphabetically by club
  }, [allShots]);

  if (loading) {
    return <Spinner message="Analyzing all your sessions..." />;
  }

  return (
    <div className="bg-gray-900 min-h-screen text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Link to="/" className="text-blue-400 hover:text-blue-300">&larr; Back to Home</Link>
        </div>
        <h1 className="text-3xl font-bold mb-6">Clubs Overview</h1>

        {aggregatedData.length === 0 ? (
          <p>No data available. Please upload a session to see your stats.</p>
        ) : (
          <div className="space-y-8">
            {/* Data Table */}
            <div className="bg-gray-800 rounded-lg p-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-700 text-gray-400">
                  <tr>
                    <th className="p-2">Club</th>
                    <th className="p-2">Shots</th>
                    <th className="p-2">Avg Total Dist.</th>
                    <th className="p-2">Avg Carry Dist.</th>
                    <th className="p-2">Avg Side</th>
                    <th className="p-2">Avg Ball Speed</th>
                    <th className="p-2">Avg Spin Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {aggregatedData.map(({ club, shotCount, stats }) => (
                    <tr key={club} className="border-b border-gray-700 last:border-b-0 hover:bg-gray-700/50">
                      <td className="p-2 font-bold">{club}</td>
                      <td className="p-2">{shotCount}</td>
                      <td className="p-2">{stats.total.avg.toFixed(1)} yds</td>
                      <td className="p-2">{stats.carry.avg.toFixed(1)} yds</td>
                      <td className="p-2">{stats.side.avg.toFixed(1)} yds</td>
                      <td className="p-2">{stats.ball_speed.avg.toFixed(1)} mph</td>
                      <td className="p-2">{stats.spin_rate.avg.toFixed(0)} rpm</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <DistanceChart data={aggregatedData} dataKey="total" title="Total Distance Range" />
              <DistanceChart data={aggregatedData} dataKey="carry" title="Carry Distance Range" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClubsOverview;
