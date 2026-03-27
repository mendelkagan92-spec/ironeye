import React, { useState } from 'react';
import { generateWorkout, saveWorkout } from '../api';
import type { GeneratedWorkout, GeneratedExercise, WorkoutGenerationParams } from '../types';

interface GeneratePageProps {
  onStartWorkout: (workout: GeneratedWorkout) => void;
}

type PageStep = 'form' | 'loading' | 'result';

const GOALS = ['Lose Weight', 'Build Muscle', 'Improve Endurance', 'Increase Strength'];
const EXPERIENCE = ['Beginner', 'Intermediate', 'Advanced'];
const EQUIPMENT = ['Dumbbells', 'Barbells', 'Cables', 'Machines', 'Bodyweight Only', 'Full Gym'];
const DURATIONS = ['30 min', '45 min', '60 min', '90 min'];
const FOCUS = ['Full Body', 'Upper Body', 'Lower Body', 'Push', 'Pull', 'Legs', 'Core'];

function SelectButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
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
      <h3 className="font-barlow font-bold text-text-primary text-sm uppercase tracking-widest">
        {title}
      </h3>
      {children}
    </div>
  );
}

function ExerciseCard({ exercise, index }: { exercise: GeneratedExercise; index: number }) {
  const [open, setOpen] = useState(false);
  const restMin = Math.floor(exercise.rest_seconds / 60);
  const restSec = exercise.rest_seconds % 60;
  const restLabel = restMin > 0
    ? `${restMin}m ${restSec > 0 ? `${restSec}s` : ''}`.trim()
    : `${restSec}s`;

  return (
    <div className="card border border-surface-3 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="font-barlow font-black text-amber-500 text-xs">{index + 1}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-barlow font-bold text-text-primary text-lg leading-tight">
            {exercise.name}
          </h4>
          <div className="flex flex-wrap gap-1 mt-1">
            {exercise.muscles.map((m) => (
              <span key={m} className="tag text-xs">{m}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-3">
        {[
          { label: 'Sets', value: exercise.sets },
          { label: 'Reps', value: exercise.reps },
          { label: 'Rest', value: restLabel },
        ].map((s) => (
          <div key={s.label} className="flex-1 bg-surface-2 rounded-lg p-2 text-center">
            <div className="font-barlow font-black text-amber-500 text-lg leading-none">
              {s.value}
            </div>
            <div className="text-text-muted text-xs font-dm mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Instructions toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-text-muted text-xs font-dm hover:text-text-secondary transition-colors"
      >
        <svg
          className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {open ? 'Hide' : 'Show'} instructions
      </button>
      {open && (
        <p className="text-text-secondary text-sm font-dm leading-relaxed border-t border-surface-3 pt-3">
          {exercise.instructions}
        </p>
      )}
    </div>
  );
}

export default function GeneratePage({ onStartWorkout }: GeneratePageProps) {
  const [step, setStep] = useState<PageStep>('form');
  const [result, setResult] = useState<GeneratedWorkout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedId, setSavedId] = useState<number | null>(null);

  // Form state
  const [goal, setGoal] = useState('');
  const [experience, setExperience] = useState('');
  const [equipment, setEquipment] = useState<string[]>([]);
  const [duration, setDuration] = useState('');
  const [focus, setFocus] = useState('');

  const toggleEquipment = (item: string) => {
    setEquipment((prev) =>
      prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item]
    );
  };

  const canGenerate = goal && experience && equipment.length > 0 && duration && focus;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setStep('loading');
    setError(null);
    setSavedId(null);

    const params: WorkoutGenerationParams = { goal, experience, equipment, duration, focus };
    try {
      const data = await generateWorkout(params);
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
      const { id } = await saveWorkout(result.workout_name, result);
      setSavedId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  // ── LOADING ───────────────────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-surface-3" />
          <div className="absolute inset-0 rounded-full border-4 border-t-amber-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
        <div>
          <p className="font-barlow text-2xl font-bold text-text-primary">Building Your Workout</p>
          <p className="text-text-muted font-dm text-sm mt-1">AI is crafting your personalized plan…</p>
        </div>
        {/* Skeleton cards */}
        <div className="w-full space-y-3 mt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card border border-surface-3 space-y-3 opacity-50">
              <div className="flex gap-3">
                <div className="skeleton w-7 h-7 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-5 w-3/4 rounded" />
                  <div className="skeleton h-4 w-1/2 rounded" />
                </div>
              </div>
              <div className="flex gap-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="flex-1 skeleton h-12 rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── RESULT ────────────────────────────────────────────────────────────
  if (step === 'result' && result) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-barlow text-3xl font-black text-text-primary leading-tight">
              {result.workout_name}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-text-muted text-sm font-dm">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {result.estimated_duration}
              </span>
              <span className="text-text-muted text-sm font-dm">
                {result.exercises.length} exercises
              </span>
            </div>
          </div>
          <button
            onClick={() => setStep('form')}
            className="btn-ghost py-1.5 px-2 text-sm flex-shrink-0"
          >
            ← Edit
          </button>
        </div>

        {result.notes && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 flex gap-2">
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-text-secondary text-sm font-dm">{result.notes}</p>
          </div>
        )}

        {/* Exercise cards */}
        <div className="space-y-3">
          {result.exercises.map((ex, i) => (
            <ExerciseCard key={i} exercise={ex} index={i} />
          ))}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="space-y-3 pt-2">
          <button
            className="btn-primary w-full text-lg py-4"
            onClick={() => onStartWorkout(result)}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Start This Workout
          </button>

          <div className="flex gap-3">
            <button
              className="btn-secondary flex-1"
              onClick={handleRegenerate}
            >
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

  // ── FORM ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-barlow text-3xl font-black text-text-primary">AI Workout Builder</h1>
        <p className="text-text-muted font-dm text-sm mt-1">
          Tell Claude your goals and get a personalized workout in seconds.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-5">
        <FormSection title="Goal">
          <div className="grid grid-cols-2 gap-2">
            {GOALS.map((g) => (
              <SelectButton key={g} label={g} selected={goal === g} onClick={() => setGoal(g)} />
            ))}
          </div>
        </FormSection>

        <FormSection title="Experience Level">
          <div className="flex gap-2">
            {EXPERIENCE.map((e) => (
              <SelectButton
                key={e}
                label={e}
                selected={experience === e}
                onClick={() => setExperience(e)}
              />
            ))}
          </div>
        </FormSection>

        <FormSection title="Available Equipment">
          <div className="grid grid-cols-2 gap-2">
            {EQUIPMENT.map((e) => (
              <SelectButton
                key={e}
                label={e}
                selected={equipment.includes(e)}
                onClick={() => toggleEquipment(e)}
              />
            ))}
          </div>
          {equipment.length > 0 && (
            <p className="text-text-muted text-xs font-dm">
              {equipment.length} selected
            </p>
          )}
        </FormSection>

        <FormSection title="Workout Duration">
          <div className="flex gap-2">
            {DURATIONS.map((d) => (
              <SelectButton
                key={d}
                label={d}
                selected={duration === d}
                onClick={() => setDuration(d)}
              />
            ))}
          </div>
        </FormSection>

        <FormSection title="Muscle Focus">
          <div className="flex flex-wrap gap-2">
            {FOCUS.map((f) => (
              <SelectButton
                key={f}
                label={f}
                selected={focus === f}
                onClick={() => setFocus(f)}
              />
            ))}
          </div>
        </FormSection>
      </div>

      <button
        className="btn-primary w-full text-lg py-4"
        onClick={handleGenerate}
        disabled={!canGenerate}
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path
            fillRule="evenodd"
            d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5z"
            clipRule="evenodd"
          />
        </svg>
        Generate My Workout
      </button>
    </div>
  );
}
