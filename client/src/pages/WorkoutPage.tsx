import React, { useState, useEffect } from 'react';
import Camera from '../components/Camera';
import MachineResult from '../components/MachineResult';
import SetLogger from '../components/SetLogger';
import WorkoutSession from '../components/WorkoutSession';
import { useWorkout } from '../hooks/useWorkout';
import { identifyMachine } from '../api';
import type { MachineInfo, GeneratedWorkout, GeneratedExercise } from '../types';

type WorkoutStep =
  | 'idle'              // No active workout
  | 'camera'            // Camera / scan view
  | 'identifying'       // AI processing
  | 'logging'           // Set logger open
  | 'generated_preview' // Showing generated workout plan before starting
  | 'generated_queue';  // Working through generated exercise queue

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
    activeWorkout,
    weightUnit,
    isLoading: workoutLoading,
    error: workoutError,
    startWorkout,
    endWorkout,
    addExercise,
    addSet,
    toggleWeightUnit,
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

  // Generated workout queue state
  const [genQueue, setGenQueue] = useState<GeneratedExercise[]>([]);
  const [completedGenExercises, setCompletedGenExercises] = useState<string[]>([]);

  // When a new generated workout arrives, switch to preview
  useEffect(() => {
    if (generatedWorkout && !activeWorkout) {
      setStep('generated_preview');
    }
  }, [generatedWorkout, activeWorkout]);

  const currentExercise = activeWorkout?.exercises.find(
    (e) => e.exerciseId === currentExerciseId
  );

  const handleStartWorkout = async () => {
    await startWorkout();
    setStep('camera');
  };

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

  const handleAddSet = async (set: {
    weight: number | null;
    weight_unit: string;
    reps: number | null;
    rpe: number | null;
  }) => {
    if (!currentExerciseId) return;
    await addSet(currentExerciseId, { ...set, weight_unit: weightUnit });
  };

  const handleDoneWithExercise = () => {
    // If we were doing a generated exercise, mark it complete and go back to queue
    if (identifiedMachine && genQueue.length > 0) {
      const doneName = identifiedMachine.machine_name;
      setCompletedGenExercises((prev) => [...prev, doneName]);
      setGenQueue((prev) => prev.filter((ex) => ex.name !== doneName));
    }

    setIdentifiedMachine(null);
    setCapturedImage(undefined);
    setCurrentExerciseId(null);

    // If we came from a generated queue, return there
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

  // ── IDLE ─────────────────────────────────────────────────────────────
  if (step === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center min-h-full gap-8 px-6 text-center">
        <div className="space-y-3">
          <div className="w-24 h-24 mx-auto rounded-2xl bg-surface flex items-center justify-center border border-surface-3">
            <span className="font-barlow text-4xl font-black text-amber-500">IE</span>
          </div>
          <div>
            <h1 className="font-barlow text-5xl font-black text-text-primary tracking-tight">IronEye</h1>
            <p className="text-text-secondary font-dm mt-1">AI-powered gym equipment tracker</p>
          </div>
        </div>

        <div className="w-full max-w-xs space-y-4">
          <button
            className="btn-primary w-full text-xl py-4"
            onClick={handleStartWorkout}
            disabled={workoutLoading}
          >
            {workoutLoading ? (
              <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Start Workout
              </>
            )}
          </button>

          {workoutError && <p className="text-red-400 text-sm text-center">{workoutError}</p>}

          <div className="flex items-center gap-4 text-text-muted text-sm">
            <div className="flex-1 h-px bg-surface-3" />
            <span>Features</span>
            <div className="flex-1 h-px bg-surface-3" />
          </div>

          <div className="grid grid-cols-2 gap-3 text-left">
            {[
              { icon: '📷', text: 'Scan any gym machine' },
              { icon: '🤖', text: 'AI identification' },
              { icon: '📊', text: 'Track sets & reps' },
              { icon: '✨', text: 'AI workout plans' },
            ].map((f) => (
              <div key={f.text} className="bg-surface rounded-xl p-3 border border-surface-3 flex items-start gap-2">
                <span className="text-base">{f.icon}</span>
                <span className="text-text-secondary text-xs font-dm">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── GENERATED PREVIEW ─────────────────────────────────────────────────
  if (step === 'generated_preview' && generatedWorkout) {
    return (
      <div className="space-y-4">
        <div className="card border border-amber-500/30 bg-amber-500/5 space-y-2">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5z" clipRule="evenodd" />
            </svg>
            <span className="text-amber-500 font-barlow font-bold text-sm uppercase tracking-wider">AI Generated Workout</span>
          </div>
          <h2 className="font-barlow text-2xl font-black text-text-primary">{generatedWorkout.workout_name}</h2>
          <div className="flex gap-3 text-sm text-text-muted font-dm">
            <span>⏱ {generatedWorkout.estimated_duration}</span>
            <span>• {generatedWorkout.exercises.length} exercises</span>
          </div>
        </div>

        {/* Exercise preview list */}
        <div className="space-y-2">
          {generatedWorkout.exercises.map((ex, i) => (
            <div key={i} className="card border border-surface-3 flex items-center gap-3">
              <div className="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                <span className="font-barlow font-black text-amber-500 text-xs">{i + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-dm font-medium text-text-primary text-sm truncate">{ex.name}</p>
                <p className="text-text-muted text-xs">{ex.sets} sets × {ex.reps} reps</p>
              </div>
              <span className="text-text-muted text-xs font-dm flex-shrink-0">{ex.muscles[0]}</span>
            </div>
          ))}
        </div>

        <div className="space-y-3 pt-2">
          <button
            className="btn-primary w-full text-lg py-4"
            onClick={handleStartGeneratedWorkout}
            disabled={workoutLoading}
          >
            {workoutLoading ? (
              <div className="w-5 h-5 border-2 border-background border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Begin Workout
              </>
            )}
          </button>
          <button
            className="btn-ghost w-full py-2"
            onClick={() => { onClearGenerated?.(); setStep('idle'); }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── ACTIVE WORKOUT ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {activeWorkout && (
        <WorkoutSession
          startedAt={activeWorkout.startedAt}
          exercises={activeWorkout.exercises}
          onEnd={handleEndWorkout}
          isEnding={workoutLoading}
        />
      )}

      {/* Generated queue */}
      {step === 'generated_queue' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-barlow text-2xl font-bold text-text-primary">Exercise Queue</h2>
            <button className="btn-ghost py-1 px-2 text-sm" onClick={() => setStep('camera')}>
              + Add extra
            </button>
          </div>

          {genQueue.length === 0 ? (
            <div className="card border border-green-500/20 bg-green-500/5 text-center py-6 space-y-2">
              <div className="text-2xl">🏆</div>
              <p className="font-barlow font-bold text-text-primary">All exercises done!</p>
              <p className="text-text-muted text-sm font-dm">Tap "End" when you're finished.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {genQueue.map((ex, i) => (
                <div key={ex.name} className="card border border-surface-3">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <span className="font-barlow font-black text-amber-500 text-xs">
                        {completedGenExercises.length + i + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-dm font-medium text-text-primary text-sm">{ex.name}</p>
                      <p className="text-text-muted text-xs">{ex.sets} sets × {ex.reps} reps</p>
                    </div>
                    {i === 0 && (
                      <button
                        className="btn-primary py-1.5 px-3 text-sm flex-shrink-0"
                        onClick={() => handleLoadGenExercise(ex)}
                      >
                        Log It
                      </button>
                    )}
                    {i > 0 && (
                      <span className="text-text-muted text-xs font-dm flex-shrink-0">Up next</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {completedGenExercises.length > 0 && (
            <div className="space-y-1">
              <p className="text-text-muted text-xs font-dm uppercase tracking-wider">Completed</p>
              {completedGenExercises.map((name) => (
                <div key={name} className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-surface">
                  <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-text-secondary text-sm font-dm line-through">{name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Camera step */}
      {step === 'camera' && (
        <div className="space-y-4">
          {!showManual ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="font-barlow text-2xl font-bold text-text-primary">Scan Equipment</h2>
              </div>
              <Camera onCapture={handleCapture} onManualEntry={() => setShowManual(true)} />
            </>
          ) : (
            <div className="card space-y-4 animate-slide-up">
              <div className="flex items-center justify-between">
                <h2 className="font-barlow text-2xl font-bold text-text-primary">Manual Entry</h2>
                <button className="btn-ghost py-1 px-2 text-sm" onClick={() => setShowManual(false)}>
                  ← Camera
                </button>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualEntry()}
                  placeholder="e.g. Lat Pulldown Machine"
                  className="input-field text-lg"
                  autoFocus
                />
                <button
                  className="btn-primary w-full"
                  onClick={handleManualEntry}
                  disabled={!manualName.trim() || isIdentifying}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  Look Up Equipment
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Identifying / Logging */}
      {(step === 'identifying' || step === 'logging') && (
        <div className="space-y-4">
          {step === 'logging' && (
            <button className="btn-ghost text-sm px-0" onClick={handleDoneWithExercise}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {genQueue.length > 0 ? 'Back to queue' : 'Scan another machine'}
            </button>
          )}

          <MachineResult
            machine={identifiedMachine}
            isLoading={isIdentifying}
            imagePreview={capturedImage}
          />

          {aiError && !isIdentifying && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <p className="text-red-400 text-sm">{aiError}</p>
            </div>
          )}

          {step === 'logging' && identifiedMachine && !identifiedMachine.error && currentExerciseId && (
            <SetLogger
              sets={currentExercise?.sets || []}
              weightUnit={weightUnit}
              onAddSet={handleAddSet}
              onToggleUnit={toggleWeightUnit}
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
