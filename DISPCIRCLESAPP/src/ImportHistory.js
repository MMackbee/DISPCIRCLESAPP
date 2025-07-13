import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";

const ImportHistory = ({ user }) => {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return;

      try {
        const q = query(collection(db, "userData"), where("uid", "==", user.uid));
        const snapshot = await getDocs(q);

        const batches = {};
        snapshot.forEach((doc) => {
          const data = doc.data();
          const batchId = data.batchId;
          if (!batches[batchId]) {
            batches[batchId] = {
              notes: data.notes || "No notes",
              uploadedAt: data.uploadedAt?.toDate?.() || new Date(),
              batchId,
              shotCount: 0,
            };
          }
          batches[batchId].shotCount += 1;
        });

        const sorted = Object.values(batches).sort((a, b) => b.uploadedAt - a.uploadedAt);
        setHistory(sorted);
      } catch (err) {
        console.error("❌ Failed to fetch history:", err);
      }
    };

    fetchHistory();
  }, [user]);

  return (
    <div className="bg-gray-900 text-white p-6 mt-6 rounded-lg max-w-xl mx-auto" id="history">
      <h3 className="text-lg font-bold mb-4">📜 Import History</h3>

      {history.length === 0 ? (
        <p className="text-gray-400">No previous uploads found.</p>
      ) : (
        <ul className="space-y-3 text-sm">
          {history.map((entry) => (
            <Link to={`/session/${entry.batchId}`} key={entry.batchId}>
              <li className="p-4 rounded bg-gray-800 hover:bg-gray-700 transition cursor-pointer">
                <div className="font-bold">📝 {entry.notes}</div>
                <div className="text-gray-400"><strong>📅 Date:</strong> {entry.uploadedAt.toLocaleString()}</div>
                <div className="text-gray-400"><strong>샷 (Shots):</strong> {entry.shotCount}</div>
                <div className="text-gray-500 text-xs mt-2">
                  <strong>ID:</strong> {entry.batchId}
                </div>
              </li>
            </Link>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ImportHistory;
