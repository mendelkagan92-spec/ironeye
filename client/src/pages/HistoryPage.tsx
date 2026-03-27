import React, { useEffect, useState } from 'react';
import History from '../components/History';
import { getWorkouts, getSavedWorkouts, deleteSavedWorkout, getSavedRunningWorkouts, deleteSavedRunningWorkout } from '../api';
import { downloadFitFile } from '../utils/fitWriter';
import type { Workout, SavedWorkout, SavedRunningWorkout, GeneratedWorkout, RunningWorkout } from '../types';

type HistoryTab = 'logs' | 'saved' | 'runs';

// ── Saved Gym Workout Card ──

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
    try { await deleteSavedWorkout(saved.id); onDelete(saved.id); }
    finally { setDeleting(false); }
  };

  const date = new Date(saved.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="card space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(252,76,2,0.1)' }}>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#fc4c02' }}>
            <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-barlow font-bold text-white leading-tight">{saved.name}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-text-muted text-xs font-inter">{date}</span>
            <span className="text-text-muted text-xs">·</span>
            <span className="text-text-muted text-xs font-inter">{w.estimated_duration}</span>
            <span className="text-text-muted text-xs">·</span>
            <span className="text-text-muted text-xs font-inter">{w.exercises.length} exercises</span>
          </div>
        </div>
        <button onClick={handleDelete} disabled={deleting}
          className="text-text-muted hover:text-red-500 transition-colors duration-150 p-1 flex-shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <button type="button" className="w-full text-left" onClick={() => setExpanded((v) => !v)}>
        <div className="flex items-center gap-2 text-text-muted text-xs font-inter">
          <svg className={`w-3.5 h-3.5 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {expanded ? 'Hide' : 'Show'} exercises
        </div>
      </button>

      {expanded && (
        <div className="space-y-1 pt-3" style={{ borderTop: '1px solid #2a2a2a' }}>
          {w.exercises.map((ex, i) => (
            <div key={i} className="flex items-center gap-2 py-1">
              <span className="w-4 text-center text-xs font-barlow font-bold flex-shrink-0" style={{ color: '#fc4c02' }}>{i + 1}</span>
              <span className="text-text-secondary text-sm font-inter flex-1">{ex.name}</span>
              <span className="text-text-muted text-xs font-inter">{ex.sets}×{ex.reps}</span>
            </div>
          ))}
        </div>
      )}

      <button className="btn-primary w-full" style={{ height: 44 }} onClick={() => onStart(saved.workout_data)}>
        Start This Workout
      </button>
    </div>
  );
}

// ── Saved Running Workout Card ──

function SavedRunCard({ saved, onDelete }: { saved: SavedRunningWorkout; onDelete: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const w = saved.workout_data;

  const handleDelete = async () => {
    if (!window.confirm('Delete this saved running workout?')) return;
    setDeleting(true);
    try { await deleteSavedRunningWorkout(saved.id); onDelete(saved.id); }
    finally { setDeleting(false); }
  };

  const date = new Date(saved.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const intensityColors: Record<string, string> = {
    easy: '#3b82f6', moderate: '#22c55e', threshold: '#f97316', hard: '#ef4444',
  };

  return (
    <div className="card space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(252,76,2,0.1)' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            style={{ color: '#fc4c02' }}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-barlow font-bold text-white leading-tight">{saved.name}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-text-muted text-xs font-inter">{date}</span>
            <span className="text-text-muted text-xs">·</span>
            <span className="text-text-muted text-xs font-inter">{w.total_duration_minutes} min</span>
            <span className="text-text-muted text-xs">·</span>
            <span className="text-text-muted text-xs font-inter">{w.steps.length} steps</span>
          </div>
        </div>
        <button onClick={handleDelete} disabled={deleting}
          className="text-text-muted hover:text-red-500 transition-colors duration-150 p-1 flex-shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      <button type="button" className="w-full text-left" onClick={() => setExpanded((v) => !v)}>
        <div className="flex items-center gap-2 text-text-muted text-xs font-inter">
          <svg className={`w-3.5 h-3.5 transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {expanded ? 'Hide' : 'Show'} steps
        </div>
      </button>

      {expanded && (
        <div className="space-y-1 pt-3" style={{ borderTop: '1px solid #2a2a2a' }}>
          {w.steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2 py-1">
              <span className="w-4 text-center text-xs font-barlow font-bold flex-shrink-0" style={{ color: '#fc4c02' }}>{s.order}</span>
              <span className="text-text-secondary text-sm font-inter flex-1">{s.name}</span>
              <span className="text-xs font-inter" style={{ color: intensityColors[s.intensity] || '#4a4a4a' }}>
                {s.duration_minutes}m
              </span>
            </div>
          ))}
        </div>
      )}

      <button className="btn-primary w-full" style={{ height: 44 }} onClick={() => downloadFitFile(w)}>
        Download FIT File
      </button>
    </div>
  );
}

