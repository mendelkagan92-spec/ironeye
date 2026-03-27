import { useState, useCallback, useEffect } from 'react';
import * as api from '../api';
import type { ActiveExercise, MachineInfo, PendingSet, WeightUnit } from '../types';

const STORAGE_KEY = 'ironeye_active_workout';

interface ActiveWorkoutState {
  workoutId: number;
  startedAt: string;
  exercises: ActiveExercise[];
}

export function useWorkout() {
  const [activeWorkout, setActiveWorkout] = useState<ActiveWorkoutState | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [weightUnit, setWeightUnit] = useState<WeightUnit>(() => {
    return (localStorage.getItem('ironeye_weight_unit') as WeightUnit) || 'kg';
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persist active workout to localStorage
  useEffect(() => {
    if (activeWorkout) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activeWorkout));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [activeWorkout]);

  // Persist weight unit preference
  useEffect(() => {
    localStorage.setItem('ironeye_weight_unit', weightUnit);
  }, [weightUnit]);

  const startWorkout = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { workoutId } = await api.startWorkout();
      setActiveWorkout({
        workoutId,
        startedAt: new Date().toISOString(),
        exercises: [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start workout');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const endWorkout = useCallback(async () => {
    if (!activeWorkout) return;
    setIsLoading(true);
    setError(null);
    try {
      await api.endWorkout(activeWorkout.workoutId);
      setActiveWorkout(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to end workout');
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkout]);

  const addExercise = useCallback(
    async (machineInfo: MachineInfo, imageData?: string): Promise<number | null> => {
      if (!activeWorkout) return null;
      setError(null);
      try {
        const position = activeWorkout.exercises.length;
        const { exerciseId } = await api.addExercise(activeWorkout.workoutId, {
          machine_name: machineInfo.machine_name,
          muscles: machineInfo.muscles,
          image_data: imageData,
          position,
        });

        const newExercise: ActiveExercise = {
          exerciseId,
          machineInfo,
          imageData,
          sets: [],
        };

        setActiveWorkout((prev) =>
          prev
            ? {
                ...prev,
                exercises: [...prev.exercises, newExercise],
              }
            : prev
        );

        return exerciseId;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add exercise');
        return null;
      }
    },
    [activeWorkout]
  );

  const addSet = useCallback(
    async (exerciseId: number, set: Omit<PendingSet, 'set_number'>): Promise<void> => {
      if (!activeWorkout) return;
      setError(null);
      try {
        const exercise = activeWorkout.exercises.find((e) => e.exerciseId === exerciseId);
        const setNumber = (exercise?.sets.length || 0) + 1;

        const pendingSet: PendingSet = { ...set, set_number: setNumber };

        await api.addSet(exerciseId, {
          ...pendingSet,
          set_number: setNumber,
        });

        setActiveWorkout((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            exercises: prev.exercises.map((e) =>
              e.exerciseId === exerciseId ? { ...e, sets: [...e.sets, pendingSet] } : e
            ),
          };
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add set');
      }
    },
    [activeWorkout]
  );

  const toggleWeightUnit = useCallback(() => {
    setWeightUnit((prev) => (prev === 'kg' ? 'lbs' : 'kg'));
  }, []);

  return {
    activeWorkout,
    weightUnit,
    isLoading,
    error,
    startWorkout,
    endWorkout,
    addExercise,
    addSet,
    toggleWeightUnit,
  };
}
