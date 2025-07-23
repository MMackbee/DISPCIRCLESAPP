import React, { useState } from 'react';
import CSVUploader from './CSVUploader';
import { db } from './firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useComparison } from './ComparisonContext';

const getRandomTargets = () => Array.from({ length: 20 }, () => Math.floor(Math.random() * (120 - 25 + 1)) + 25);

const WedgeCombine = ({ user }) => {
  const [targets, setTargets] = useState([]);
  const [score, setScore] = useState(null);
  const [results, setResults] = useState([]);
  const [gameState, setGameState] = useState('setup');
  const navigate = useNavigate();
  const { selectedDataset } = useComparison();

  const startCombine = () => {
    setTargets(getRandomTargets());
    setScore(null);
    setResults([]);
    setGameState('awaiting_upload');
  };

  const handleUploadComplete = async (data) => {
    const shots = data.slice(0, 20);
    const shotResults = shots.map((shot, i) => {
      const carry = parseFloat(shot.carry_distance);
      const target = targets[i];
      const shotScore = Math.max(0, 100 - Math.abs(carry - target));
      return {
        target,
        actual: isNaN(carry) ? null : carry,
        score: shotScore
      };
    });
    const finalScore = Math.round(
      shotResults.reduce((sum, s) => sum + s.score, 0) / shotResults.length
    );
    setScore(finalScore);
    setResults(shotResults);
    setGameState('results');
    // Save to Firestore
    const resultDoc = {
      uid: user.uid,
      gameType: 'wedge_combine',
      score: finalScore,
      timestamp: Timestamp.now(),
      details: {
        spiderChartData: [], // Not used
        shotBreakdown: shotResults
      },
      comparisonDataset: selectedDataset || 'pga_tour'
    };
    await addDoc(collection(db, 'gameResults'), resultDoc);
    navigate('/practice/results');
  };

  return (
    <div className="p-6 lg:p-12 animate-fade-in max-w-3xl mx-auto">
      <div className="chunky-card mb-8">
        <h1 className="text-3xl font-bold mb-4 text-gray-800 flex items-center gap-2">🎯 Wedge Combine</h1>
        <p className="text-gray-600 mb-4">Test your wedge game! Generate 20 random target yardages and upload your results to see your score.</p>
        {gameState === 'setup' && (
          <button
            className="chunky-button chunky-button-primary px-8 py-3 text-lg mb-4"
            onClick={startCombine}
          >
            Start New Combine
          </button>
        )}
        {gameState === 'awaiting_upload' && targets.length > 0 && (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2 text-gray-800">Your Targets:</h2>
              <div className="flex flex-wrap gap-2">
                {targets.map((t, i) => (
                  <span key={i} className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-mono text-lg">{t} yds</span>
                ))}
              </div>
            </div>
            <CSVUploader onUploadComplete={handleUploadComplete} />
          </>
        )}
        {gameState === 'results' && (
          <div className="mt-8">
            <h2 className="text-3xl font-extrabold text-green-700 mb-4">Combine Score: {score}/100</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border border-gray-300 rounded-lg">
                <thead>
                  <tr className="bg-green-100">
                    <th className="px-4 py-2">#</th>
                    <th className="px-4 py-2">Target</th>
                    <th className="px-4 py-2">Actual Carry</th>
                    <th className="px-4 py-2">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} className="text-center border-b">
                      <td className="px-4 py-2 font-mono">{i + 1}</td>
                      <td className="px-4 py-2 font-mono">{r.target}</td>
                      <td className="px-4 py-2 font-mono">{r.actual !== null ? r.actual : <span className="text-red-500">N/A</span>}</td>
                      <td className="px-4 py-2 font-mono font-bold">{r.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              className="chunky-button chunky-button-secondary mt-6"
              onClick={startCombine}
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WedgeCombine; 