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
    const tick = () => {
      const now = Date.now();
      setElapsed(Math.floor((now - start) / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);

  return (
    <div className="space-y-3">
      {/* Session bar */}
      <div className="flex items-center justify-between bg-surface rounded-xl border border-amber-500/20 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <div>
            <p className="text-text-primary font-barlow text-xl font-bold">{formatDuration(elapsed)}</p>
            <p className="text-text-muted text-xs">
              {exercises.length} exercise{exercises.length !== 1 ? 's' : ''} · {totalSets} set{totalSets !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={onEnd}
          disabled={isEnding}
          className="bg-red-500/10 text-red-400 border border-red-500/20 font-barlow font-bold uppercase tracking-wider
                     px-4 py-2 rounded-lg text-sm min-h-[40px] flex items-center gap-2
                     active:scale-95 transition-all disabled:opacity-50"
        >
          {isEnding ? (
            <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                />
              </svg>
              End
            </>
          )}
        </button>
      </div>

      {/* Exercise list */}
      {exercises.length > 0 && (
        <div className="space-y-2">
          <p className="text-text-muted text-xs font-barlow uppercase tracking-wider px-1">
            This Session
          </p>
          {exercises.map((ex, i) => (
            <div
              key={ex.exerciseId}
              className="flex items-center gap-3 bg-surface rounded-xl border border-surface-3 px-3 py-2.5 animate-fade-in"
            >
              <div className="w-7 h-7 rounded-lg bg-surface-2 flex items-center justify-center text-text-muted text-xs font-barlow font-bold flex-shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-text-primary font-dm font-medium text-sm truncate">
                  {ex.machineInfo.machine_name}
                </p>
                <p className="text-text-muted text-xs">
                  {ex.sets.length} set{ex.sets.length !== 1 ? 's' : ''}
                  {ex.machineInfo.muscles?.length > 0 && ` · ${ex.machineInfo.muscles[0]}`}
                </p>
              </div>
              {ex.sets.length > 0 && (
                <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
