import React from 'react';
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
  const totalSets = workout.exercises?.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0) || 0;
  const allMuscles = Array.from(
    new Set(workout.exercises?.flatMap((ex) => ex.muscles || []) || [])
  );

  return (
    <div className="card space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-text-primary font-barlow text-xl font-bold">
            {formatDate(workout.started_at)}
          </p>
          <p className="text-text-muted text-xs mt-0.5">
            {formatDuration(workout.started_at, workout.ended_at)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-amber-500 font-barlow text-2xl font-bold">{totalSets}</p>
          <p className="text-text-muted text-xs">sets</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-1.5 text-text-secondary">
          <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <span>{workout.exercises?.length || 0} exercises</span>
        </div>
      </div>

      {/* Exercises */}
      {workout.exercises && workout.exercises.length > 0 && (
        <div className="space-y-1.5">
          {workout.exercises.slice(0, 4).map((ex) => (
            <div key={ex.id} className="flex items-center justify-between text-sm">
              <span className="text-text-secondary truncate flex-1 mr-2">{ex.machine_name}</span>
              <span className="text-text-muted flex-shrink-0">
                {ex.sets?.length || 0} sets
                {ex.sets?.length > 0 && ex.sets[0]?.weight && (
                  <span className="ml-1 text-text-muted">
                    @ {ex.sets[0].weight}{ex.sets[0].weight_unit}
                  </span>
                )}
              </span>
            </div>
          ))}
          {workout.exercises.length > 4 && (
            <p className="text-text-muted text-xs">+{workout.exercises.length - 4} more</p>
          )}
        </div>
      )}

      {/* Muscles */}
      {allMuscles.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1 border-t border-surface-3">
          {allMuscles.slice(0, 5).map((m) => (
            <span key={m} className="tag">{m}</span>
          ))}
          {allMuscles.length > 5 && (
            <span className="tag">+{allMuscles.length - 5}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function History({ workouts, isLoading }: HistoryProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card space-y-3">
            <div className="flex justify-between">
              <div className="space-y-1.5">
                <div className="skeleton h-6 w-32 rounded" />
                <div className="skeleton h-4 w-20 rounded" />
              </div>
              <div className="skeleton h-10 w-10 rounded" />
            </div>
            <div className="space-y-1.5">
              <div className="skeleton h-4 w-full rounded" />
              <div className="skeleton h-4 w-3/4 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (workouts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <div className="w-20 h-20 rounded-2xl bg-surface flex items-center justify-center">
          <svg className="w-10 h-10 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <div>
          <p className="font-barlow text-2xl font-bold text-text-primary">No workouts yet</p>
          <p className="text-text-muted text-sm mt-1">Start your first session to see history here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {workouts.map((w) => (
        <WorkoutCard key={w.id} workout={w} />
      ))}
    </div>
  );
}
