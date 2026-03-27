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
      {/* User header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: '#242424', border: '2px solid #2a2a2a' }}>
          <span className="font-barlow text-2xl font-bold text-white">{initial}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-barlow text-xl font-bold text-white">{user?.email || 'Unknown'}</h2>
          <p className="text-text-secondary text-sm font-inter">Member</p>
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="flex gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card flex-1 py-5">
              <div className="skeleton h-8 w-12 mx-auto rounded mb-2" />
              <div className="skeleton h-3 w-16 mx-auto rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      {!isLoading && stats && (
        <>
          <div className="flex gap-3">
            {[
              { value: stats.totalWorkouts, label: 'Workouts' },
              { value: stats.totalSets, label: 'Total Sets' },
              { value: stats.topMuscle || '—', label: 'Fav Muscle' },
            ].map((s) => (
              <div key={s.label} className="card flex-1 text-center py-5 space-y-1">
                <div className="font-barlow font-bold text-white" style={{ fontSize: 32 }}>
                  {s.value}
                </div>
                <div className="label">{s.label}</div>
              </div>
            ))}
          </div>

          {stats.totalWorkouts === 0 && (
            <div className="text-center py-8">
              <p className="font-barlow text-lg font-semibold text-white">No data yet</p>
              <p className="text-text-secondary text-sm font-inter mt-1">Complete your first workout to see stats</p>
            </div>
          )}
        </>
      )}

      {/* Settings list */}
      <div className="space-y-0">
        {['Notifications', 'Units & Preferences', 'Data Export'].map((item) => (
          <button key={item} className="w-full flex items-center justify-between py-4 transition-colors duration-150"
            style={{ borderBottom: '1px solid #2a2a2a' }}>
            <span className="text-white font-inter text-sm">{item}</span>
            <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="btn-ghost w-full text-red-500 hover:text-red-400"
        style={{ background: 'transparent' }}
      >
        Log Out
      </button>
    </div>
  );
}
