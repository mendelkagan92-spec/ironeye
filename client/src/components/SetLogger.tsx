import React, { useState } from 'react';
import type { PendingSet, WeightUnit } from '../types';

interface SetLoggerProps {
  sets: PendingSet[];
  weightUnit: WeightUnit;
  onAddSet: (set: Omit<PendingSet, 'set_number'>) => Promise<void>;
  onToggleUnit: () => void;
  onDone: () => void;
  suggestedSets?: number;
  suggestedRepsMin?: number;
  suggestedRepsMax?: number;
}

interface SetRowProps {
  set: PendingSet;
  index: number;
  weightUnit: WeightUnit;
}

function SetRow({ set, index, weightUnit }: SetRowProps) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-surface-3 animate-slide-up">
      <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
        <span className="text-amber-500 font-barlow font-bold text-sm">{index + 1}</span>
      </div>
      <div className="flex-1 flex items-center gap-3">
        {set.weight !== null && (
          <span className="text-text-primary font-dm font-medium">
            {set.weight}
            <span className="text-text-muted text-xs ml-0.5">{weightUnit}</span>
          </span>
        )}
        {set.reps !== null && (
          <>
            <span className="text-surface-3">×</span>
            <span className="text-text-primary font-dm font-medium">
              {set.reps}
              <span className="text-text-muted text-xs ml-0.5">reps</span>
            </span>
          </>
        )}
      </div>
      {set.rpe !== null && (
        <span className="tag">RPE {set.rpe}</span>
      )}
      <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    </div>
  );
}

export default function SetLogger({
  sets,
  weightUnit,
  onAddSet,
  onToggleUnit,
  onDone,
  suggestedRepsMin,
  suggestedRepsMax,
}: SetLoggerProps) {
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [rpe, setRpe] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showRpe, setShowRpe] = useState(false);

  // Pre-fill reps from suggestions
  const repsPlaceholder =
    suggestedRepsMin && suggestedRepsMax
      ? `${suggestedRepsMin}–${suggestedRepsMax}`
      : 'Reps';

  const handleAddSet = async () => {
    if (!reps && !weight) return;
    setIsAdding(true);
    try {
      await onAddSet({
        weight: weight ? parseFloat(weight) : null,
        weight_unit: weightUnit,
        reps: reps ? parseInt(reps) : null,
        rpe: rpe ? parseInt(rpe) : null,
      });
      // Keep weight, clear reps and RPE for next set
      setReps('');
      setRpe('');
    } finally {
      setIsAdding(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleKeyDown(e);
    }
  };

  return (
    <div className="card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-barlow text-xl font-bold text-text-primary">Log Sets</h3>
        <button
          onClick={onToggleUnit}
          className="flex items-center gap-1 bg-surface-2 border border-surface-3 rounded-lg px-3 py-1.5 text-sm font-dm"
        >
          <span className={weightUnit === 'kg' ? 'text-amber-500 font-medium' : 'text-text-muted'}>kg</span>
          <span className="text-surface-3 mx-1">|</span>
          <span className={weightUnit === 'lbs' ? 'text-amber-500 font-medium' : 'text-text-muted'}>lbs</span>
        </button>
      </div>

      {/* Logged sets */}
      {sets.length > 0 && (
        <div>
          {sets.map((set, i) => (
            <SetRow key={i} set={set} index={i} weightUnit={weightUnit} />
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-text-muted text-xs font-dm uppercase tracking-wider block mb-1">
              Weight ({weightUnit})
            </label>
            <input
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="0"
              className="input-field text-center text-lg font-dm font-medium"
            />
          </div>
          <div className="flex-1">
            <label className="text-text-muted text-xs font-dm uppercase tracking-wider block mb-1">
              Reps
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              placeholder={repsPlaceholder}
              className="input-field text-center text-lg font-dm font-medium"
            />
          </div>
          {showRpe && (
            <div className="flex-1">
              <label className="text-text-muted text-xs font-dm uppercase tracking-wider block mb-1">
                RPE
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={rpe}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  if (!e.target.value || (v >= 1 && v <= 10)) setRpe(e.target.value);
                }}
                placeholder="1–10"
                min={1}
                max={10}
                className="input-field text-center text-lg font-dm font-medium"
              />
            </div>
          )}
        </div>

        <div className="flex gap-2 items-center">
          <button
            onClick={() => setShowRpe((v) => !v)}
            className="text-text-muted text-xs flex items-center gap-1 py-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d={showRpe ? 'M20 12H4' : 'M12 4v16M4 12h16'}
              />
            </svg>
            {showRpe ? 'Hide RPE' : 'Add RPE'}
          </button>
          <div className="flex-1" />
          <button
            onClick={handleAddSet}
            disabled={isAdding || (!reps && !weight)}
            className="btn-primary py-2.5 px-5 text-base disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isAdding ? (
              <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16M4 12h16" />
                </svg>
                Add Set
              </>
            )}
          </button>
        </div>
      </div>

      {/* Done button */}
      {sets.length > 0 && (
        <button
          onClick={onDone}
          className="w-full btn-secondary border-amber-500/20 text-amber-400"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Done with this exercise
        </button>
      )}
    </div>
  );
}
