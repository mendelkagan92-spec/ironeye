import type { MachineInfo, Workout, GeneratedWorkout, SavedWorkout, WorkoutGenerationParams, AuthResponse, RunningWorkout, SavedRunningWorkout, RunningGenerationParams } from './types';

const BASE = '/api';

const TOKEN_KEY = 'ironeye_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { headers, ...options });

  if (res.status === 401) {
    clearToken();
    localStorage.removeItem('ironeye_user');
    window.location.reload();
    throw new Error('Session expired. Please log in again.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// Auth
export async function signup(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
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

// Running Workout Generator
export async function generateRunningWorkout(params: RunningGenerationParams): Promise<RunningWorkout> {
  return request<RunningWorkout>('/generate/running', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export async function getSavedRunningWorkouts(): Promise<SavedRunningWorkout[]> {
  return request<SavedRunningWorkout[]>('/generate/running/saved');
}

export async function saveRunningWorkout(name: string, workout_data: RunningWorkout): Promise<{ id: number }> {
  return request<{ id: number }>('/generate/running/saved', {
    method: 'POST',
    body: JSON.stringify({ name, workout_data }),
  });
}

export async function deleteSavedRunningWorkout(id: number): Promise<void> {
  return request<void>(`/generate/running/saved/${id}`, { method: 'DELETE' });
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
