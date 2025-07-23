import React, { useState, useMemo, useEffect } from "react";
import { db } from '../firebase';
import { collection, query, where, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";
import { useComparison } from '../ComparisonContext';
import { analyzeBag, analyzeGaps, getStandardizedColor, getColorClass, formatYards, formatInteger, normalizeClubName, getReference, COMPARISON_DATASETS } from '../clubOrdering';

const Dashboard = ({ user }) => {
  const [allShots, setAllShots] = useState([]);
  // Form state removed as it's not used

  const { selectedDataset } = useComparison();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const q = query(collection(db, 'userData'), where('uid', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const shots = querySnapshot.docs.map(doc => doc.data());
        setAllShots(shots);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, [user]);

  const stats = useMemo(() => {
    if (allShots.length === 0) return null;

    const sessions = [...new Set(allShots.map(shot => shot.batchId))];
    const clubs = [...new Set(allShots.map(shot => normalizeClubName(shot.club || 'Unknown')))];
    
    const totalShots = allShots.length;
    const avgCarry = allShots.reduce((sum, shot) => sum + (parseFloat(shot.carry_distance) || 0), 0) / totalShots;
    const avgTotal = allShots.reduce((sum, shot) => sum + (parseFloat(shot.total_distance || shot.carry_distance) || 0), 0) / totalShots;
    
    // Calculate dispersion per club: range (max - min) of side values
    const clubDispersions = [];
    
    // Group shots by club
    const shotsByClub = allShots.reduce((acc, shot) => {
      const club = normalizeClubName(shot.club || 'Unknown');
      if (!acc[club]) acc[club] = [];
      acc[club].push(shot);
      return acc;
    }, {});
    
    // Calculate dispersion range for each club
    Object.entries(shotsByClub).forEach(([club, shots]) => {
      if (shots.length < 2) return; // Need at least 2 shots to calculate range
      
      const sideValues = shots.map(shot => {
        const v = parseFloat(shot.side_total ?? shot.side);
        return isNaN(v) ? null : v;
      }).filter(v => v !== null);
      
      if (sideValues.length >= 2) {
        const minSide = Math.min(...sideValues); // Most negative (farthest left)
        const maxSide = Math.max(...sideValues); // Most positive (farthest right)
        const clubDispersion = maxSide - minSide; // Range = dispersion
        clubDispersions.push(clubDispersion);
      }
    });
    
    // Average the club dispersions
    const avgDispersion = clubDispersions.length > 0 
      ? clubDispersions.reduce((sum, d) => sum + d, 0) / clubDispersions.length 
      : null;

    // Get recent sessions (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentShots = allShots.filter(shot => {
      const shotDate = shot.uploadedAt?.toDate?.() || new Date(shot.uploadedAt);
      return shotDate > thirtyDaysAgo;
    });

    return {
      totalShots,
      totalSessions: sessions.length,
      totalClubs: clubs.length,
      avgCarry: Math.round(avgCarry),
      avgTotal: Math.round(avgTotal),
      dispersion: avgDispersion !== null ? Math.round(avgDispersion) : null,
      recentShots: recentShots.length,
      recentSessions: [...new Set(recentShots.map(shot => shot.batchId))].length
    };
  }, [allShots]);

  // Calculate consistency score based on dispersion percentage
  const consistencyScore = useMemo(() => {
    if (!stats || stats.dispersion === null || !stats.avgTotal) return null;
    
    // Calculate dispersion as percentage of total distance
    const dispersionPercentage = (stats.dispersion / stats.avgTotal) * 100;
    
    // Convert to a 0-100 score (lower dispersion = higher score)
    let score;
    if (dispersionPercentage <= 10) {
      score = 100 - (dispersionPercentage * 5); // Excellent: 50-100
    } else if (dispersionPercentage <= 20) {
      score = 50 - ((dispersionPercentage - 10) * 3); // Good: 20-50
    } else {
      score = Math.max(0, 20 - ((dispersionPercentage - 20) * 1)); // Poor: 0-20
    }
    
    return Math.round(score);
  }, [stats]);

  // Calculate bag analysis
  const bagAnalysis = useMemo(() => {
    if (allShots.length === 0) return null;
    
    // First normalize all club names, then deduplicate
    const normalizedClubs = allShots.map(shot => normalizeClubName(shot.club));
    const uniqueClubs = [...new Set(normalizedClubs)];
    
    window._debugDashboardClubs = uniqueClubs;
    return analyzeBag(uniqueClubs);
  }, [allShots]);

  // Calculate gap analysis
  const gapAnalysis = useMemo(() => {
    if (allShots.length === 0) return null;
    
    // Group shots by normalized club name and calculate average distances
    const clubData = allShots.reduce((acc, shot) => {
      const normalizedClub = normalizeClubName(shot.club || 'Unknown');
      if (!acc[normalizedClub]) {
        acc[normalizedClub] = { club: normalizedClub, distances: [] };
      }
      const distance = parseFloat(shot.total_distance || shot.carry_distance);
      if (!isNaN(distance)) {
        acc[normalizedClub].distances.push(distance);
      }
      return acc;
    }, {});

    // Calculate average distance for each club
    const clubAverages = Object.values(clubData).map(({ club, distances }) => ({
      club,
      avgDistance: distances.length > 0 ? distances.reduce((sum, d) => sum + d, 0) / distances.length : 0
    })).filter(club => club.avgDistance > 0);

    if (clubAverages.length < 2) return null;
    
    const gapAnalysis = analyzeGaps(clubAverages);
    
    // Add PGA comparison data
    const pgaGapAnalysis = analyzeGaps(clubAverages.map(club => ({
      ...club,
      avgDistance: getReference(club.club, selectedDataset)?.avg || club.avgDistance
    })));
    
    return {
      ...gapAnalysis,
      pgaComparison: {
        averageGap: pgaGapAnalysis.averageGap,
        difference: gapAnalysis.averageGap - pgaGapAnalysis.averageGap
      }
    };
  }, [allShots, selectedDataset]);

  const quickActions = [
    {
      title: "Upload New Session",
      href: "/upload",
      icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M12 5v14M5 12h14"/></svg>,
      description: "Add your latest practice session to track your progress.",
    },
    {
      title: "View History",
      href: "/sessions",
      icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M12 6v12M6 12h12"/></svg>,
      description: "Review your past practice sessions and performance.",
    },
    {
      title: "Analyze Shots",
      href: "/clubs",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 17v-2a4 4 0 014-4h10a4 4 0 014 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
      description: "Get detailed analytics on your shot dispersion.",
    },
    {
      title: "Profile",
      href: "/profile",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A9 9 0 1112 21a9 9 0 01-6.879-3.196z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      description: "View and edit your profile information.",
    },
  ];

  return (
    <div className="p-6 lg:p-12 animate-fade-in">
      {/* Neo-Brutalism Header */}
      <div className="mb-12">
        <div className="chunky-card bg-gradient-to-r from-green-500 to-blue-600">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
                📊 DASHBOARD
              </h1>
              <p className="text-white/90 text-lg font-medium">
                Your Golf Performance Overview
              </p>
            </div>
            <div className="text-6xl">
              🏌️‍♂️
            </div>
          </div>
        </div>
      </div>

      {/* Empty State - Show first when no data */}
      {(!stats || stats.totalShots === 0) ? (
        <div className="text-center py-16">
          <div className="text-7xl mb-4">⛳</div>
          <h2 className="text-3xl font-extrabold text-green-300 mb-4">Welcome to Dispersion Circles!</h2>
          <p className="text-gray-700 mb-8 max-w-md mx-auto text-lg">
            Start by uploading your first practice session to see your golf performance analytics.
          </p>
          <Link to="/upload" className="bg-green-300 text-black font-bold rounded-2xl px-8 py-4 text-lg shadow-tactile hover:bg-green-400 active:scale-95 transition-tactile">
            Upload Your First Session
          </Link>
        </div>
      ) : (
        <>
          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="chunky-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Sessions</p>
                  <p className="text-2xl font-bold text-gray-800 font-sans">{formatInteger(stats.totalSessions)}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="chunky-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Shots</p>
                  <p className="text-2xl font-bold text-gray-800 font-sans">{formatInteger(stats.totalShots)}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="chunky-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Consistency Score</p>
                  <p className="text-2xl font-bold text-gray-800 font-sans">
                    {consistencyScore !== null ? `${consistencyScore}/100` : 'N/A'}
                  </p>
                  {consistencyScore !== null && (
                    <p className={`text-xs ${consistencyScore >= 70 ? 'text-green-600' : consistencyScore >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {consistencyScore >= 70 ? 'Excellent' : consistencyScore >= 40 ? 'Good' : 'Needs Work'}
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="chunky-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Avg Dispersion Range</p>
                  <p className="text-2xl font-bold text-gray-800 font-sans">
                    {stats.dispersion !== null ? formatYards(stats.dispersion) : 'N/A'}
                  </p>
                  {stats.dispersion !== null && (
                    <p className={`text-xs ${
                      stats.dispersion >= 10 && stats.dispersion <= 20 ? 'text-green-600' :
                      stats.dispersion > 20 && stats.dispersion <= 30 ? 'text-yellow-600' :
                      stats.dispersion > 30 && stats.dispersion <= 50 ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {stats.dispersion >= 10 && stats.dispersion <= 20 ? 'Great' :
                       stats.dispersion > 20 && stats.dispersion <= 30 ? 'Good' :
                       stats.dispersion > 30 && stats.dispersion <= 50 ? 'Work On' :
                       'N/A'}
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Bag & Gap Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Bag Analysis */}
            {bagAnalysis && (
              <div className="chunky-card">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Bag Analysis</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="mb-4 space-y-2">
                      <div className="flex items-center">
                        <span className="text-gray-600 w-24">Total Clubs:</span>
                        <span className={`text-lg font-bold ${getColorClass(
                          bagAnalysis.bagStatus === 'over_limit' ? 'red' : 
                          bagAnalysis.bagStatus === 'full' ? 'yellow' : 'green', 'text'
                        )}`}>
                          {bagAnalysis.totalClubs}/13 + 1 putter
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-gray-600 w-24">Status:</span>
                        <span className={`font-semibold ${getColorClass(
                          bagAnalysis.bagStatus === 'over_limit' ? 'red' : 
                          bagAnalysis.bagStatus === 'full' ? 'yellow' : 'green', 'text'
                        )}`}>
                          {bagAnalysis.message}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-gray-600 w-24">Wedges:</span>
                        <span className="text-gray-800 ml-4">{bagAnalysis.composition?.wedges || 0}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-gray-600 w-24">Irons:</span>
                        <span className="text-gray-800 ml-4">{bagAnalysis.composition?.irons || 0}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-gray-600 w-24">Hybrids:</span>
                        <span className="text-gray-800 ml-4">{bagAnalysis.composition?.hybrids || 0}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-gray-600 w-24">Woods/Driver:</span>
                        <span className="text-gray-800 ml-4">{(bagAnalysis.composition?.woods || 0) + (bagAnalysis.composition?.drivers || 0)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">PGA Tour Recommendations</h3>
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
            )}

            {/* Gap Analysis */}
            {gapAnalysis && gapAnalysis.gaps && gapAnalysis.gaps.length > 0 && (
              <div className="chunky-card">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Gap Analysis</h2>
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
                        <span className="text-gray-600">{COMPARISON_DATASETS[selectedDataset]?.name || 'PGA Tour'} Average:</span>
                        <span className="text-orange-600 font-semibold">
                          {gapAnalysis.pgaComparison?.averageGap || 12} yards
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Difference:</span>
                        <span className={`font-semibold ${getColorClass(
                          getStandardizedColor(Math.abs(gapAnalysis.pgaComparison?.difference || 0), 2).color, 'text'
                        )}`}>
                          {gapAnalysis.pgaComparison?.difference > 0 ? '+' : ''}{Math.round(gapAnalysis.pgaComparison?.difference || 0)} yards
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
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 tracking-tight">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {quickActions.map((action, index) => (
                <Link
                  key={action.title}
                  to={action.href}
                  className={`chunky-card flex flex-col items-center justify-center transition-all hover:scale-105 cursor-pointer group animate-fade-in`}
                  style={{ animationDelay: `${0.4 + index * 0.1}s` }}
                  title={action.title}
                >
                  <div className={`w-16 h-16 flex items-center justify-center mx-auto mb-4 text-3xl rounded-full ${
                    index === 0 ? 'bg-blue-500 text-white' : index === 1 ? 'bg-green-500 text-white' : index === 2 ? 'bg-yellow-500 text-white' : 'bg-purple-500 text-white'
                  } shadow-lg group-hover:scale-110 transition-transform duration-150`}>
                    {action.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{action.title}</h3>
                  <p className="text-base text-gray-600 text-center">{action.description}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          {stats.recentSessions > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 tracking-tight">Recent Activity</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="chunky-card">
                  <div className="px-8 py-6 border-b-4 border-gray-300">
                    <h3 className="text-lg font-semibold text-gray-800">Last 30 Days</h3>
                  </div>
                  <div className="px-8 py-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Shots Hit</span>
                        <span className="text-gray-800 font-semibold">{stats.recentShots}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Sessions</span>
                        <span className="text-gray-800 font-semibold">{stats.recentSessions}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Avg Shots/Session</span>
                        <span className="text-gray-800 font-semibold">
                          {Math.round(stats.recentShots / stats.recentSessions)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="chunky-card">
                  <div className="px-8 py-6 border-b-4 border-gray-300">
                    <h3 className="text-lg font-semibold text-gray-800">Your Bag</h3>
                  </div>
                  <div className="px-8 py-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Clubs Used</span>
                        <span className="text-gray-800 font-semibold">{stats.totalClubs}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Sessions</span>
                        <span className="text-gray-800 font-semibold">{stats.totalSessions}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Avg Shots/Session</span>
                        <span className="text-gray-800 font-semibold">
                          {Math.round(stats.totalShots / stats.totalSessions)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;