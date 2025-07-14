import React, { useState, useMemo, useEffect } from "react";
import { db } from '../firebase';
import { collection, query, where, getDocs } from "firebase/firestore";
import { Link } from "react-router-dom";

const Dashboard = ({ user }) => {
  const [allShots, setAllShots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    handicap: "",
    age: "",
    desiredHandicap: "",
    elevation: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const q = query(collection(db, 'userData'), where('uid', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const shots = querySnapshot.docs.map(doc => doc.data());
        setAllShots(shots);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSignOut = async () => {
    try {
      // await signOut(auth); // This line was removed as per the edit hint
    } catch (error) {
      console.error("Sign out error:", error.message);
    }
  };

  const stats = useMemo(() => {
    if (allShots.length === 0) return null;

    const sessions = [...new Set(allShots.map(shot => shot.batchId))];
    const clubs = [...new Set(allShots.map(shot => shot.club))];
    
    const totalShots = allShots.length;
    const avgCarry = allShots.reduce((sum, shot) => sum + (parseFloat(shot.carry_distance) || 0), 0) / totalShots;
    // Fix avgSide: filter out NaN, use side_total or side, and handle missing data
    const sideValues = allShots.map(shot => {
      const v = parseFloat(shot.side_total ?? shot.side);
      return isNaN(v) ? null : Math.abs(v);
    }).filter(v => v !== null);
    const avgSide = sideValues.length > 0 ? sideValues.reduce((sum, v) => sum + v, 0) / sideValues.length : null;

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
      avgSide: avgSide !== null ? Math.round(avgSide) : null,
      recentShots: recentShots.length,
      recentSessions: [...new Set(recentShots.map(shot => shot.batchId))].length
    };
  }, [allShots]);

  const quickActions = [
    {
      title: "Upload New Session",
      href: "/dashboard",
      icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M12 5v14M5 12h14"/></svg>,
      description: "Add your latest practice session to track your progress.",
    },
    {
      title: "View History",
      href: "/history",
      icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M12 6v12M6 12h12"/></svg>,
      description: "Review your past practice sessions and performance.",
    },
    {
      title: "Analyze Shots",
      href: "/analyze",
      icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M12 16v-4l-4-4"/></svg>,
      description: "Get detailed analytics on your shot dispersion.",
    },
    {
      title: "Settings",
      href: "/settings",
      icon: <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/></svg>,
      description: "Customize your app settings and preferences.",
    },
  ];

  return (
    <div className="p-6 lg:p-12 animate-fade-in">
      {/* Remove the top welcome header for a cleaner look */}
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div className="bg-glass rounded-2xl shadow-golf p-6 flex flex-col items-center justify-center transition-tactile hover:shadow-tactile hover:scale-105 cursor-pointer group" title="Total shots recorded">
            <div className="text-4xl font-extrabold text-blue-300 mb-2 drop-shadow">{stats.totalShots}</div>
            <div className="text-base text-white font-medium">Total Shots</div>
          </div>
          <div className="bg-glass rounded-2xl shadow-golf p-6 flex flex-col items-center justify-center transition-tactile hover:shadow-tactile hover:scale-105 cursor-pointer group" title="Practice sessions completed">
            <div className="text-4xl font-extrabold text-green-300 mb-2 drop-shadow">{stats.totalSessions}</div>
            <div className="text-base text-white font-medium">Practice Sessions</div>
          </div>
          <div className="bg-glass rounded-2xl shadow-golf p-6 flex flex-col items-center justify-center transition-tactile hover:shadow-tactile hover:scale-105 cursor-pointer group" title="Average carry distance">
            <div className="text-4xl font-extrabold text-yellow-300 mb-2 drop-shadow">{stats.avgCarry}</div>
            <div className="text-base text-white font-medium">Avg Carry (yds)</div>
          </div>
          <div className="bg-glass rounded-2xl shadow-golf p-6 flex flex-col items-center justify-center transition-tactile hover:shadow-tactile hover:scale-105 cursor-pointer group" title="Average side dispersion">
            <div className="text-4xl font-extrabold text-blue-300 mb-2 drop-shadow">{stats.avgSide !== null ? stats.avgSide : '—'}</div>
            <div className="text-base text-white font-medium">Avg Side (yds)</div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-green-300 mb-6 tracking-tight">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {quickActions.map((action, index) => (
            <Link
              key={action.title}
              to={action.href}
              className={`bg-glass rounded-2xl shadow-golf p-6 flex flex-col items-center justify-center transition-tactile hover:shadow-tactile hover:scale-105 cursor-pointer group animate-fade-in`}
              style={{ animationDelay: `${0.4 + index * 0.1}s` }}
              title={action.title}
            >
              <div className={`w-16 h-16 flex items-center justify-center mx-auto mb-4 text-3xl rounded-full ${
                index === 0 ? 'bg-blue-300 text-black' : index === 1 ? 'bg-green-300 text-black' : index === 2 ? 'bg-yellow-300 text-black' : 'bg-white text-black'
              } shadow-tactile group-hover:scale-110 transition-transform duration-150`}>
                {action.icon}
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{action.title}</h3>
              <p className="text-base text-white text-center">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      {stats && stats.recentSessions > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-green-300 mb-6 tracking-tight">Recent Activity</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-glass rounded-2xl shadow-golf">
              <div className="px-8 py-6 border-b border-gray-800">
                <h3 className="text-lg font-semibold text-white">Last 30 Days</h3>
              </div>
              <div className="px-8 py-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-white">Shots Hit</span>
                    <span className="text-white font-semibold">{stats.recentShots}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white">Sessions</span>
                    <span className="text-white font-semibold">{stats.recentSessions}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white">Avg Shots/Session</span>
                    <span className="text-white font-semibold">
                      {Math.round(stats.recentShots / stats.recentSessions)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-glass rounded-2xl shadow-golf">
              <div className="px-8 py-6 border-b border-gray-800">
                <h3 className="text-lg font-semibold text-white">Your Bag</h3>
              </div>
              <div className="px-8 py-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-white">Clubs Used</span>
                    <span className="text-white font-semibold">{stats.totalClubs}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white">Total Sessions</span>
                    <span className="text-white font-semibold">{stats.totalSessions}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-white">Avg Shots/Session</span>
                    <span className="text-white font-semibold">
                      {Math.round(stats.totalShots / stats.totalSessions)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!stats || stats.totalShots === 0) && (
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
      )}
    </div>
  );
};

export default Dashboard;
