import React, { useState } from 'react';
import { generateRunningWorkout, saveRunningWorkout } from '../api';
import { downloadFitFile } from '../utils/fitWriter';
import type { RunningWorkout, RunningStep, RunningGenerationParams } from '../types';

type PageStep = 'form' | 'loading' | 'result';

const GOAL_RACES = ['5K', '10K', 'Half Marathon', 'Marathon', 'General Fitness'];
const WORKOUT_TYPES = ['Easy Run', 'Long Run', 'Tempo Run', 'Interval Training', 'Hill Repeats', 'Recovery Run'];
const FITNESS_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const DURATIONS = ['20 min', '30 min', '45 min', '60 min', '90 min'];

const INTENSITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  easy: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  moderate: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
  threshold: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20' },
  hard: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
};

function SelectButton({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 rounded-lg text-sm font-dm font-medium border transition-all duration-150 min-h-[44px] ${
        selected
          ? 'bg-amber-500 border-amber-500 text-black'
          : 'bg-surface border-surface-3 text-text-secondary hover:border-amber-500/50 hover:text-text-primary'
      }`}
    >
      {label}
    </button>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="font-barlow font-bold text-text-primary text-sm uppercase tracking-widest">{title}</h3>
      {children}
    </div>
  );
}

function StepCard({ step }: { step: RunningStep }) {
  const [open, setOpen] = useState(false);
  const colors = INTENSITY_COLORS[step.intensity] || INTENSITY_COLORS.easy;

  const typeIcon = step.type === 'warmup' ? '~' : step.type === 'cooldown' ? '~' : '>';

  return (
    <div className={`card border ${colors.border} space-y-3`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg ${colors.bg} border ${colors.border} flex items-center justify-center flex-shrink-0 mt-0.5`}>
          <span className={`font-barlow font-black text-sm ${colors.text}`}>{step.order}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-barlow font-bold text-text-primary text-lg leading-tight">{step.name}</h4>
          <div className="flex flex-wrap gap-1.5 mt-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-dm font-medium ${colors.bg} ${colors.text}`}>
              {step.intensity}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-dm font-medium bg-surface-2 text-text-muted">
              Zone {step.heart_rate_zone}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3">
        <div className="flex-1 bg-surface-2 rounded-lg p-2 text-center">
          <div className={`font-barlow font-black text-lg leading-none ${colors.text}`}>
            {step.duration_minutes}
          </div>
          <div className="text-text-muted text-xs font-dm mt-0.5">min</div>
        </div>
        <div className="flex-1 bg-surface-2 rounded-lg p-2">
          <div className="text-text-secondary text-xs font-dm leading-snug">
            {step.pace_description}
          </div>
        </div>
      </div>

      {/* Notes toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-text-muted text-xs font-dm hover:text-text-secondary transition-colors"
      >
        <svg
          className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-90' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {open ? 'Hide' : 'Show'} notes
      </button>
      {open && (
        <p className="text-text-secondary text-sm font-dm leading-relaxed border-t border-surface-3 pt-3">
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

  // Form state
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
      goal_race: goalRace,
      workout_type: workoutType,
      fitness_level: fitnessLevel,
      target_duration: targetDuration,
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

  const handleRegenerate = () => {
    setSavedId(null);
    setResult(null);
    handleGenerate();
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
    try {
      downloadFitFile(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate FIT file');
    }
  };

  // ── LOADING ──
  if (step === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-surface-3" />
          <div className="absolute inset-0 rounded-full border-4 border-t-amber-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z"
              />
            </svg>
          </div>
        </div>
        <div>
          <p className="font-barlow text-2xl font-bold text-text-primary">Building Your Run</p>
          <p className="text-text-muted font-dm text-sm mt-1">AI is crafting your running workout...</p>
        </div>
        <div className="w-full space-y-3 mt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card border border-surface-3 space-y-3 opacity-50">
              <div className="flex gap-3">
                <div className="skeleton w-8 h-8 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-5 w-3/4 rounded" />
                  <div className="skeleton h-4 w-1/2 rounded" />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1 skeleton h-12 rounded-lg" />
                <div className="flex-1 skeleton h-12 rounded-lg" />
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
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-barlow text-3xl font-black text-text-primary leading-tight">
              {result.workout_name}
            </h1>
            <p className="text-text-secondary text-sm font-dm mt-1">{result.description}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="flex items-center gap-1 text-text-muted text-sm font-dm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {result.total_duration_minutes} min
              </span>
              <span className="text-text-muted text-sm font-dm">
                {result.steps.length} steps
              </span>
            </div>
          </div>
          <button onClick={() => setStep('form')} className="btn-ghost py-1.5 px-2 text-sm flex-shrink-0">
            &larr; Edit
          </button>
        </div>

        {result.coaching_tips && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex gap-2">
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-text-secondary text-sm font-dm">{result.coaching_tips}</p>
          </div>
        )}

        {/* Step cards */}
        <div className="space-y-3">
          {result.steps.map((s) => (
            <StepCard key={s.order} step={s} />
          ))}
        </div>

        {/* Total duration summary */}
        <div className="bg-surface-2 rounded-xl p-4 text-center">
          <div className="font-barlow font-black text-amber-500 text-2xl">
            {result.total_duration_minutes} min
          </div>
          <div className="text-text-muted text-xs font-dm mt-0.5">Total Duration</div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3 pt-2">
          <button className="btn-primary w-full text-lg py-4" onClick={handleDownloadFit}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Download FIT File
          </button>

          <p className="text-text-muted text-xs font-dm text-center px-4">
            To import into Coros: Open Coros app &rarr; Training &rarr; Workout Library &rarr; tap Import &rarr; select this file
          </p>

          <div className="flex gap-3">
            <button className="btn-secondary flex-1" onClick={handleRegenerate}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Regenerate
            </button>

            <button
              className={`btn-secondary flex-1 ${savedId ? 'opacity-60' : ''}`}
              onClick={handleSave}
              disabled={isSaving || !!savedId}
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : savedId ? (
                <>
                  <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Saved
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                    />
                  </svg>
                  Save Workout
                </>
              )}
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
        <h1 className="font-barlow text-3xl font-black text-text-primary">Running Workout Builder</h1>
        <p className="text-text-muted font-dm text-sm mt-1">
          Generate a Coros-compatible running workout with AI coaching.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-5">
        <FormSection title="Goal Race">
          <div className="grid grid-cols-2 gap-2">
            {GOAL_RACES.map((g) => (
              <SelectButton key={g} label={g} selected={goalRace === g} onClick={() => setGoalRace(g)} />
            ))}
          </div>
        </FormSection>

        <FormSection title="Workout Type">
          <div className="grid grid-cols-2 gap-2">
            {WORKOUT_TYPES.map((w) => (
              <SelectButton key={w} label={w} selected={workoutType === w} onClick={() => setWorkoutType(w)} />
            ))}
          </div>
        </FormSection>

        <FormSection title="Fitness Level">
          <div className="flex gap-2">
            {FITNESS_LEVELS.map((f) => (
              <SelectButton key={f} label={f} selected={fitnessLevel === f} onClick={() => setFitnessLevel(f)} />
            ))}
          </div>
        </FormSection>

        <FormSection title="Target Duration">
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((d) => (
              <SelectButton key={d} label={d} selected={targetDuration === d} onClick={() => setTargetDuration(d)} />
            ))}
          </div>
        </FormSection>

        <FormSection title="Current Pace (Optional)">
          <input
            type="text"
            value={currentPace}
            onChange={(e) => setCurrentPace(e.target.value)}
            placeholder="e.g. 10:00 min/mile"
            className="w-full px-4 py-3 rounded-lg bg-surface border border-surface-3 text-text-primary font-dm text-sm placeholder:text-text-muted focus:outline-none focus:border-amber-500/50 transition-colors"
          />
        </FormSection>
      </div>

      <button
        className="btn-primary w-full text-lg py-4"
        onClick={handleGenerate}
        disabled={!canGenerate}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z"
          />
        </svg>
        Generate Running Workout
      </button>
    </div>
  );
}