// ── History Page ──

interface HistoryPageProps {
  onStartSavedWorkout?: (workout: GeneratedWorkout) => void;
}

export default function HistoryPage({ onStartSavedWorkout }: HistoryPageProps) {
  const [activeTab, setActiveTab] = useState<HistoryTab>('logs');
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [savedWorkouts, setSavedWorkouts] = useState<SavedWorkout[]>([]);
  const [savedRuns, setSavedRuns] = useState<SavedRunningWorkout[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [isLoadingRuns, setIsLoadingRuns] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkouts = async () => {
    setIsLoadingLogs(true); setError(null);
    try { setWorkouts(await getWorkouts()); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to load workouts'); }
    finally { setIsLoadingLogs(false); }
  };

  const fetchSaved = async () => {
    setIsLoadingSaved(true); setError(null);
    try { setSavedWorkouts(await getSavedWorkouts()); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to load saved workouts'); }
    finally { setIsLoadingSaved(false); }
  };

  const fetchRuns = async () => {
    setIsLoadingRuns(true); setError(null);
    try { setSavedRuns(await getSavedRunningWorkouts()); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to load saved runs'); }
    finally { setIsLoadingRuns(false); }
  };

  useEffect(() => { fetchWorkouts(); }, []);

  useEffect(() => {
    if (activeTab === 'saved') fetchSaved();
    else if (activeTab === 'runs') fetchRuns();
  }, [activeTab]);

  const isLoading = isLoadingLogs || isLoadingSaved || isLoadingRuns;
  const refreshFn = activeTab === 'logs' ? fetchWorkouts : activeTab === 'saved' ? fetchSaved : fetchRuns;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-barlow text-white" style={{ fontSize: 28, fontWeight: 700 }}>History</h1>
        <button onClick={refreshFn} disabled={isLoading}
          className="btn-ghost text-sm" style={{ height: 36 }}>
          <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Tab switcher */}
      <div className="flex rounded-lg overflow-hidden p-1 gap-1" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
        {(['logs', 'saved', 'runs'] as HistoryTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className="flex-1 py-2 rounded-lg text-sm font-inter font-medium transition-all duration-150"
            style={{
              background: activeTab === t ? '#fc4c02' : 'transparent',
              color: activeTab === t ? '#fff' : '#4a4a4a',
            }}
          >
            {t === 'logs' ? 'Logs' : t === 'saved' ? 'Plans' : 'Runs'}
          </button>
        ))}
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
          <p className="text-red-500 text-sm font-inter">{error}</p>
          <button className="text-sm mt-2 font-inter" style={{ color: '#fc4c02' }} onClick={refreshFn}>
            Try again
          </button>
        </div>
      )}

      {activeTab === 'logs' && <History workouts={workouts} isLoading={isLoadingLogs} />}

      {activeTab === 'saved' && (
        <div className="space-y-3">
          {isLoadingSaved ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="card space-y-3">
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
              <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center"
                style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
                <svg className="w-6 h-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </div>
              <p className="font-barlow font-bold text-white">No saved plans yet</p>
              <p className="text-text-secondary text-sm font-inter">Generate a workout and tap "Save Workout" to save it here.</p>
            </div>
          ) : (
            savedWorkouts.map((sw) => (
              <SavedWorkoutCard key={sw.id} saved={sw}
                onDelete={(id) => setSavedWorkouts((prev) => prev.filter((s) => s.id !== id))}
                onStart={(w) => onStartSavedWorkout?.(w)} />
            ))
          )}
        </div>
      )}

      {activeTab === 'runs' && (
        <div className="space-y-3">
          {isLoadingRuns ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="card space-y-3">
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
          ) : savedRuns.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center"
                style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
                <svg className="w-6 h-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
                </svg>
              </div>
              <p className="font-barlow font-bold text-white">No saved runs yet</p>
              <p className="text-text-secondary text-sm font-inter">Generate a running workout and tap "Save Workout" to save it here.</p>
            </div>
          ) : (
            savedRuns.map((sr) => (
              <SavedRunCard key={sr.id} saved={sr}
                onDelete={(id) => setSavedRuns((prev) => prev.filter((s) => s.id !== id))} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
