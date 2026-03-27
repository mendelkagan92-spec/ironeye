import React, { useState, useEffect } from 'react';
import Camera from '../components/Camera';
import MachineResult from '../components/MachineResult';
import SetLogger from '../components/SetLogger';
import WorkoutSession from '../components/WorkoutSession';
import { useWorkout } from '../hooks/useWorkout';
import { identifyMachine } from '../api';
import type { MachineInfo, GeneratedWorkout, GeneratedExercise } from '../types';

type WorkoutStep =
  | 'idle'
  | 'camera'
  | 'identifying'
  | 'logging'
  | 'generated_preview'
  | 'generated_queue';

interface WorkoutPageProps {
  generatedWorkout?: GeneratedWorkout | null;
  onClearGenerated?: () => void;
}

function genExToMachineInfo(ex: GeneratedExercise): MachineInfo {
  const parts = ex.reps.split('-');
  const repsMin = parseInt(parts[0]) || 8;
  const repsMax = parseInt(parts[1] || parts[0]) || repsMin;
  return {
    machine_name: ex.name,
    muscles: ex.muscles,
    form_tips: [ex.instructions],
    suggested_sets: ex.sets,
    suggested_reps_min: repsMin,
    suggested_reps_max: repsMax,
    difficulty: 'intermediate',
  };
}

