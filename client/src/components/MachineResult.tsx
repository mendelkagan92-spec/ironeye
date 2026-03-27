import React from 'react';
import type { MachineInfo } from '../types';

interface MachineResultProps {
  machine: MachineInfo | null;
  isLoading: boolean;
  imagePreview?: string;
}

const DIFFICULTY_COLORS: Record<string, { dot: string; text: string }> = {
  beginner: { dot: '#00d4aa', text: '#00d4aa' },
  intermediate: { dot: '#fc4c02', text: '#fc4c02' },
  advanced: { dot: '#ef4444', text: '#ef4444' },
};

function SkeletonCard() {
  return (
    <div className="card animate-fade-in space-y-4">
      <div className="flex items-start gap-3">
        <div className="skeleton w-12 h-12 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-6 w-3/4 rounded" />
          <div className="skeleton h-4 w-1/2 rounded" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="skeleton h-6 w-20 rounded-full" />
        <div className="skeleton h-6 w-24 rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-5/6 rounded" />
      </div>
    </div>
  );
}

export default function MachineResult({ machine, isLoading, imagePreview }: MachineResultProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2" style={{ color: '#fc4c02' }}>
          <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: '#fc4c02', borderTopColor: 'transparent' }} />
          <span className="label" style={{ color: '#fc4c02' }}>Analyzing equipment...</span>
        </div>
        <SkeletonCard />
      </div>
    );
  }

  if (!machine) return null;

  if (machine.error) {
    return (
      <div className="card animate-fade-in" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(239,68,68,0.1)' }}>
            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <p className="text-red-500 font-barlow text-lg">{machine.error}</p>
            <p className="text-text-muted text-sm font-inter">Try a clearer photo or manual entry</p>
          </div>
        </div>
      </div>
    );
  }

  const difficulty = machine.difficulty || 'beginner';
  const dc = DIFFICULTY_COLORS[difficulty] || DIFFICULTY_COLORS.beginner;

  return (
    <div className="card animate-slide-up space-y-4">
      <div className="flex items-start gap-3">
        {imagePreview && (
          <img src={imagePreview} alt="Captured equipment"
            className="w-14 h-14 object-cover flex-shrink-0"
            style={{ borderRadius: 8, border: '1px solid #2a2a2a' }} />
        )}
        <div className="flex-1 min-w-0">
          <h2 className="font-barlow text-2xl font-bold text-white leading-tight">
            {machine.machine_name}
          </h2>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs font-inter">
              <span className="w-2 h-2 rounded-full" style={{ background: dc.dot }} />
              <span style={{ color: dc.text }}>{difficulty}</span>
            </span>
            <span className="text-text-muted text-xs font-inter">
              {machine.suggested_sets} sets · {machine.suggested_reps_min}–{machine.suggested_reps_max} reps
            </span>
          </div>
        </div>
      </div>

      {machine.muscles && machine.muscles.length > 0 && (
        <div>
          <p className="label mb-2">Muscles</p>
          <div className="flex flex-wrap gap-1.5">
            {machine.muscles.map((muscle) => (
              <span key={muscle} className="accent-tag">{muscle}</span>
            ))}
          </div>
        </div>
      )}

      {machine.form_tips && machine.form_tips.length > 0 && (
        <div>
          <p className="label mb-2">Form Tips</p>
          <ul className="space-y-1.5">
            {machine.form_tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-secondary font-inter">
                <span style={{ color: '#fc4c02' }} className="mt-0.5 flex-shrink-0">›</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
