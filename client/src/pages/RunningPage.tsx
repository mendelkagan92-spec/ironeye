import React, { useState } from 'react';
import { generateRunningWorkout, saveRunningWorkout } from '../api';
import { downloadFitFile } from '../utils/fitWriter';
import type { RunningWorkout, RunningStep, RunningGenerationParams } from '../types';

type PageStep = 'form' | 'loading' | 'result';

const GOAL_RACES = ['5K', '10K', 'Half Marathon', 'Marathon', 'General Fitness'];
const WORKOUT_TYPES = ['Easy Run', 'Long Run', 'Tempo Run', 'Interval Training', 'Hill Repeats', 'Recovery Run'];
const FITNESS_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const DURATIONS = ['20 min', '30 min', '45 min', '60 min', '90 min'];

const INTENSITY_COLORS: Record<string, { border: string; dot: string; text: string }> = {
  easy: { border: '#3b82f6', dot: '#3b82f6', text: '#3b82f6' },
  moderate: { border: '#22c55e', dot: '#22c55e', text: '#22c55e' },
  threshold: { border: '#f97316', dot: '#f97316', text: '#f97316' },
  hard: { border: '#ef4444', dot: '#ef4444', text: '#ef4444' },
};

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-2 rounded-lg text-sm font-inter font-medium transition-all duration-150"
      style={{
        height: 44,
        background: selected ? '#fc4c02' : 'transparent',
        color: selected ? '#fff' : '#8a8a8a',
        border: selected ? '1px solid #fc4c02' : '1px solid #2a2a2a',
      }}
    >
      {label}
    </button>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="label">{title}</h3>
      {children}
    </div>
  );
}

