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

function ExerciseCard({ exercise, index }: { exercise: GeneratedExercise; index: number }) {
  const [open, setOpen] = useState(false);
  const restMin = Math.floor(exercise.rest_seconds / 60);
  const restSec = exercise.rest_seconds % 60;
  const restLabel = restMin > 0 ? `${restMin}m${restSec > 0 ? ` ${restSec}s` : ''}` : `${restSec}s`;

  return (
    <div className="card space-y-3" style={{ borderLeftWidth: 3, borderLeftColor: '#fc4c02' }}>
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: 'rgba(252,76,2,0.1)' }}>
          <span className="font-barlow font-bold text-sm" style={{ color: '#fc4c02' }}>{index + 1}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-barlow font-bold text-white text-lg leading-tight">{exercise.name}</h4>
          <div className="flex flex-wrap gap-1 mt-1">
            {exercise.muscles.map((m) => (
              <span key={m} className="tag text-xs">{m}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        {[
          { label: 'Sets', value: exercise.sets },
          { label: 'Reps', value: exercise.reps },
          { label: 'Rest', value: restLabel },
        ].map((s) => (
          <div key={s.label} className="flex-1 rounded-lg p-2 text-center" style={{ background: '#242424' }}>
            <div className="font-barlow font-bold text-white text-lg leading-none">{s.value}</div>
            <div className="text-text-muted text-xs font-inter mt-0.5">{s.label}</div>
          </div>
        ))}
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
        {open ? 'Hide' : 'Show'} instructions
      </button>
      {open && (
        <p className="text-text-secondary text-sm font-inter leading-relaxed pt-3"
          style={{ borderTop: '1px solid #2a2a2a' }}>
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

  const [goal, setGoal] = useState('');
  const [experience, setExperience] = useState('');
  const [equipment, setEquipment] = useState<string[]>([]);
  const [duration, setDuration] = useState('');
  const [focus, setFocus] = useState('');

  const toggleEquipment = (item: string) => {
    setEquipment((prev) => prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item]);
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
          <p className="font-barlow text-2xl font-bold text-white">Building Your Workout</p>
          <p className="text-text-secondary font-inter text-sm mt-1">AI is crafting your personalized plan...</p>
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
            <div className="flex items-center gap-3 mt-1">
              <span className="text-text-secondary text-sm font-inter">{result.estimated_duration}</span>
              <span className="text-text-secondary text-sm font-inter">{result.exercises.length} exercises</span>
            </div>
          </div>
          <button onClick={() => setStep('form')} className="btn-ghost text-sm" style={{ height: 36 }}>
            Edit
          </button>
        </div>

        {result.notes && (
          <div className="card" style={{ borderLeftWidth: 3, borderLeftColor: '#fc4c02' }}>
            <p className="text-text-secondary text-sm font-inter">{result.notes}</p>
          </div>
        )}

        <div className="space-y-3">
          {result.exercises.map((ex, i) => (
            <ExerciseCard key={i} exercise={ex} index={i} />
          ))}
        </div>

        {error && (
          <div className="card" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
            <p className="text-red-500 text-sm font-inter">{error}</p>
          </div>
        )}

        <div className="space-y-3 pt-2">
          <button className="btn-primary w-full" onClick={() => onStartWorkout(result)}>
            Start This Workout
          </button>
          <div className="flex gap-3">
            <button className="btn-secondary flex-1" onClick={() => { setSavedId(null); setResult(null); handleGenerate(); }}>
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
        <h1 className="font-barlow text-white" style={{ fontSize: 28, fontWeight: 700 }}>AI Workout Builder</h1>
        <p className="text-text-secondary font-inter text-sm mt-1">
          Tell Claude your goals and get a personalized workout in seconds.
        </p>
      </div>

      {error && (
        <div className="card" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
          <p className="text-red-500 text-sm font-inter">{error}</p>
        </div>
      )}

      <div className="space-y-5">
        <FormSection title="Goal">
          <div className="grid grid-cols-2 gap-2">
            {GOALS.map((g) => <Chip key={g} label={g} selected={goal === g} onClick={() => setGoal(g)} />)}
          </div>
        </FormSection>

        <FormSection title="Experience Level">
          <div className="flex gap-2">
            {EXPERIENCE.map((e) => <Chip key={e} label={e} selected={experience === e} onClick={() => setExperience(e)} />)}
          </div>
        </FormSection>

        <FormSection title="Available Equipment">
          <div className="grid grid-cols-2 gap-2">
            {EQUIPMENT.map((e) => <Chip key={e} label={e} selected={equipment.includes(e)} onClick={() => toggleEquipment(e)} />)}
          </div>
          {equipment.length > 0 && (
            <p className="text-text-muted text-xs font-inter">{equipment.length} selected</p>
          )}
        </FormSection>

        <FormSection title="Workout Duration">
          <div className="flex gap-2">
            {DURATIONS.map((d) => <Chip key={d} label={d} selected={duration === d} onClick={() => setDuration(d)} />)}
          </div>
        </FormSection>

        <FormSection title="Muscle Focus">
          <div className="flex flex-wrap gap-2">
            {FOCUS.map((f) => <Chip key={f} label={f} selected={focus === f} onClick={() => setFocus(f)} />)}
          </div>
        </FormSection>
      </div>

      <button className="btn-primary w-full" onClick={handleGenerate} disabled={!canGenerate}>
        Generate My Workout
      </button>
    </div>
  );
}
