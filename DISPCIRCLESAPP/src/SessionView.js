import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";

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

const SessionView = ({ user }) => {
  const { batchId } = useParams();
  const [allShots, setAllShots] = useState([]);
  const [availableClubs, setAvailableClubs] = useState([]);
  const [selectedClubs, setSelectedClubs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSessionData = async () => {
      if (!user || !batchId) return;
      setLoading(true);
      try {
        const q = query(
          collection(db, "userData"),
          where("batchId", "==", batchId),
          where("uid", "==", user.uid)
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          setError("No data found for this session.");
          return;
        }

        const sessionShots = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            carry: parseFloat(data.carry_distance || 0),
            side: parseFloat(data.side_total || data.side || 0),
            club: data.club || "Unknown"
          };
        });

        setAllShots(sessionShots);
        const clubs = [...new Set(sessionShots.map(s => s.club))];
        setAvailableClubs(clubs);
        const initialSelected = {};
        clubs.forEach(club => (initialSelected[club] = true));
        setSelectedClubs(initialSelected);
      } catch (err) {
        console.error("Failed to fetch session data:", err);
        setError("An error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchSessionData();
  }, [user, batchId]);

  const filteredShots = useMemo(() => {
    return allShots.filter(shot => selectedClubs[shot.club]);
  }, [allShots, selectedClubs]);

  const svgWidth = 800, svgHeight = 600, padding = 50;
  const maxCarry = Math.max(...allShots.map(s => s.carry), 100);
  const maxSide = Math.max(...allShots.map(s => Math.abs(s.side)), 30);
  const getX = (side) => ((side + maxSide) / (2 * maxSide)) * (svgWidth - 2 * padding) + padding;
  const getY = (carry) => svgHeight - padding - (carry / maxCarry) * (svgHeight - 2 * padding);

  if (loading) return <div className="bg-gray-900 text-white p-8 text-center">Loading session...</div>;
  if (error) return <div className="bg-gray-900 text-white p-8 text-center">{error}</div>;

  return (
    <div className="bg-gray-900 text-white min-h-screen p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-6xl">
        <Link to="/dashboard" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">&larr; Back to Dashboard</Link>
        <h1 className="text-3xl font-bold mb-2">Session Analysis</h1>
        <p className="text-gray-400 mb-6">Batch ID: {batchId}</p>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="bg-gray-800 rounded-lg p-4 w-full md:w-1/4">
            <h3 className="text-lg font-bold border-b border-gray-700 pb-2 mb-3">Filter by Club</h3>
            <div className="space-y-2">
              {availableClubs.map(club => (
                <label key={club} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedClubs[club] || false}
                    onChange={() =>
                      setSelectedClubs(prev => ({ ...prev, [club]: !prev[club] }))
                    }
                    className="h-5 w-5 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-600"
                  />
                  <span>{club}</span>
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: generateColor(club) }}></div>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 w-full md:w-3/4">
            <svg width="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
              <line x1={svgWidth / 2} y1={padding} x2={svgWidth / 2} y2={svgHeight - padding} stroke="rgba(255,0,0,0.5)" strokeWidth="2" strokeDasharray="5,5" />
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
              {filteredShots.map((shot, i) => (
                <circle
                  key={i}
                  cx={getX(shot.side)}
                  cy={getY(shot.carry)}
                  r="5"
                  fill={generateColor(shot.club)}
                  fillOpacity="0.7"
                  stroke="white"
                  strokeWidth="1"
                />
              ))}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionView;
