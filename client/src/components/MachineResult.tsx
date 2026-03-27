import React from 'react';
import type { MachineInfo } from '../types';

interface MachineResultProps {
  machine: MachineInfo | null;
  isLoading: boolean;
  imagePreview?: string;
}

const DIFFICULTY_COLORS = {
  beginner: 'text-green-400 bg-green-400/10 border-green-400/30',
  intermediate: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  advanced: 'text-red-400 bg-red-400/10 border-red-400/30',
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
        <div className="skeleton h-6 w-16 rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-5/6 rounded" />
        <div className="skeleton h-4 w-4/6 rounded" />
      </div>
      <div className="flex items-center gap-3 pt-2">
        <div className="skeleton h-8 w-24 rounded-lg" />
        <div className="skeleton h-4 w-32 rounded" />
      </div>
    </div>
  );
}

export default function MachineResult({ machine, isLoading, imagePreview }: MachineResultProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-amber-500">
          <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="font-barlow text-sm uppercase tracking-wider">Analyzing equipment...</span>
        </div>
        <SkeletonCard />
      </div>
    );
  }

  if (!machine) return null;

  if (machine.error) {
    return (
      <div className="card border-red-500/20 bg-red-500/5 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <p className="text-red-400 font-barlow text-lg">{machine.error}</p>
            <p className="text-text-muted text-sm">Try taking a clearer photo or use manual entry</p>
          </div>
        </div>
      </div>
    );
  }

  const difficulty = machine.difficulty || 'beginner';
  const difficultyClass = DIFFICULTY_COLORS[difficulty] || DIFFICULTY_COLORS.beginner;

  return (
    <div className="card animate-slide-up space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        {imagePreview && (
          <img
            src={imagePreview}
            alt="Captured equipment"
            className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border border-surface-3"
          />
        )}
        <div className="flex-1 min-w-0">
          <h2 className="font-barlow text-2xl font-bold text-text-primary leading-tight">
            {machine.machine_name}
          </h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs font-dm px-2 py-0.5 rounded-full border ${difficultyClass}`}>
              {difficulty}
            </span>
            <span className="text-text-muted text-xs">
              {machine.suggested_sets} sets · {machine.suggested_reps_min}–{machine.suggested_reps_max} reps
            </span>
          </div>
        </div>
      </div>

      {/* Muscles */}
      {machine.muscles && machine.muscles.length > 0 && (
        <div>
          <p className="text-text-muted text-xs font-barlow uppercase tracking-wider mb-2">Muscles</p>
          <div className="flex flex-wrap gap-1.5">
            {machine.muscles.map((muscle) => (
              <span key={muscle} className="amber-tag">
                {muscle}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Form Tips */}
      {machine.form_tips && machine.form_tips.length > 0 && (
        <div>
          <p className="text-text-muted text-xs font-barlow uppercase tracking-wider mb-2">Form Tips</p>
          <ul className="space-y-1.5">
            {machine.form_tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                <span className="text-amber-500 mt-0.5 flex-shrink-0">›</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
