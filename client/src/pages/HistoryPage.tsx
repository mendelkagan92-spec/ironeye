import React, { useEffect, useState } from 'react';
import History from '../components/History';
import { getWorkouts, getSavedWorkouts, deleteSavedWorkout } from '../api';
import type { Workout, SavedWorkout, GeneratedWorkout } from '../types';

type HistoryTab = 'logs' | 'saved';

interface SavedWorkoutCardProps {
  saved: SavedWorkout;
  onDelete: (id: number) => void;
  onStart: (workout: GeneratedWorkout) => void;
}

function SavedWorkoutCard({ saved, onDelete, onStart }: SavedWorkoutCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const w = saved.workout_data;

  const handleDelete = async () => {
    if (!window.confirm('Delete this saved workout?')) return;
    setDeleting(true);
    try {
      await deleteSavedWorkout(saved.id);
      onDelete(saved.id);
    } finally {
      setDeleting(false);
    }
  };

  const date = new Date(saved.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="card border border-surface-3 space-y-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-barlow font-bold text-text-primary leading-tight">{saved.name}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-text-muted text-xs font-dm">{date}</span>
            <span className="text-text-muted text-xs">•</span>
            <span className="text-text-muted text-xs font-dm">{w.estimated_duration}</span>
            <span className="text-text-muted text-xs">•</span>
            <span className="text-text-muted text-xs font-dm">{w.exercises.length} exercises</span>
          </div>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-text-muted hover:text-red-400 transition-colors p-1 flex-shrink-0"
          aria-label="Delete"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>

      {/* Exercise preview */}
      <button
        type="button"
        className="w-full text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-2 text-text-muted text-xs font-dm">
          <svg
            className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {expanded ? 'Hide' : 'Show'} exercises
        </div>
      </button>

      {expanded && (
        <div className="space-y-1 border-t border-surface-3 pt-3">
          {w.exercises.map((ex, i) => (
            <div key={i} className="flex items-center gap-2 py-1">
              <span className="w-4 h-4 rounded text-center text-xs font-barlow font-black text-amber-500 flex-shrink-0">
                {i + 1}
              </span>
              <span className="text-text-secondary text-sm font-dm flex-1">{ex.name}</span>
              <span className="text-text-muted text-xs font-dm">{ex.sets}×{ex.reps}</span>
            </div>
          ))}
        </div>
      )}

      {/* Start button */}
      <button
        className="btn-primary w-full py-3"
        onClick={() => onStart(saved.workout_data)}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Start This Workout
      </button>
    </div>
  );
}

interface HistoryPageProps {
  onStartSavedWorkout?: (workout: GeneratedWorkout) => void;
}

export default function HistoryPage({ onStartSavedWorkout }: HistoryPageProps) {
  const [activeTab, setActiveTab] = useState<HistoryTab>('logs');
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [savedWorkouts, setSavedWorkouts] = useState<SavedWorkout[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkouts = async () => {
    setIsLoadingLogs(true);
    setError(null);
    try {
      const data = await getWorkouts();
      setWorkouts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workouts');
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const fetchSaved = async () => {
    setIsLoadingSaved(true);
    setError(null);
    try {
      const data = await getSavedWorkouts();
      setSavedWorkouts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load saved workouts');
    } finally {
      setIsLoadingSaved(false);
    }
  };

  useEffect(() => {
    fetchWorkouts();
  }, []);

  useEffect(() => {
    if (activeTab === 'saved') {
      fetchSaved();
    }
  }, [activeTab]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-barlow text-3xl font-black text-text-primary">History</h1>
        <button
          onClick={activeTab === 'logs' ? fetchWorkouts : fetchSaved}
          className="btn-ghost py-2 px-3 text-sm"
          disabled={isLoadingLogs || isLoadingSaved}
        >
          <svg
            className={`w-4 h-4 ${(isLoadingLogs || isLoadingSaved) ? 'animate-spin' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </button>
      </div>

      {/* Tab switcher */}
      <div className="flex rounded-xl overflow-hidden border border-surface-3 p-1 bg-surface gap-1">
        {(['logs', 'saved'] as HistoryTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-dm font-medium transition-all duration-150 ${
              activeTab === t
                ? 'bg-amber-500 text-black'
                : 'text-text-muted hover:text-text-secondary'
            }`}
          >
            {t === 'logs' ? 'Workout Logs' : 'Saved Plans'}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            className="text-amber-500 text-sm mt-2 underline"
            onClick={activeTab === 'logs' ? fetchWorkouts : fetchSaved}
          >
            Try again
          </button>
        </div>
      )}

      {activeTab === 'logs' && (
        <History workouts={workouts} isLoading={isLoadingLogs} />
      )}

      {activeTab === 'saved' && (
        <div className="space-y-3">
          {isLoadingSaved ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="card border border-surface-3 space-y-3">
                  <div className="flex gap-3">
                    <div className="skeleton w-9 h-9 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="skeleton h-5 w-2/3 rounded" />
                      <div className="skeleton h-3 w-1/2 rounded" />
                    </div>
                  </div>
                  <div className="skeleton h-10 w-full rounded-lg" />
                </div>
              ))}
            </div>
          ) : savedWorkouts.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-surface border border-surface-3 flex items-center justify-center">
                <svg className="w-6 h-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
              </div>
              <p className="font-barlow font-bold text-text-primary">No saved plans yet</p>
              <p className="text-text-muted text-sm font-dm">
                Generate a workout and tap "Save Workout" to save it here.
              </p>
            </div>
          ) : (
            savedWorkouts.map((sw) => (
              <SavedWorkoutCard
                key={sw.id}
                saved={sw}
                onDelete={(id) => setSavedWorkouts((prev) => prev.filter((s) => s.id !== id))}
                onStart={(w) => onStartSavedWorkout?.(w)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
