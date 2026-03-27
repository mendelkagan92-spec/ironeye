import type { MachineInfo, Workout, GeneratedWorkout, SavedWorkout, WorkoutGenerationParams } from './types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// Identify gym equipment
export async function identifyMachine(payload: {
  image?: string;
  machineName?: string;
}): Promise<MachineInfo> {
  return request<MachineInfo>('/identify', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// Workout CRUD
export async function startWorkout(notes?: string): Promise<{ workoutId: number }> {
  return request<{ workoutId: number }>('/workouts', {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}

export async function endWorkout(id: number): Promise<void> {
  return request<void>(`/workouts/${id}/end`, { method: 'PATCH' });
}

export async function getWorkouts(): Promise<Workout[]> {
  return request<Workout[]>('/workouts');
}

export async function getWorkout(id: number): Promise<Workout> {
  return request<Workout>(`/workouts/${id}`);
}

// Exercise
export async function addExercise(
  workoutId: number,
  payload: {
    machine_name: string;
    muscles?: string[];
    image_data?: string;
    position?: number;
  }
): Promise<{ exerciseId: number }> {
  return request<{ exerciseId: number }>(`/workouts/${workoutId}/exercises`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// AI Workout Generator
export async function generateWorkout(params: WorkoutGenerationParams): Promise<GeneratedWorkout> {
  return request<GeneratedWorkout>('/generate', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function getSavedWorkouts(): Promise<SavedWorkout[]> {
  return request<SavedWorkout[]>('/generate/saved');
}

export async function saveWorkout(name: string, workout_data: GeneratedWorkout): Promise<{ id: number }> {
  return request<{ id: number }>('/generate/saved', {
    method: 'POST',
    body: JSON.stringify({ name, workout_data }),
  });
}

export async function deleteSavedWorkout(id: number): Promise<void> {
  return request<void>(`/generate/saved/${id}`, { method: 'DELETE' });
}

// Set
export async function addSet(
  exerciseId: number,
  payload: {
    set_number?: number;
    weight?: number | null;
    weight_unit?: string;
    reps?: number | null;
    rpe?: number | null;
  }
): Promise<{ setId: number }> {
  return request<{ setId: number }>(`/workouts/exercises/${exerciseId}/sets`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
