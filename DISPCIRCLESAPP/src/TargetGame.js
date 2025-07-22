import React, { useState, useEffect } from 'react';
import CSVUploader from './CSVUploader';
import seedrandom from 'seedrandom';
import { db } from './firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { useComparison } from './ComparisonContext';

const DIFFICULTY_SETTINGS = {
  pro: { label: 'Pro', pct: 0.10, win: 40 },
  am: { label: 'Am', pct: 0.20, win: 30 },
  weekend: { label: 'Weekend Warrior', pct: 0.30, win: 20 },
};

const getRandomTargets = (count, min, max) => {
  return Array.from({ length: count }, () => Math.floor(Math.random() * (max - min + 1)) + min);
};
const getRandomSide = () => (Math.random() < 0.5 ? 'Left' : 'Right');
const getRandomDist = () => (Math.random() < 0.5 ? 'Short' : 'Long');
const getRandomPct = (base, spread=0.05) => base + (Math.random() * 2 - 1) * spread;

function getSeededRandomTargets(count, min, max, seed) {
  const rng = seedrandom(seed);
  return Array.from({ length: count }, () => Math.floor(rng() * (max - min + 1)) + min);
}

function shuffleArray(array) {
  // Fisher-Yates shuffle
  let arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const SKILL_KEY = 'wedge_skill_score';
const BEST_KEY = 'wedge_best_score';

function downloadCSVTemplate(targets, metrics, challengeMode) {
  let headers = ['#', 'Target'];
  if (challengeMode) {
    headers = headers.concat(['Dist Win', 'Dist Side', 'Side Win', 'Side Pref']);
  }
  headers = headers.concat(['Carry', 'Side']);
  const rows = targets.map((t, i) => {
    const base = [i+1, t];
    let metricCols = [];
    if (challengeMode) {
      metricCols = [
        metrics[i]?.distWin,
        metrics[i]?.distPref,
        metrics[i]?.sideWin,
        metrics[i]?.sidePref
      ];
    }
    return base.concat(metricCols, '', '');
  });
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `combine_template_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const TargetGame = ({ label, shots, min, max, scoring, description }) => {
  const [difficulty, setDifficulty] = useState('pro');
  const [targets, setTargets] = useState([]);
  const [metrics, setMetrics] = useState([]); // per-shot: {distWin, distPref, sideWin, sidePref}
  const [score, setScore] = useState(null);
  const [shotResults, setShotResults] = useState([]);
  const [showUploader, setShowUploader] = useState(true);
  const [manualMode, setManualMode] = useState(false);
  const [challengeMode, setChallengeMode] = useState(false);
  const [manualShots, setManualShots] = useState(Array(shots).fill({ carry: '', side: '' }));
  const [endReason, setEndReason] = useState(null);
  const [showReminder, setShowReminder] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [skillScore, setSkillScore] = useState(() => localStorage.getItem(SKILL_KEY) ? Number(localStorage.getItem(SKILL_KEY)) : null);
  const [bestScore, setBestScore] = useState(() => localStorage.getItem(BEST_KEY) ? Number(localStorage.getItem(BEST_KEY)) : null);
  const [lastScore, setLastScore] = useState(() => localStorage.getItem(SKILL_KEY) ? Number(localStorage.getItem(SKILL_KEY)) : null);
  const [gameState, setGameState] = useState('setup');
  const navigate = useNavigate();
  const { selectedDataset } = useComparison();

  const startGame = () => {
    let t;
    if (testMode && label.toLowerCase().includes('wedge')) {
      // Generate fixed pool, then shuffle
      const pool = getSeededRandomTargets(shots, min, max, 'wedge-test-seed-v1');
      t = shuffleArray(pool);
    } else {
      t = getRandomTargets(shots, min, max);
    }
    setTargets(t);
    setScore(null);
    setShotResults([]);
    setShowUploader(true);
    setManualShots(Array(shots).fill({ carry: '', side: '' }));
    setEndReason(null);
    setShowReminder(true);
    if (challengeMode) {
      const pct = DIFFICULTY_SETTINGS[difficulty].pct;
      setMetrics(Array.from({ length: shots }, (_, i) => {
        const distVar = getRandomPct(pct, 0.05);
        const sideVar = getRandomPct(pct, 0.05);
        return {
          distWin: Math.round(t[i] * distVar),
          distPref: getRandomDist(),
          sideWin: Math.round(t[i] * sideVar),
          sidePref: getRandomSide(),
        };
      }));
    } else {
      setMetrics([]);
    }
  };

  const handleUploadComplete = async (data) => {
    if (challengeMode) {
      let runningScore = 0;
      let end = null;
      const winThresh = DIFFICULTY_SETTINGS[difficulty].win;
      const gameShots = data.slice(0, shots);
      const shotResults = gameShots.map((shot, i) => {
        const carry = parseFloat(shot.carry_distance);
        const side = parseFloat(shot.side_total ?? shot.side);
        const target = targets[i];
        const m = metrics[i];
        // Distance control
        const distDiff = carry - target;
        const inDistWin = Math.abs(distDiff) <= m.distWin;
        const onDistSide = (m.distPref === 'Short' && distDiff < 0) || (m.distPref === 'Long' && distDiff > 0);
        // Side control
        const inSideWin = Math.abs(side) <= m.sideWin;
        const onSide = (m.sidePref === 'Left' && side < 0) || (m.sidePref === 'Right' && side > 0);
        let shotPoints = 0;
        if (inDistWin) shotPoints++;
        if (onDistSide) shotPoints++;
        if (inSideWin) shotPoints++;
        if (onSide) shotPoints++;
        if (!inDistWin && !onDistSide && !inSideWin && !onSide) shotPoints = -1;
        runningScore += shotPoints;
        if (!end && (runningScore >= winThresh)) end = 'win';
        if (!end && (i === shots-1)) end = 'done';
        return {
          target,
          carry: isNaN(carry) ? null : carry,
          side: isNaN(side) ? null : side,
          ...m,
          inDistWin,
          onDistSide,
          inSideWin,
          onSide,
          shotPoints,
          runningScore,
        };
      });
      setScore(runningScore);
      setShotResults(shotResults);
      setShowUploader(false);
      setEndReason(end);
      setGameState('results');
      // Save to Firestore
      const resultDoc = {
        uid: user.uid,
        gameType: 'target_game',
        score: runningScore,
        timestamp: Timestamp.now(),
        details: {
          spiderChartData: [], // Not used
          shotBreakdown: shotResults
        },
        comparisonDataset: selectedDataset || 'pga_tour'
      };
      await addDoc(collection(db, 'gameResults'), resultDoc);
      navigate('/practice/results');
    } else {
      const gameShots = data.slice(0, shots);
      const shotResults = gameShots.map((shot, i) => {
        const carry = parseFloat(shot.carry_distance);
        const target = targets[i];
        const shotScore = scoring(carry, target);
        return {
          target,
          carry: isNaN(carry) ? null : carry,
          score: shotScore
        };
      });
      const finalScore = Math.round(
        shotResults.reduce((sum, s) => sum + s.score, 0) / shotResults.length
      );
      setScore(finalScore);
      setShotResults(shotResults);
      setShowUploader(false);
      setGameState('results');
    }
  };

  const handleManualChange = (i, field, val) => {
    const arr = [...manualShots];
    arr[i] = { ...arr[i], [field]: val };
    setManualShots(arr);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (challengeMode) {
      let runningScore = 0;
      let end = null;
      const winThresh = DIFFICULTY_SETTINGS[difficulty].win;
      const shotResults = manualShots.map((val, i) => {
        const carry = parseFloat(val.carry);
        const side = parseFloat(val.side);
        const target = targets[i];
        const m = metrics[i];
        const distDiff = carry - target;
        const inDistWin = Math.abs(distDiff) <= m.distWin;
        const onDistSide = (m.distPref === 'Short' && distDiff < 0) || (m.distPref === 'Long' && distDiff > 0);
        const inSideWin = Math.abs(side) <= m.sideWin;
        const onSide = (m.sidePref === 'Left' && side < 0) || (m.sidePref === 'Right' && side > 0);
        let shotPoints = 0;
        if (inDistWin) shotPoints++;
        if (onDistSide) shotPoints++;
        if (inSideWin) shotPoints++;
        if (onSide) shotPoints++;
        if (!inDistWin && !onDistSide && !inSideWin && !onSide) shotPoints = -1;
        runningScore += shotPoints;
        if (!end && (runningScore >= winThresh)) end = 'win';
        if (!end && (i === shots-1)) end = 'done';
        return {
          target,
          carry: isNaN(carry) ? null : carry,
          side: isNaN(side) ? null : side,
          ...m,
          inDistWin,
          onDistSide,
          inSideWin,
          onSide,
          shotPoints,
          runningScore,
        };
      });
      setScore(runningScore);
      setShotResults(shotResults);
      setShowUploader(false);
      setEndReason(end);
      setGameState('results');
    } else {
      const shotResults = manualShots.map((val, i) => {
        const carry = parseFloat(val.carry);
        const target = targets[i];
        const shotScore = scoring(carry, target);
        return {
          target,
          carry: isNaN(carry) ? null : carry,
          score: shotScore
        };
      });
      const finalScore = Math.round(
        shotResults.reduce((sum, s) => sum + s.score, 0) / shotResults.length
      );
      setScore(finalScore);
      setShotResults(shotResults);
      setShowUploader(false);
      setGameState('results');
    }
  };

  // After scoring, if testMode and wedge, save skill score
  useEffect(() => {
    if (testMode && label.toLowerCase().includes('wedge') && score !== null) {
      setLastScore(score);
      localStorage.setItem(SKILL_KEY, score);
      if (!bestScore || score > bestScore) {
        setBestScore(score);
        localStorage.setItem(BEST_KEY, score);
      }
    }
  }, [score, testMode, label, bestScore]);

  // Clear targets/metrics when testMode, difficulty, or challengeMode changes
  useEffect(() => {
    setTargets([]);
    setMetrics([]);
    setScore(null);
    setShotResults([]);
    setShowUploader(true);
    setManualShots(Array(shots).fill({ carry: '', side: '' }));
    setEndReason(null);
    setShowReminder(false);
  }, [testMode, difficulty, challengeMode, shots]);

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">{label}</h2>
      <p className="text-gray-600 mb-4">{description}</p>
      {/* Test Mode toggle for Wedge Game only */}
      {label.toLowerCase().includes('wedge') && (
        <div className="flex flex-wrap gap-3 mb-4 items-center">
          <button
            className={`chunky-button ${testMode ? 'chunky-button-primary' : ''}`}
            onClick={() => setTestMode(!testMode)}
          >
            {testMode ? 'Test Mode: ON' : 'Test Mode: OFF'}
          </button>
          {(!skillScore || testMode) && (
            <span className="text-sm text-blue-900 bg-blue-100 rounded px-3 py-1">Run the Wedge Test to set your Skill Score!</span>
          )}
          {skillScore && !testMode && (
            <span className="text-sm text-green-900 bg-green-100 rounded px-3 py-1">Last Skill Score: <b>{lastScore}</b> | Best: <b>{bestScore}</b></span>
          )}
          {testMode && skillScore && (
            <span className="text-sm text-blue-900 bg-blue-100 rounded px-3 py-1">Retest to improve your Skill Score!</span>
          )}
        </div>
      )}
      {/* Difficulty and Challenge Mode toggles always visible */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <span className="font-semibold">Difficulty:</span>
        {Object.keys(DIFFICULTY_SETTINGS).map(d => (
          <button
            key={d}
            className={`chunky-button ${difficulty===d ? 'chunky-button-primary' : ''}`}
            onClick={()=>setDifficulty(d)}
          >
            {DIFFICULTY_SETTINGS[d].label}
          </button>
        ))}
        <span className="w-px h-6 bg-gray-300 mx-2 hidden sm:inline-block"></span>
        <button
          className={`chunky-button ${challengeMode ? 'chunky-button-primary' : ''}`}
          onClick={() => setChallengeMode(!challengeMode)}
        >
          {challengeMode ? 'Challenge Mode: ON' : 'Challenge Mode: OFF'}
        </button>
      </div>
      {challengeMode && (
        <div className="mb-4 text-sm text-blue-900 bg-blue-100 rounded-lg px-4 py-2 max-w-2xl">
          <strong>Challenge Mode:</strong> Earn points for hitting within distance and side windows, and for missing on the preferred side (short/long, left/right). Lose a point if you miss all. Reach the target score to win!
        </div>
      )}
      <div className="mb-4">
        <button
          className="chunky-button chunky-button-primary px-8 py-3 text-lg mb-2"
          onClick={startGame}
        >
          Start {label}
        </button>
      </div>
      {targets.length > 0 && challengeMode && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 text-gray-800">Your Targets & Preferences:</h3>
          <div className="flex flex-wrap gap-3">
            {targets.map((t, i) => (
              <span key={i} className="inline-flex items-center px-4 py-2 rounded-full border border-blue-300 bg-blue-50 shadow-sm font-mono text-xl font-extrabold text-blue-900 gap-2">
                <span>{t}</span>
                <span className="text-xs font-semibold text-blue-500 ml-1">yds</span>
                {metrics[i] && (
                  <span className="ml-2 text-xs font-medium text-blue-700">
                    Tolerance: <b>±{metrics[i].distWin} yds</b>, <b>±{metrics[i].sideWin} yds side</b>
                  </span>
                )}
                <span className="ml-2 text-xs font-medium text-blue-700">Miss: <b>{metrics[i]?.distPref}</b>, Side: <b>{metrics[i]?.sidePref}</b></span>
              </span>
            ))}
          </div>
        </div>
      )}
      {targets.length > 0 && !challengeMode && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 text-gray-800">Your Targets:</h3>
          <div className="flex flex-wrap gap-3">
            {targets.map((t, i) => (
              <span key={i} className="inline-flex items-center px-4 py-2 rounded-full border border-blue-300 bg-blue-50 shadow-sm font-mono text-xl font-extrabold text-blue-900 gap-1">
                <span>{t}</span>
                <span className="text-xs font-semibold text-blue-500 ml-1">yds</span>
              </span>
            ))}
          </div>
        </div>
      )}
      {/* CSV Upload with reminder */}
      {targets.length > 0 && showUploader && (
        <div className="mb-8">
          <div className="mb-3 p-3 bg-yellow-100 text-yellow-900 rounded-lg font-semibold text-center">
            Before starting a test, please clear your driving range data to ensure a clean import.
          </div>
          <div className="chunky-card p-6 bg-white border-2 border-green-200 shadow-md max-w-xl mx-auto">
            <CSVUploader onUploadComplete={handleUploadComplete} />
          </div>
        </div>
      )}
      {/* Manual entry table always visible */}
      {targets.length > 0 && showUploader && (
        <form onSubmit={handleManualSubmit} className="mb-8">
          <h3 className="text-lg font-semibold mb-2 text-gray-800">Manual Entry</h3>
          <table className="min-w-full text-sm border border-gray-300 rounded-lg">
            <thead>
              <tr className="bg-green-100">
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Target Yardage</th>
                {challengeMode && <th className="px-4 py-2">Dist Win</th>}
                {challengeMode && <th className="px-4 py-2">Dist Side</th>}
                {challengeMode && <th className="px-4 py-2">Side Win</th>}
                {challengeMode && <th className="px-4 py-2">Side Pref</th>}
                <th className="px-4 py-2">Distance Miss (− = Short, + = Long)</th>
                <th className="px-4 py-2">Side Miss (− = Left, + = Right)</th>
              </tr>
            </thead>
            <tbody>
              {targets.map((t, i) => (
                <tr key={i} className="text-center border-b">
                  <td className="px-4 py-2 font-mono">{i + 1}</td>
                  <td className="px-4 py-2 font-mono">{t}</td>
                  {challengeMode && <td className="px-4 py-2 font-mono">{metrics[i] ? `${-metrics[i].distWin} to +${metrics[i].distWin}` : ''}</td>}
                  {challengeMode && <td className="px-4 py-2 font-mono">{metrics[i]?.distPref}</td>}
                  {challengeMode && <td className="px-4 py-2 font-mono">{metrics[i] ? `${-metrics[i].sideWin} to +${metrics[i].sideWin}` : ''}</td>}
                  {challengeMode && <td className="px-4 py-2 font-mono">{metrics[i]?.sidePref}</td>}
                  <td className="px-4 py-2 font-mono">
                    <input
                      type="number"
                      className="chunky-input w-24"
                      value={manualShots[i].carry}
                      onChange={e => handleManualChange(i, 'carry', e.target.value)}
                      placeholder="e.g. -4 for 4 yds short"
                      required
                    />
                  </td>
                  <td className="px-4 py-2 font-mono">
                    <input
                      type="number"
                      className="chunky-input w-24"
                      value={manualShots[i].side}
                      onChange={e => handleManualChange(i, 'side', e.target.value)}
                      placeholder="e.g. -3 for 3 yds left"
                      required
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-xs text-gray-600 mt-2">Note: For left misses, please enter a negative number (e.g., -3). For short, use negative; for long or right, use positive.</div>
          <button type="submit" className="chunky-button chunky-button-primary mt-4">Submit</button>
        </form>
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
                  <th className="px-4 py-2">Side Miss</th>
                  <th className="px-4 py-2">Score</th>
                </tr>
              </thead>
              <tbody>
                {shotResults.map((r, i) => (
                  <tr key={i} className="text-center border-b">
                    <td className="px-4 py-2 font-mono">{i + 1}</td>
                    <td className="px-4 py-2 font-mono">{r.target}</td>
                    <td className="px-4 py-2 font-mono">{r.carry !== null ? r.carry : <span className="text-red-500">N/A</span>}</td>
                    <td className="px-4 py-2 font-mono">{r.side !== null ? r.side : <span className="text-red-500">N/A</span>}</td>
                    <td className="px-4 py-2 font-mono font-bold">{r.score ?? r.shotPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="chunky-button chunky-button-secondary mt-6"
            onClick={startGame}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default TargetGame; 