import React, { useState } from 'react';
import TargetGame from './TargetGame';
import DrivingGame from './DrivingGame';

const GAME_CONFIGS = {
  wedge: {
    label: 'Wedge Game',
    shots: 20,
    min: 25,
    max: 120,
    scoring: (carry, target) => Math.max(0, Math.round(100 - Math.abs(carry - target) * 2)),
    description: '20 shots at random wedge distances (25-120 yds).'
  },
  iron: {
    label: 'Iron Game',
    shots: 25,
    min: 130,
    max: 200,
    scoring: (carry, target) => Math.max(0, Math.round(100 - Math.abs(carry - target) * 2)),
    description: '25 shots at random iron distances (customizable range).'
  },
  driver: {
    label: 'Driving Game',
    shots: 15,
    min: 0,
    max: 0,
    scoring: (side) => Math.max(0, Math.round(100 - Math.abs(side) * 4)),
    description: '15 drives, scored by left/right dispersion (not distance).'
  }
};

const DIFFICULTY_LEVELS = [
  { key: 'pro', label: 'Pro' },
  { key: 'advanced', label: 'Advanced' },
  { key: 'beginner', label: 'Beginner' }
];

const Practice = () => {
  const [selected, setSelected] = useState('wedge');
  const [ironMin, setIronMin] = useState(130);
  const [ironMax, setIronMax] = useState(200);
  const [driverDifficulty, setDriverDifficulty] = useState('pro');

  return (
    <div className="p-6 lg:p-12 animate-fade-in max-w-3xl mx-auto">
      <div className="chunky-card mb-8">
        <h1 className="text-3xl font-bold mb-4 text-gray-800 flex items-center gap-2">🏌️ Practice Games</h1>
        <div className="flex gap-4 mb-6">
          <button className={`chunky-button ${selected==='wedge' ? 'chunky-button-primary' : ''}`} onClick={()=>setSelected('wedge')}>Wedge Game</button>
          <button className={`chunky-button ${selected==='iron' ? 'chunky-button-primary' : ''}`} onClick={()=>setSelected('iron')}>Iron Game</button>
          <button className={`chunky-button ${selected==='driver' ? 'chunky-button-primary' : ''}`} onClick={()=>setSelected('driver')}>Driving Game</button>
        </div>
        {selected === 'iron' && (
          <div className="mb-4 flex gap-4 items-center">
            <label className="font-semibold">Min Target:
              <input type="number" className="chunky-input ml-2 w-20" value={ironMin} min={80} max={ironMax-5} onChange={e=>setIronMin(Number(e.target.value))} />
            </label>
            <label className="font-semibold">Max Target:
              <input type="number" className="chunky-input ml-2 w-20" value={ironMax} min={ironMin+5} max={250} onChange={e=>setIronMax(Number(e.target.value))} />
            </label>
          </div>
        )}
        {selected === 'wedge' && (
          <TargetGame
            label={GAME_CONFIGS.wedge.label}
            shots={GAME_CONFIGS.wedge.shots}
            min={GAME_CONFIGS.wedge.min}
            max={GAME_CONFIGS.wedge.max}
            scoring={GAME_CONFIGS.wedge.scoring}
            description={GAME_CONFIGS.wedge.description}
          />
        )}
        {selected === 'iron' && (
          <TargetGame
            label={GAME_CONFIGS.iron.label}
            shots={GAME_CONFIGS.iron.shots}
            min={ironMin}
            max={ironMax}
            scoring={GAME_CONFIGS.iron.scoring}
            description={GAME_CONFIGS.iron.description}
          />
        )}
        {selected === 'driver' && (
          <>
            <div className="mb-4 flex gap-4 items-center">
              <span className="font-semibold">Difficulty:</span>
              {DIFFICULTY_LEVELS.map(d => (
                <button
                  key={d.key}
                  className={`chunky-button ${driverDifficulty===d.key ? 'chunky-button-primary' : ''}`}
                  onClick={()=>setDriverDifficulty(d.key)}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <DrivingGame difficulty={driverDifficulty} />
          </>
        )}
      </div>
    </div>
  );
};

export default Practice; 