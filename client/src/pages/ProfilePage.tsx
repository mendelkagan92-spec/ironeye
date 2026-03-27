import React, { useEffect, useState } from 'react';
import { getWorkouts } from '../api';
import type { Workout, User } from '../types';

interface Stats {
  totalWorkouts: number;
  totalSets: number;
  totalExercises: number;
  totalDurationMin: number;
  topMuscles: { name: string; count: number }[];
  topMachines: { name: string; count: number }[];
  avgSetsPerWorkout: number;
}

function computeStats(workouts: Workout[]): Stats {
  const completed = workouts.filter((w) => w.ended_at);

  const totalSets = workouts.reduce(
    (sum, w) => sum + w.exercises.reduce((s, e) => s + (e.sets?.length || 0), 0),
    0
  );

  const totalExercises = workouts.reduce((sum, w) => sum + w.exercises.length, 0);

  const totalDurationMin = completed.reduce((sum, w) => {
    const ms = new Date(w.ended_at!).getTime() - new Date(w.started_at).getTime();
    return sum + Math.floor(ms / 60000);
  }, 0);

  // Muscle frequency
  const muscleCount: Record<string, number> = {};
  workouts.forEach((w) => {
    w.exercises.forEach((e) => {
      (e.muscles || []).forEach((m) => {
        muscleCount[m] = (muscleCount[m] || 0) + 1;
      });
    });
  });
  const topMuscles = Object.entries(muscleCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  // Machine frequency
  const machineCount: Record<string, number> = {};
  workouts.forEach((w) => {
    w.exercises.forEach((e) => {
      machineCount[e.machine_name] = (machineCount[e.machine_name] || 0) + 1;
    });
  });
  const topMachines = Object.entries(machineCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  const avgSetsPerWorkout =
    workouts.length > 0 ? Math.round(totalSets / workouts.length) : 0;

  return {
    totalWorkouts: workouts.length,
    totalSets,
    totalExercises,
    totalDurationMin,
    topMuscles,
    topMachines,
    avgSetsPerWorkout,
  };
}

function StatCard({ value, label, color = 'amber' }: { value: string | number; label: string; color?: string }) {
  return (
    <div className="card flex flex-col items-center justify-center text-center py-5 gap-1">
      <span className={`font-barlow text-4xl font-black ${color === 'amber' ? 'text-amber-500' : 'text-text-primary'}`}>
        {value}
      </span>
      <span className="text-text-muted text-xs font-dm">{label}</span>
    </div>
  );
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

  useEffect(() => {
    getWorkouts()
      .then((workouts) => setStats(computeStats(workouts)))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-32 rounded" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card">
              <div className="skeleton h-10 w-16 mx-auto rounded mb-2" />
              <div className="skeleton h-4 w-20 mx-auto rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const s = stats!;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <span className="font-barlow text-2xl font-black text-amber-500">
              {user.email[0].toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="font-barlow text-3xl font-black text-text-primary">My Stats</h1>
            <p className="text-text-muted text-sm">{user.email}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="text-text-muted text-sm hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg border border-surface-3 hover:border-red-400/30"
        >
          Log out
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard value={s.totalWorkouts} label="Workouts" />
        <StatCard value={s.totalSets} label="Total Sets" />
        <StatCard value={s.totalExercises} label="Exercises" />
        <StatCard value={formatDuration(s.totalDurationMin)} label="Total Time" color="normal" />
      </div>

      <StatCard value={s.avgSetsPerWorkout} label="Avg Sets / Workout" />

      {/* Top muscles */}
      {s.topMuscles.length > 0 && (
        <div className="card space-y-3">
          <h2 className="font-barlow text-xl font-bold text-text-primary">Most Trained Muscles</h2>
          <div className="space-y-2">
            {s.topMuscles.map((m, i) => {
              const max = s.topMuscles[0].count;
              const pct = Math.round((m.count / max) * 100);
              return (
                <div key={m.name} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-secondary flex items-center gap-2">
                      {i === 0 && <span className="text-amber-500">★</span>}
                      {m.name}
                    </span>
                    <span className="text-text-muted">{m.count}x</span>
                  </div>
                  <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top machines */}
      {s.topMachines.length > 0 && (
        <div className="card space-y-3">
          <h2 className="font-barlow text-xl font-bold text-text-primary">Favorite Equipment</h2>
          <div className="space-y-2">
            {s.topMachines.map((m, i) => (
              <div key={m.name} className="flex items-center gap-3 py-2 border-b border-surface-3 last:border-0">
                <span className="text-text-muted text-sm w-5 text-right flex-shrink-0">{i + 1}</span>
                <span className="text-text-secondary flex-1 text-sm">{m.name}</span>
                <span className="amber-tag">{m.count}x</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {s.totalWorkouts === 0 && (
        <div className="text-center py-8 text-text-muted">
          <p className="font-barlow text-xl">No data yet</p>
          <p className="text-sm mt-1">Complete your first workout to see stats</p>
        </div>
      )}
    </div>
  );
}