function StepCard({ step }: { step: RunningStep }) {
  const [open, setOpen] = useState(false);
  const colors = INTENSITY_COLORS[step.intensity] || INTENSITY_COLORS.easy;

  return (
    <div className="card space-y-3" style={{ borderLeftWidth: 3, borderLeftColor: colors.border }}>
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: `${colors.dot}15` }}>
          <span className="font-barlow font-bold text-sm" style={{ color: colors.text }}>{step.order}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-barlow font-bold text-white text-lg leading-tight">{step.name}</h4>
          <div className="flex flex-wrap gap-1.5 mt-1">
            <span className="flex items-center gap-1 text-xs font-inter font-medium">
              <span className="w-2 h-2 rounded-full" style={{ background: colors.dot }} />
              <span style={{ color: colors.text }}>{step.intensity}</span>
            </span>
            <span className="text-xs font-inter text-text-muted">Zone {step.heart_rate_zone}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 rounded-lg p-2 text-center" style={{ background: '#242424' }}>
          <div className="font-barlow font-bold text-white text-lg leading-none">{step.duration_minutes}</div>
          <div className="text-text-muted text-xs font-inter mt-0.5">min</div>
        </div>
        <div className="flex-1 rounded-lg p-2" style={{ background: '#242424' }}>
          <div className="text-text-secondary text-xs font-inter leading-snug">{step.pace_description}</div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-text-muted text-xs font-inter transition-colors duration-150"
      >
        <svg className={`w-3.5 h-3.5 transition-transform duration-150 ${open ? 'rotate-90' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {open ? 'Hide' : 'Show'} notes
      </button>
      {open && (
        <p className="text-text-secondary text-sm font-inter leading-relaxed pt-3"
          style={{ borderTop: '1px solid #2a2a2a' }}>
          {step.notes}
        </p>
      )}
    </div>
  );
}

export default function RunningPage() {
  const [step, setStep] = useState<PageStep>('form');
  const [result, setResult] = useState<RunningWorkout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);

  const [goalRace, setGoalRace] = useState('');
  const [workoutType, setWorkoutType] = useState('');
  const [fitnessLevel, setFitnessLevel] = useState('');
  const [targetDuration, setTargetDuration] = useState('');
  const [currentPace, setCurrentPace] = useState('');

  const canGenerate = goalRace && workoutType && fitnessLevel && targetDuration;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setStep('loading');
    setError(null);
    setSavedId(null);
    const params: RunningGenerationParams = {
      goal_race: goalRace, workout_type: workoutType,
      fitness_level: fitnessLevel, target_duration: targetDuration,
      current_pace: currentPace || undefined,
    };
    try {
      const data = await generateRunningWorkout(params);
      setResult(data);
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate workout');
      setStep('form');
    }
  };

  const handleSave = async () => {
    if (!result || isSaving) return;
    setIsSaving(true);
    try {
      const { id } = await saveRunningWorkout(result.workout_name, result);
      setSavedId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadFit = () => {
    if (!result) return;
    try { downloadFitFile(result); }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to generate FIT file'); }
  };

  // ── LOADING ──
  if (step === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full" style={{ border: '3px solid #2a2a2a' }} />
          <div className="absolute inset-0 rounded-full animate-spin"
            style={{ border: '3px solid transparent', borderTopColor: '#fc4c02' }} />
        </div>
        <div>
          <p className="font-barlow text-2xl font-bold text-white">Building Your Run</p>
          <p className="text-text-secondary font-inter text-sm mt-1">AI is crafting your running workout...</p>
        </div>
        <div className="w-full space-y-3 mt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card space-y-3 opacity-50">
              <div className="flex gap-3">
                <div className="skeleton w-7 h-7 rounded" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-5 w-3/4 rounded" />
                  <div className="skeleton h-4 w-1/2 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── RESULT ──
  if (step === 'result' && result) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-barlow text-white leading-tight" style={{ fontSize: 28, fontWeight: 700 }}>
              {result.workout_name}
            </h1>
            <p className="text-text-secondary text-sm font-inter mt-1">{result.description}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-text-secondary text-sm font-inter">{result.total_duration_minutes} min</span>
              <span className="text-text-secondary text-sm font-inter">{result.steps.length} steps</span>
            </div>
          </div>
          <button onClick={() => setStep('form')} className="btn-ghost text-sm" style={{ height: 36 }}>
            Edit
          </button>
        </div>

        {result.coaching_tips && (
          <div className="card" style={{ borderLeftWidth: 3, borderLeftColor: '#fc4c02' }}>
            <p className="text-text-secondary text-sm font-inter">{result.coaching_tips}</p>
          </div>
        )}

        <div className="space-y-3">
          {result.steps.map((s) => <StepCard key={s.order} step={s} />)}
        </div>

        <div className="rounded-lg p-4 text-center" style={{ background: '#242424' }}>
          <div className="font-barlow font-bold text-white" style={{ fontSize: 32 }}>
            {result.total_duration_minutes} min
          </div>
          <div className="text-text-muted text-xs font-inter mt-0.5">Total Duration</div>
        </div>

        {error && (
          <div className="card" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
            <p className="text-red-500 text-sm font-inter">{error}</p>
          </div>
        )}

        <div className="space-y-3 pt-2">
          <button className="btn-primary w-full" onClick={handleDownloadFit}>
            Download FIT File
          </button>
          <p className="text-text-muted text-xs font-inter text-center px-4">
            To import into Coros: Open Coros app &rarr; Training &rarr; Workout Library &rarr; tap Import &rarr; select this file
          </p>
          <div className="flex gap-3">
            <button className="btn-secondary flex-1"
              onClick={() => { setSavedId(null); setResult(null); handleGenerate(); }}>
              Regenerate
            </button>
            <button
              className="btn-secondary flex-1"
              onClick={handleSave}
              disabled={isSaving || !!savedId}
              style={{ opacity: savedId ? 0.6 : 1 }}
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : savedId ? (
                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#00d4aa' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg> Saved</>
              ) : 'Save Workout'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── FORM ──
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-barlow text-white" style={{ fontSize: 28, fontWeight: 700 }}>Running Workout Builder</h1>
        <p className="text-text-secondary font-inter text-sm mt-1">
          Generate a Coros-compatible running workout with AI coaching.
        </p>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
          <p className="text-red-500 text-sm font-inter">{error}</p>
        </div>
      )}

      <div className="space-y-5">
        <FormSection title="Goal Race">
          <div className="grid grid-cols-2 gap-2">
            {GOAL_RACES.map((g) => <Chip key={g} label={g} selected={goalRace === g} onClick={() => setGoalRace(g)} />)}
          </div>
        </FormSection>

        <FormSection title="Workout Type">
          <div className="grid grid-cols-2 gap-2">
            {WORKOUT_TYPES.map((w) => <Chip key={w} label={w} selected={workoutType === w} onClick={() => setWorkoutType(w)} />)}
          </div>
        </FormSection>

        <FormSection title="Fitness Level">
          <div className="flex gap-2">
            {FITNESS_LEVELS.map((f) => <Chip key={f} label={f} selected={fitnessLevel === f} onClick={() => setFitnessLevel(f)} />)}
          </div>
        </FormSection>

        <FormSection title="Target Duration">
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((d) => <Chip key={d} label={d} selected={targetDuration === d} onClick={() => setTargetDuration(d)} />)}
          </div>
        </FormSection>

        <FormSection title="Current Pace (Optional)">
          <input
            type="text"
            value={currentPace}
            onChange={(e) => setCurrentPace(e.target.value)}
            placeholder="e.g. 10:00 min/mile"
            className="input-field"
          />
        </FormSection>
      </div>

      <button className="btn-primary w-full" onClick={handleGenerate} disabled={!canGenerate}>
        Generate Running Workout
      </button>
    </div>
  );
}
