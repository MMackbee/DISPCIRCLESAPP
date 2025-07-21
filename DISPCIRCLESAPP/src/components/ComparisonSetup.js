import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const ComparisonSetup = ({ user }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSessions, setSelectedSessions] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSessions = async () => {
      if (!user) return;
      
      try {
        const userDataRef = collection(db, 'userData');
        const q = query(
          userDataRef,
          where('uid', '==', user.uid)
        );
        
        const querySnapshot = await getDocs(q);
        
        // Group by batchId to get unique sessions
        const sessionsMap = {};
        querySnapshot.docs.forEach(doc => {
          const data = doc.data();
          const batchId = data.batchId;
          
          if (!sessionsMap[batchId]) {
            let uploadedAt;
            try {
              if (data.uploadedAt && typeof data.uploadedAt.toDate === 'function') {
                uploadedAt = data.uploadedAt.toDate();
              } else if (data.uploadedAt && data.uploadedAt.seconds) {
                uploadedAt = new Date(data.uploadedAt.seconds * 1000);
              } else if (data.uploadedAt && !isNaN(Date.parse(data.uploadedAt))) {
                uploadedAt = new Date(data.uploadedAt);
              } else {
                uploadedAt = new Date();
              }
            } catch (error) {
              uploadedAt = new Date();
            }
            
            sessionsMap[batchId] = {
              id: batchId,
              sessionName: data.sessionName || data.notes || 'Untitled Session',
              uploadDate: uploadedAt,
              totalShots: 0,
              totalDistance: 0,
              fileName: data.sessionName || data.notes || 'Untitled Session'
            };
          }
          sessionsMap[batchId].totalShots += 1;
        });
        
        // Convert to array and sort by upload date
        const sessionsData = Object.values(sessionsMap).sort((a, b) => b.uploadDate - a.uploadDate);
        setSessions(sessionsData);
      } catch (error) {
        console.error('Error fetching sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [user]);

  const handleSessionToggle = (sessionId) => {
    setSelectedSessions(prev => ({
      ...prev,
      [sessionId]: !prev[sessionId]
    }));
  };

  const handleCompareSessions = () => {
    const selectedIds = Object.keys(selectedSessions).filter(id => selectedSessions[id]);
    if (selectedIds.length >= 2) {
      const idsParam = selectedIds.join(',');
      navigate(`/compare/view?ids=${idsParam}`);
    }
  };

  const selectedCount = Object.values(selectedSessions).filter(Boolean).length;

  if (loading) {
    return (
      <div className="p-6 lg:p-12 animate-fade-in">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-300 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading sessions...</p>
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
                🔄 COMPARE SESSIONS
              </h1>
              <p className="text-white/90 text-lg font-medium">
                Select Sessions to Compare
              </p>
            </div>
            <div className="text-6xl">
              📊
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        {sessions.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-7xl mb-4">📈</div>
            <h2 className="text-3xl font-extrabold text-gray-800 mb-4">No Sessions Found</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto text-lg">
              Upload some practice sessions to start comparing your performance.
            </p>
          </div>
        ) : (
          <>
            {/* Instructions */}
            <div className="chunky-card mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">How to Compare Sessions</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-4xl mb-2">1️⃣</div>
                  <h3 className="font-semibold text-gray-800 mb-2">Select Sessions</h3>
                  <p className="text-gray-600 text-sm">Choose 2 or more sessions you want to compare</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl mb-2">2️⃣</div>
                  <h3 className="font-semibold text-gray-800 mb-2">Review Data</h3>
                  <p className="text-gray-600 text-sm">See side-by-side performance metrics</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl mb-2">3️⃣</div>
                  <h3 className="font-semibold text-gray-800 mb-2">Analyze Progress</h3>
                  <p className="text-gray-600 text-sm">Identify improvements and trends</p>
                </div>
              </div>
            </div>

            {/* Session Selection */}
            <div className="chunky-card mb-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Select Sessions to Compare</h2>
                <div className="text-sm text-gray-600">
                  {selectedCount} of {sessions.length} selected
                </div>
              </div>

              <div className="space-y-4">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      selectedSessions[session.id]
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-6 h-6">
                          <input
                            type="checkbox"
                            checked={!!selectedSessions[session.id]}
                            onChange={() => handleSessionToggle(session.id)}
                            className="chunky-checkbox w-5 h-5"
                          />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-800">
                            {session.sessionName || 'Untitled Session'}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>📅 {session.uploadDate.toLocaleString()}</span>
                            <span>🎯 {session.totalShots || 0} shots</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Batch ID</div>
                        <div className="font-mono text-xs text-gray-400">{session.id}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Compare Button */}
            <div className="text-center">
              <button
                onClick={handleCompareSessions}
                disabled={selectedCount < 2}
                className={`chunky-button text-lg px-8 py-4 ${
                  selectedCount < 2
                    ? 'chunky-button-disabled'
                    : 'chunky-button-primary'
                }`}
              >
                {selectedCount < 2
                  ? `Select ${2 - selectedCount} more session${2 - selectedCount === 1 ? '' : 's'}`
                  : `Compare ${selectedCount} Sessions`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ComparisonSetup; 