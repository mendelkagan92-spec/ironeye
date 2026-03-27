import React, { useEffect, useState } from 'react';
import { getWorkouts } from '../api';
import type { Workout, User } from '../types';

interface Stats {
  totalWorkouts: number;
  totalSets: number;
  totalExercises: number;
  totalDurationMin: number;
  topMuscle: string | null;
}

function computeStats(workouts: Workout[]): Stats {
  if (!Array.isArray(workouts)) {
    return { totalWorkouts: 0, totalSets: 0, totalExercises: 0, totalDurationMin: 0, topMuscle: null };
  }

  const completed = workouts.filter((w) => w.ended_at);

  let totalSets = 0;
  let totalExercises = 0;
  const muscleCount: Record<string, number> = {};

  for (const w of workouts) {
    const exercises = w.exercises || [];
    totalExercises += exercises.length;
    for (const e of exercises) {
      totalSets += (e.sets || []).length;
      for (const m of e.muscles || []) {
        muscleCount[m] = (muscleCount[m] || 0) + 1;
      }
    }
  }

  const totalDurationMin = completed.reduce((sum, w) => {
    try {
      const ms = new Date(w.ended_at!).getTime() - new Date(w.started_at).getTime();
      return sum + Math.max(0, Math.floor(ms / 60000));
    } catch {
      return sum;
    }
  }, 0);

  const topMuscle = Object.entries(muscleCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return { totalWorkouts: workouts.length, totalSets, totalExercises, totalDurationMin, topMuscle };
}

function formatDuration(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

interface Props {
  user: User;
  onLogout: () => void;
}

export default function ProfilePage({ user, onLogout }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const initial = user?.email?.[0]?.toUpperCase() || '?';

  useEffect(() => {
    let cancelled = false;
    getWorkouts()
      .then((workouts) => {
        if (!cancelled) setStats(computeStats(workouts));
      })
      .catch(() => {
        if (!cancelled) setStats({ totalWorkouts: 0, totalSets: 0, totalExercises: 0, totalDurationMin: 0, topMuscle: null });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      {/* User header + logout */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <span className="font-barlow text-2xl font-black text-amber-500">{initial}</span>
          </div>
          <div>
            <h1 className="font-barlow text-3xl font-black text-text-primary">Profile</h1>
            <p className="text-text-muted text-sm">{user?.email || 'Unknown'}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="text-text-muted text-sm hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg border border-surface-3 hover:border-red-400/30"
        >
          Log out
        </button>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card py-5">
              <div className="skeleton h-10 w-16 mx-auto rounded mb-2" />
              <div className="skeleton h-4 w-20 mx-auto rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {!isLoading && stats && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="card flex flex-col items-center justify-center text-center py-5 gap-1">
              <span className="font-barlow text-4xl font-black text-amber-500">{stats.totalWorkouts}</span>
              <span className="text-text-muted text-xs font-dm">Workouts</span>
            </div>
            <div className="card flex flex-col items-center justify-center text-center py-5 gap-1">
              <span className="font-barlow text-4xl font-black text-amber-500">{stats.totalSets}</span>
              <span className="text-text-muted text-xs font-dm">Total Sets</span>
            </div>
            <div className="card flex flex-col items-center justify-center text-center py-5 gap-1">
              <span className="font-barlow text-4xl font-black text-amber-500">{stats.totalExercises}</span>
              <span className="text-text-muted text-xs font-dm">Exercises</span>
            </div>
            <div className="card flex flex-col items-center justify-center text-center py-5 gap-1">
              <span className="font-barlow text-4xl font-black text-text-primary">{formatDuration(stats.totalDurationMin)}</span>
              <span className="text-text-muted text-xs font-dm">Total Time</span>
            </div>
          </div>

          {stats.topMuscle && (
            <div className="card py-5 text-center space-y-1">
              <span className="text-text-muted text-xs font-dm uppercase tracking-wider">Most Trained Muscle</span>
              <p className="font-barlow text-2xl font-black text-amber-500">{stats.topMuscle}</p>
            </div>
          )}

          {stats.totalWorkouts === 0 && (
            <div className="text-center py-8 text-text-muted">
              <p className="font-barlow text-xl">No data yet</p>
              <p className="text-sm mt-1">Complete your first workout to see stats</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
