export interface MachineInfo {
  machine_name: string;
  muscles: string[];
  form_tips: string[];
  suggested_sets: number;
  suggested_reps_min: number;
  suggested_reps_max: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  error?: string;
}

export interface WorkoutSet {
  id: number;
  exercise_id: number;
  set_number: number;
  weight: number | null;
  weight_unit: 'kg' | 'lbs';
  reps: number | null;
  rpe: number | null;
  completed_at: string;
}

export interface Exercise {
  id: number;
  workout_id: number;
  machine_name: string;
  muscles: string[];
  image_data: string | null;
  position: number;
  sets: WorkoutSet[];
}

export interface Workout {
  id: number;
  started_at: string;
  ended_at: string | null;
  notes: string | null;
  exercise_count?: number;
  set_count?: number;
  exercises: Exercise[];
}

export interface ActiveExercise {
  exerciseId: number;
  machineInfo: MachineInfo;
  imageData?: string;
  sets: PendingSet[];
}

export interface PendingSet {
  set_number: number;
  weight: number | null;
  weight_unit: 'kg' | 'lbs';
  reps: number | null;
  rpe: number | null;
}

export type WeightUnit = 'kg' | 'lbs';
export type TabName = 'workout' | 'generate' | 'running' | 'history' | 'profile';

// Running Workout types
export interface RunningStep {
  order: number;
  type: 'warmup' | 'active' | 'cooldown';
  name: string;
  duration_minutes: number;
  intensity: 'easy' | 'moderate' | 'threshold' | 'hard';
  pace_description: string;
  heart_rate_zone: number;
  notes: string;
}

export interface RunningWorkout {
  workout_name: string;
  total_duration_minutes: number;
  description: string;
  steps: RunningStep[];
  coaching_tips: string;
}

export interface SavedRunningWorkout {
  id: number;
  name: string;
  created_at: string;
  workout_data: RunningWorkout;
}

export interface RunningGenerationParams {
  goal_race: string;
  workout_type: string;
  fitness_level: string;
  target_duration: string;
  current_pace?: string;
}

// AI Workout Generator types
export interface GeneratedExercise {
  name: string;
  muscles: string[];
  sets: number;
  reps: string;
  rest_seconds: number;
  instructions: string;
}

export interface GeneratedWorkout {
  workout_name: string;
  estimated_duration: string;
  exercises: GeneratedExercise[];
  notes?: string;
}

export interface SavedWorkout {
  id: number;
  name: string;
  created_at: string;
  workout_data: GeneratedWorkout;
}

export interface WorkoutGenerationParams {
  goal: string;
  experience: string;
  equipment: string[];
  duration: string;
  focus: string;
}

export interface User {
  id: number;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
