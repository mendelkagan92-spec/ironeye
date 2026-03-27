import React, { useEffect, useState } from 'react';
import type { ActiveExercise } from '../types';

interface WorkoutSessionProps {
  startedAt: string;
  exercises: ActiveExercise[];
  onEnd: () => void;
  isEnding: boolean;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function WorkoutSession({
  startedAt,
  exercises,
  onEnd,
  isEnding,
}: WorkoutSessionProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  return (
    <div className="space-y-3">
      {/* Timer bar */}
      <div className="card flex items-center justify-between"
        style={{ borderColor: 'rgba(252,76,2,0.2)' }}>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#fc4c02' }} />
          <div>
            <p className="font-barlow text-2xl font-bold text-white">{formatDuration(elapsed)}</p>
            <p className="text-text-muted text-xs font-inter">
              {exercises.length} exercise{exercises.length !== 1 ? 's' : ''} · {totalSets} set{totalSets !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={onEnd}
          disabled={isEnding}
          className="font-inter font-semibold uppercase text-sm px-4 py-2 rounded-lg transition-all duration-150"
          style={{
            background: 'rgba(239,68,68,0.1)',
            color: '#ef4444',
            border: '1px solid rgba(239,68,68,0.2)',
          }}
        >
          {isEnding ? (
            <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
          ) : 'End'}
        </button>
      </div>

      {/* Exercise list */}
      {exercises.length > 0 && (
        <div className="space-y-2">
          <p className="label px-1">This Session</p>
          {exercises.map((ex, i) => (
            <div
              key={ex.exerciseId}
              className="card flex items-center gap-3 animate-fade-in"
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted text-xs font-barlow font-bold flex-shrink-0"
                style={{ background: '#242424' }}>
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-inter font-medium text-sm truncate">
                  {ex.machineInfo.machine_name}
                </p>
                <p className="text-text-muted text-xs font-inter">
                  {ex.sets.length} set{ex.sets.length !== 1 ? 's' : ''}
                  {ex.machineInfo.muscles?.length > 0 && ` · ${ex.machineInfo.muscles[0]}`}
                </p>
              </div>
              {ex.sets.length > 0 && (
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  style={{ color: '#00d4aa' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