export default function WorkoutPage({ generatedWorkout, onClearGenerated }: WorkoutPageProps) {
  const {
    activeWorkout, weightUnit, isLoading: workoutLoading, error: workoutError,
    startWorkout, endWorkout, addExercise, addSet, toggleWeightUnit,
  } = useWorkout();

  const [step, setStep] = useState<WorkoutStep>(() => {
    if (activeWorkout) return 'camera';
    if (generatedWorkout) return 'generated_preview';
    return 'idle';
  });

  const [identifiedMachine, setIdentifiedMachine] = useState<MachineInfo | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | undefined>();
  const [currentExerciseId, setCurrentExerciseId] = useState<number | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState('');
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [genQueue, setGenQueue] = useState<GeneratedExercise[]>([]);
  const [completedGenExercises, setCompletedGenExercises] = useState<string[]>([]);

  useEffect(() => {
    if (generatedWorkout && !activeWorkout) setStep('generated_preview');
  }, [generatedWorkout, activeWorkout]);

  const currentExercise = activeWorkout?.exercises.find((e) => e.exerciseId === currentExerciseId);

  const handleStartWorkout = async () => { await startWorkout(); setStep('camera'); };

  const handleStartGeneratedWorkout = async () => {
    if (!generatedWorkout) return;
    await startWorkout();
    setGenQueue([...generatedWorkout.exercises]);
    setCompletedGenExercises([]);
    setStep('generated_queue');
  };

  const handleLoadGenExercise = async (ex: GeneratedExercise) => {
    const machineInfo = genExToMachineInfo(ex);
    setIdentifiedMachine(machineInfo);
    setCapturedImage(undefined);
    setAiError(null);
    const exId = await addExercise(machineInfo);
    setCurrentExerciseId(exId);
    setStep('logging');
  };

  const handleCapture = async (imageData: string) => {
    setCapturedImage(imageData);
    setStep('identifying');
    setIsIdentifying(true);
    setAiError(null);
    setShowManual(false);
    try {
      const result = await identifyMachine({ image: imageData });
      setIdentifiedMachine(result);
      if (!result.error && activeWorkout) {
        const exId = await addExercise(result, imageData);
        setCurrentExerciseId(exId);
      }
      setStep('logging');
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to identify');
      setStep('logging');
    } finally {
      setIsIdentifying(false);
    }
  };

  const handleManualEntry = async () => {
    if (!manualName.trim()) return;
    setStep('identifying');
    setIsIdentifying(true);
    setAiError(null);
    try {
      const result = await identifyMachine({ machineName: manualName.trim() });
      setIdentifiedMachine(result);
      if (!result.error && activeWorkout) {
        const exId = await addExercise(result);
        setCurrentExerciseId(exId);
      }
      setStep('logging');
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Failed to get info');
      setStep('logging');
    } finally {
      setIsIdentifying(false);
      setManualName('');
      setShowManual(false);
    }
  };

  const handleAddSet = async (set: { weight: number | null; weight_unit: string; reps: number | null; rpe: number | null }) => {
    if (!currentExerciseId) return;
    await addSet(currentExerciseId, { ...set, weight_unit: weightUnit });
  };

  const handleDoneWithExercise = () => {
    if (identifiedMachine && genQueue.length > 0) {
      const doneName = identifiedMachine.machine_name;
      setCompletedGenExercises((prev) => [...prev, doneName]);
      setGenQueue((prev) => prev.filter((ex) => ex.name !== doneName));
    }
    setIdentifiedMachine(null);
    setCapturedImage(undefined);
    setCurrentExerciseId(null);
    if (genQueue.length > 0 || completedGenExercises.length > 0) {
      setStep('generated_queue');
    } else {
      setStep('camera');
    }
  };

  const handleEndWorkout = async () => {
    await endWorkout();
    setStep('idle');
    setIdentifiedMachine(null);
    setCapturedImage(undefined);
    setCurrentExerciseId(null);
    setGenQueue([]);
    setCompletedGenExercises([]);
    onClearGenerated?.();
  };

  // ── IDLE ──
  if (step === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center min-h-full gap-8 text-center">
        <div className="space-y-4">
          <h1 className="font-barlow font-extrabold text-white tracking-tight" style={{ fontSize: 48 }}>
            IronEye
          </h1>
          <p className="text-text-secondary font-inter text-sm">AI-powered gym equipment tracker</p>
        </div>

        <div className="w-full max-w-xs space-y-4">
          <button className="btn-primary w-full" onClick={handleStartWorkout} disabled={workoutLoading}>
            {workoutLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : 'Start Workout'}
          </button>

          {workoutError && <p className="text-red-500 text-sm font-inter">{workoutError}</p>}

          <div className="flex items-center gap-4 text-text-muted text-xs font-inter">
            <div className="flex-1 h-px" style={{ background: '#2a2a2a' }} />
            <span>Features</span>
            <div className="flex-1 h-px" style={{ background: '#2a2a2a' }} />
          </div>

          <div className="grid grid-cols-2 gap-3 text-left">
            {[
              { label: 'Scan any gym machine' },
              { label: 'AI identification' },
              { label: 'Track sets & reps' },
              { label: 'AI workout plans' },
            ].map((f) => (
              <div key={f.label} className="card flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#fc4c02' }} />
                <span className="text-text-secondary text-xs font-inter">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── GENERATED PREVIEW ──
  if (step === 'generated_preview' && generatedWorkout) {
    return (
      <div className="space-y-4">
        <div className="card space-y-2" style={{ borderLeftWidth: 3, borderLeftColor: '#fc4c02' }}>
          <p className="label" style={{ color: '#fc4c02' }}>AI Generated Workout</p>
          <h2 className="font-barlow text-2xl font-bold text-white">{generatedWorkout.workout_name}</h2>
          <div className="flex gap-3 text-sm text-text-muted font-inter">
            <span>{generatedWorkout.estimated_duration}</span>
            <span>· {generatedWorkout.exercises.length} exercises</span>
          </div>
        </div>

        <div className="space-y-2">
          {generatedWorkout.exercises.map((ex, i) => (
            <div key={i} className="card flex items-center gap-3">
              <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(252,76,2,0.1)' }}>
                <span className="font-barlow font-bold text-xs" style={{ color: '#fc4c02' }}>{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-inter font-medium text-white text-sm truncate">{ex.name}</p>
                <p className="text-text-muted text-xs font-inter">{ex.sets} sets × {ex.reps} reps</p>
              </div>
              <span className="text-text-muted text-xs font-inter flex-shrink-0">{ex.muscles[0]}</span>
            </div>
          ))}
        </div>

        <div className="space-y-3 pt-2">
          <button className="btn-primary w-full" onClick={handleStartGeneratedWorkout} disabled={workoutLoading}>
            {workoutLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : 'Begin Workout'}
          </button>
          <button className="btn-ghost w-full" onClick={() => { onClearGenerated?.(); setStep('idle'); }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── ACTIVE WORKOUT ──
  return (
    <div className="flex flex-col gap-4">
      {activeWorkout && (
        <WorkoutSession startedAt={activeWorkout.startedAt} exercises={activeWorkout.exercises}
          onEnd={handleEndWorkout} isEnding={workoutLoading} />
      )}

      {step === 'generated_queue' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-barlow text-xl font-bold text-white">Exercise Queue</h2>
            <button className="btn-ghost text-sm" style={{ height: 36 }} onClick={() => setStep('camera')}>
              + Add extra
            </button>
          </div>

          {genQueue.length === 0 ? (
            <div className="card text-center py-6 space-y-2" style={{ borderColor: 'rgba(0,212,170,0.2)' }}>
              <p className="font-barlow font-bold text-white">All exercises done!</p>
              <p className="text-text-muted text-sm font-inter">Tap "End" when you're finished.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {genQueue.map((ex, i) => (
                <div key={ex.name} className="card flex items-center gap-3">
                  <div className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(252,76,2,0.1)' }}>
                    <span className="font-barlow font-bold text-xs" style={{ color: '#fc4c02' }}>
                      {completedGenExercises.length + i + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-inter font-medium text-white text-sm">{ex.name}</p>
                    <p className="text-text-muted text-xs font-inter">{ex.sets} sets × {ex.reps} reps</p>
                  </div>
                  {i === 0 ? (
                    <button className="btn-primary text-sm flex-shrink-0" style={{ height: 36, padding: '0 16px' }}
                      onClick={() => handleLoadGenExercise(ex)}>
                      Log It
                    </button>
                  ) : (
                    <span className="text-text-muted text-xs font-inter flex-shrink-0">Up next</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {completedGenExercises.length > 0 && (
            <div className="space-y-1">
              <p className="label">Completed</p>
              {completedGenExercises.map((name) => (
                <div key={name} className="flex items-center gap-2 py-1.5 px-3 rounded-lg" style={{ background: '#1a1a1a' }}>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    style={{ color: '#00d4aa' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-text-secondary text-sm font-inter line-through">{name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 'camera' && (
        <div className="space-y-4">
          {!showManual ? (
            <>
              <h2 className="font-barlow text-xl font-bold text-white">Scan Equipment</h2>
              <Camera onCapture={handleCapture} onManualEntry={() => setShowManual(true)} />
            </>
          ) : (
            <div className="card space-y-4 animate-slide-up">
              <div className="flex items-center justify-between">
                <h2 className="font-barlow text-xl font-bold text-white">Manual Entry</h2>
                <button className="btn-ghost text-sm" style={{ height: 36 }} onClick={() => setShowManual(false)}>
                  Camera
                </button>
              </div>
              <div className="space-y-3">
                <input
                  type="text" value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualEntry()}
                  placeholder="e.g. Lat Pulldown Machine"
                  className="input-field" autoFocus
                />
                <button className="btn-primary w-full" onClick={handleManualEntry}
                  disabled={!manualName.trim() || isIdentifying}>
                  Look Up Equipment
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {(step === 'identifying' || step === 'logging') && (
        <div className="space-y-4">
          {step === 'logging' && (
            <button className="btn-ghost text-sm justify-start px-0" style={{ background: 'transparent', height: 'auto' }}
              onClick={handleDoneWithExercise}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {genQueue.length > 0 ? 'Back to queue' : 'Scan another machine'}
            </button>
          )}

          <MachineResult machine={identifiedMachine} isLoading={isIdentifying} imagePreview={capturedImage} />

          {aiError && !isIdentifying && (
            <div className="card" style={{ borderColor: 'rgba(239,68,68,0.2)' }}>
              <p className="text-red-500 text-sm font-inter">{aiError}</p>
            </div>
          )}

          {step === 'logging' && identifiedMachine && !identifiedMachine.error && currentExerciseId && (
            <SetLogger
              sets={currentExercise?.sets || []} weightUnit={weightUnit}
              onAddSet={handleAddSet} onToggleUnit={toggleWeightUnit}
              onDone={handleDoneWithExercise}
              suggestedSets={identifiedMachine.suggested_sets}
              suggestedRepsMin={identifiedMachine.suggested_reps_min}
              suggestedRepsMax={identifiedMachine.suggested_reps_max}
            />
          )}
        </div>
      )}
    </div>
  );
}
