import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, query, where, onSnapshot, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";
import { formatInteger } from './clubOrdering';

const ImportHistory = ({ user }) => {
  const [history, setHistory] = useState([]);
  const [deleting, setDeleting] = useState(null); // batchId being deleted

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "userData"), where("uid", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const batches = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        const batchId = data.batchId;
        if (!batches[batchId]) {
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
          batches[batchId] = {
            sessionName: data.sessionName || "",
            notes: data.notes || "No notes",
            uploadedAt,
            batchId,
            shotCount: 0,
          };
        }
        batches[batchId].shotCount += 1;
      });
      const sorted = Object.values(batches).sort((a, b) => b.uploadedAt - a.uploadedAt);
      setHistory(sorted);
    });
    return () => unsubscribe();
  }, [user]);

  // Delete all userData docs for a batchId
  const handleDeleteSession = async (batchId) => {
    if (!window.confirm("Are you sure you want to delete this session? This cannot be undone.")) return;
    setDeleting(batchId);
    try {
      const q = query(collection(db, "userData"), where("uid", "==", user.uid), where("batchId", "==", batchId));
      const snapshot = await getDocs(q);
      const deletions = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletions);
    } catch (err) {
      alert("Failed to delete session. Please try again.");
    }
    setDeleting(null);
  };

  return (
    <div className="p-6 lg:p-12 animate-fade-in">
      <div className="max-w-6xl mx-auto">
        {/* Neo-Brutalism Header */}
        <div className="mb-12">
          <div className="chunky-card bg-gradient-to-r from-purple-500 to-pink-600">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
                  📚 SESSION HISTORY
                </h1>
                <p className="text-white/90 text-lg font-medium">
                  Review Your Practice Sessions
                </p>
              </div>
              <div className="text-6xl">
                📖
              </div>
            </div>
          </div>
        </div>
        <div className="chunky-card">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">📚 Session History</h3>
            <p className="text-gray-600">Click on any session to view detailed analysis</p>
          </div>

          {history.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-7xl mb-4">📊</div>
              <h2 className="text-3xl font-extrabold text-gray-800 mb-4">No Sessions Yet</h2>
              <p className="text-gray-600 mb-8 max-w-md mx-auto text-lg">
                Start by uploading your first practice session to see your golf performance analytics.
              </p>
              <Link to="/upload" className="bg-green-300 text-black font-bold rounded-2xl px-8 py-4 text-lg shadow-tactile hover:bg-green-400 active:scale-95 transition-tactile">
                Upload Your First Session
              </Link>
            </div>
          ) : (
            <div className="grid gap-6">
              {history.map((entry) => (
                <div key={entry.batchId} className="relative group">
                  <Link to={`/session/${entry.batchId}`}>
                    <div className="chunky-card hover:bg-green-50/10 transition-all hover:scale-[1.02] cursor-pointer group">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-bold text-gray-800 mb-4 text-lg group-hover:text-green-600 transition-colors">
                            📝 {entry.sessionName || entry.notes}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center space-x-3">
                              <span className="text-blue-600 text-lg">📅</span>
                              <span className="text-gray-700">{entry.uploadedAt.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className="text-yellow-600 text-lg">🎯</span>
                              <span className="text-gray-700 font-sans font-semibold">{formatInteger(entry.shotCount)} shots</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-gray-500 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-gray-100 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 font-mono">
                            ID: {entry.batchId.slice(-8)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                  <button
                    className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg z-10"
                    title="Delete session"
                    disabled={deleting === entry.batchId}
                    onClick={() => handleDeleteSession(entry.batchId)}
                  >
                    {deleting === entry.batchId ? (
                      <span className="animate-spin">⏳</span>
                    ) : (
                      <span>🗑️</span>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportHistory;
