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

function SetRow({ set, index, weightUnit }: { set: PendingSet; index: number; weightUnit: WeightUnit }) {
  return (
    <div className="flex items-center gap-3 py-3 animate-slide-up"
      style={{ borderBottom: '1px solid #2a2a2a' }}>
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: 'rgba(252,76,2,0.1)' }}>
        <span className="font-barlow font-bold text-sm" style={{ color: '#fc4c02' }}>{index + 1}</span>
      </div>
      <div className="flex-1 flex items-center gap-3">
        {set.weight !== null && (
          <span className="text-white font-inter font-medium">
            {set.weight}
            <span className="text-text-muted text-xs ml-0.5">{weightUnit}</span>
          </span>
        )}
        {set.reps !== null && (
          <>
            <span className="text-text-muted">×</span>
            <span className="text-white font-inter font-medium">
              {set.reps}
              <span className="text-text-muted text-xs ml-0.5">reps</span>
            </span>
          </>
        )}
      </div>
      {set.rpe !== null && <span className="tag">RPE {set.rpe}</span>}
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"
        style={{ color: '#00d4aa' }}>
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
      setReps('');
      setRpe('');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-barlow text-lg font-semibold text-white">Log Sets</h3>
        <button
          onClick={onToggleUnit}
          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-inter"
          style={{ background: '#242424' }}
        >
          <span style={{ color: weightUnit === 'kg' ? '#fc4c02' : '#4a4a4a' }} className="font-medium">kg</span>
          <span className="text-text-muted mx-1">|</span>
          <span style={{ color: weightUnit === 'lbs' ? '#fc4c02' : '#4a4a4a' }} className="font-medium">lbs</span>
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

      {/* Input row — underline style */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="label block mb-1">Weight ({weightUnit})</label>
            <input
              type="number"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="0"
              className="w-full bg-transparent text-white font-inter font-medium text-lg text-center py-2 outline-none transition-colors duration-150"
              style={{ borderBottom: '2px solid #2a2a2a' }}
              onFocus={(e) => e.target.style.borderBottomColor = '#fc4c02'}
              onBlur={(e) => e.target.style.borderBottomColor = '#2a2a2a'}
            />
          </div>
          <div className="flex-1">
            <label className="label block mb-1">Reps</label>
            <input
              type="number"
              inputMode="numeric"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              placeholder={repsPlaceholder}
              className="w-full bg-transparent text-white font-inter font-medium text-lg text-center py-2 outline-none transition-colors duration-150"
              style={{ borderBottom: '2px solid #2a2a2a' }}
              onFocus={(e) => e.target.style.borderBottomColor = '#fc4c02'}
              onBlur={(e) => e.target.style.borderBottomColor = '#2a2a2a'}
            />
          </div>
          {showRpe && (
            <div className="flex-1">
              <label className="label block mb-1">RPE</label>
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
                className="w-full bg-transparent text-white font-inter font-medium text-lg text-center py-2 outline-none transition-colors duration-150"
                style={{ borderBottom: '2px solid #2a2a2a' }}
                onFocus={(e) => e.target.style.borderBottomColor = '#fc4c02'}
                onBlur={(e) => e.target.style.borderBottomColor = '#2a2a2a'}
              />
            </div>
          )}
        </div>

        <div className="flex gap-2 items-center">
          <button
            onClick={() => setShowRpe((v) => !v)}
            className="text-text-muted text-xs font-inter flex items-center gap-1 py-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d={showRpe ? 'M20 12H4' : 'M12 4v16M4 12h16'} />
            </svg>
            {showRpe ? 'Hide RPE' : 'Add RPE'}
          </button>
          <div className="flex-1" />
          <button
            onClick={handleAddSet}
            disabled={isAdding || (!reps && !weight)}
            className="btn-primary px-5 disabled:opacity-40"
            style={{ height: 44 }}
          >
            {isAdding ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : 'Add Set'}
          </button>
        </div>
      </div>

      {/* Done button */}
      {sets.length > 0 && (
        <button onClick={onDone} className="btn-secondary w-full">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#00d4aa' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Done With Exercise
        </button>
      )}
    </div>
  );
}
