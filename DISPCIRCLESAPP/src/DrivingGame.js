import React, { useState } from 'react';
import CSVUploader from './CSVUploader';
import { db } from './firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useComparison } from './ComparisonContext';

const DIFFICULTY_SETTINGS = {
  pro: {
    label: 'Pro',
    targetWidth: [7, 10],
    acceptableMiss: [3, 5],
  },
  advanced: {
    label: 'Advanced',
    targetWidth: [11, 14],
    acceptableMiss: [6, 9],
  },
  beginner: {
    label: 'Beginner',
    targetWidth: [15, 17],
    acceptableMiss: [10, 13],
  },
};

const getRandom = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomSide = () => (Math.random() < 0.5 ? 'Left' : 'Right');

const generateTargets = (shots, difficulty) => {
  const settings = DIFFICULTY_SETTINGS[difficulty];
  return Array.from({ length: shots }, () => ({
    width: getRandom(settings.targetWidth[0], settings.targetWidth[1]),
    miss: getRandom(settings.acceptableMiss[0], settings.acceptableMiss[1]),
    side: getRandomSide(),
  }));
};

function downloadCSVTemplate(targets) {
  const headers = ['#', 'Target Width', 'Acceptable Miss', 'Side', 'Actual Side'];
  const rows = targets.map((t, i) => [i+1, t.width, t.miss, t.side, '']);
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `driving_template_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const DrivingGame = ({ user, difficulty }) => {
  const [targets, setTargets] = useState([]);
  const [results, setResults] = useState([]);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState('setup');
  const [endReason, setEndReason] = useState(null);
  const [showReminder, setShowReminder] = useState(false);
  const navigate = useNavigate();
  const { selectedDataset } = useComparison();

  const startGame = () => {
    setTargets(generateTargets(15, difficulty));
    setResults([]);
    setScore(0);
    setGameState('awaiting_upload');
    setEndReason(null);
    setShowReminder(true);
  };

  const handleUploadComplete = async (data) => {
    let fairwayHits = 0;
    const shotResults = [];
    for (let i = 0; i < 15 && i < data.length; i++) {
      const shot = data[i];
      const sideVal = parseFloat(shot.side_total ?? shot.side);
      const t = targets[i];
      const inFairway = Math.abs(sideVal) <= t.width / 2;
      if (inFairway) fairwayHits++;
      shotResults.push({
        idx: i + 1,
        width: t.width,
        miss: t.miss,
        side: t.side,
        actual: isNaN(sideVal) ? null : sideVal,
        inFairway,
      });
    }
    const fairwayPct = Math.round((fairwayHits / 15) * 100);
    setResults(shotResults);
    setScore(fairwayPct);
    setGameState('results');
    // Save to Firestore
    const resultDoc = {
      uid: user.uid,
      gameType: 'driving_game',
      score: fairwayPct,
      timestamp: Timestamp.now(),
      details: {
        fairwaysHit: fairwayHits,
        totalShots: 15,
        fairwayWidth: targets[0]?.width || null,
        shotBreakdown: shotResults
      },
      comparisonDataset: selectedDataset || 'pga_tour'
    };
    await addDoc(collection(db, 'gameResults'), resultDoc);
    navigate('/practice/results');
  };

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">Driving Game ({DIFFICULTY_SETTINGS[difficulty].label})</h2>
      <p className="text-gray-600 mb-4">15 drives. Hit within the target width and on the correct side for points. Game ends at 15 or -10 points.</p>
      {gameState === 'setup' && (
        <button
          className="chunky-button chunky-button-primary px-8 py-3 text-lg mb-4"
          onClick={startGame}
        >
          Start Driving Game
        </button>
      )}
      {gameState === 'awaiting_upload' && targets.length > 0 && (
        <>
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-800">Your Targets:</h3>
            <div className="flex flex-wrap gap-2">
              {targets.map((t, i) => (
                <span key={i} className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-mono text-lg">
                  {t.width}yd width, {t.miss}yd miss, {t.side}
                </span>
              ))}
            </div>
          </div>
          <CSVUploader onUploadComplete={handleUploadComplete} />
        </>
      )}
      {gameState === 'results' && (
        <div className="mt-8">
          <h2 className="text-3xl font-extrabold text-green-700 mb-4">Fairway Hit %: {score}%</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-gray-300 rounded-lg">
              <thead>
                <tr className="bg-green-100">
                  <th className="px-4 py-2">#</th>
                  <th className="px-4 py-2">Target Width</th>
                  <th className="px-4 py-2">Acceptable Miss</th>
                  <th className="px-4 py-2">Side</th>
                  <th className="px-4 py-2">Actual Side</th>
                  <th className="px-4 py-2">Fairway Hit?</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="text-center border-b">
                    <td className="px-4 py-2 font-mono">{r.idx}</td>
                    <td className="px-4 py-2 font-mono">{r.width}</td>
                    <td className="px-4 py-2 font-mono">{r.miss}</td>
                    <td className="px-4 py-2 font-mono">{r.side}</td>
                    <td className="px-4 py-2 font-mono">{r.actual !== null ? r.actual.toFixed(1) : <span className="text-red-500">N/A</span>}</td>
                    <td className="px-4 py-2 font-mono font-bold">{r.inFairway ? '✅' : '❌'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="chunky-button chunky-button-secondary mt-6"
            onClick={startGame}
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
};

export default DrivingGame; 