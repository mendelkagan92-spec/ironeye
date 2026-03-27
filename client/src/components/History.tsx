import React, { useState } from 'react';
import type { Workout } from '../types';

interface HistoryProps {
  workouts: Workout[];
  isLoading: boolean;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatDuration(start: string, end: string | null): string {
  if (!end) return 'In progress';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function WorkoutCard({ workout }: { workout: Workout }) {
  const [expanded, setExpanded] = useState(false);
  const totalSets = workout.exercises?.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0) || 0;
  const allMuscles = Array.from(
    new Set(workout.exercises?.flatMap((ex) => ex.muscles || []) || [])
  );

  // Calculate total volume
  const totalVolume = workout.exercises?.reduce((sum, ex) => {
    return sum + (ex.sets || []).reduce((s, set) => {
      return s + ((set.weight || 0) * (set.reps || 0));
    }, 0);
  }, 0) || 0;

  return (
    <div className="card space-y-3">
      {/* Header row */}
      <button className="w-full text-left" onClick={() => setExpanded(v => !v)}>
        <div className="flex items-start justify-between">
          <div>
            <p className="font-barlow text-lg font-bold text-white">
              {formatDate(workout.started_at)}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-text-secondary text-xs font-inter">
                {formatDuration(workout.started_at, workout.ended_at)}
              </span>
              {totalVolume > 0 && (
                <>
                  <span className="text-text-muted text-xs">·</span>
                  <span className="text-text-secondary text-xs font-inter">
                    {totalVolume.toLocaleString()} vol
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="text-right flex items-center gap-3">
            <div>
              <p className="font-barlow text-2xl font-bold text-white">{totalSets}</p>
              <p className="text-text-muted text-xs font-inter">sets</p>
            </div>
            <svg className={`w-4 h-4 text-text-muted transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </button>

      {/* Muscle tags */}
      {allMuscles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allMuscles.slice(0, 5).map((m) => (
            <span key={m} className="tag">{m}</span>
          ))}
          {allMuscles.length > 5 && <span className="tag">+{allMuscles.length - 5}</span>}
        </div>
      )}

      {/* Expanded exercise breakdown */}
      {expanded && workout.exercises && workout.exercises.length > 0 && (
        <div className="space-y-1 pt-2" style={{ borderTop: '1px solid #2a2a2a' }}>
          {workout.exercises.map((ex) => (
            <div key={ex.id} className="flex items-center justify-between py-1.5">
              <span className="text-text-secondary text-sm font-inter truncate flex-1 mr-2">{ex.machine_name}</span>
              <span className="text-text-muted text-xs font-inter flex-shrink-0">
                {ex.sets?.length || 0} sets
                {ex.sets?.length > 0 && ex.sets[0]?.weight && (
                  <span className="ml-1">@ {ex.sets[0].weight}{ex.sets[0].weight_unit}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function History({ workouts, isLoading }: HistoryProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card space-y-3">
            <div className="flex justify-between">
              <div className="space-y-1.5">
                <div className="skeleton h-5 w-32 rounded" />
                <div className="skeleton h-3 w-20 rounded" />
              </div>
              <div className="skeleton h-10 w-10 rounded" />
            </div>
            <div className="flex gap-1.5">
              <div className="skeleton h-5 w-16 rounded-full" />
              <div className="skeleton h-5 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (workouts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
          <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <div>
          <p className="font-barlow text-xl font-bold text-white">No workouts yet</p>
          <p className="text-text-secondary text-sm font-inter mt-1">Start your first session to see history here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {workouts.map((w) => (
        <WorkoutCard key={w.id} workout={w} />
      ))}
    </div>
  );
}
