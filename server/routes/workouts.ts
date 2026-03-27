import { Router, Request, Response } from 'express';
import { getDb, persist } from '../db';

const router = Router();

// Helper: run a query and return rows as objects
function query<T = Record<string, unknown>>(sql: string, params: (string | number | null | undefined)[] = []): T[] {
  const db = getDb();
  // sql.js uses ? placeholders like better-sqlite3 but with exec for SELECT
  const stmt = db.prepare(sql);
  stmt.bind(params as any[]);
  const rows: T[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as T;
    rows.push(row);
  }
  stmt.free();
  return rows;
}

function run(sql: string, params: (string | number | null | undefined)[] = []): { lastId: number; changes: number } {
  const db = getDb();
  db.run(sql, params as any[]);
  const lastId = db.exec('SELECT last_insert_rowid() as id')[0]?.values[0][0] as number ?? 0;
  const changes = db.exec('SELECT changes() as n')[0]?.values[0][0] as number ?? 0;
  persist();
  return { lastId, changes };
}

// POST /api/workouts — start new workout
router.post('/', (req: Request, res: Response) => {
  try {
    const { notes } = req.body;
    const { lastId } = run(
      "INSERT INTO workouts (started_at, notes) VALUES (datetime('now'), ?)",
      [notes || null]
    );
    res.json({ workoutId: lastId });
  } catch (error) {
    console.error('Create workout error:', error);
    res.status(500).json({ error: 'Failed to create workout' });
  }
});

// GET /api/workouts — all workouts with exercises + sets
router.get('/', (req: Request, res: Response) => {
  try {
    const workouts = query<{
      id: number;
      started_at: string;
      ended_at: string | null;
      notes: string | null;
    }>('SELECT * FROM workouts ORDER BY started_at DESC');

    const result = workouts.map((workout) => {
      const exercises = query<{
        id: number;
        workout_id: number;
        machine_name: string;
        muscles: string | null;
        image_data: string | null;
        position: number;
      }>('SELECT * FROM exercises WHERE workout_id = ? ORDER BY position', [workout.id]);

      const exercisesWithSets = exercises.map((ex) => {
        const sets = query<{
          id: number;
          exercise_id: number;
          set_number: number;
          weight: number | null;
          weight_unit: string;
          reps: number | null;
          rpe: number | null;
          completed_at: string;
        }>('SELECT * FROM sets WHERE exercise_id = ? ORDER BY set_number', [ex.id]);

        return {
          ...ex,
          muscles: ex.muscles ? JSON.parse(ex.muscles) : [],
          sets,
        };
      });

      return {
        ...workout,
        exercise_count: exercises.length,
        set_count: exercisesWithSets.reduce((s, e) => s + e.sets.length, 0),
        exercises: exercisesWithSets,
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Get workouts error:', error);
    res.status(500).json({ error: 'Failed to get workouts' });
  }
});

// GET /api/workouts/:id — single workout
router.get('/:id', (req: Request, res: Response) => {
  try {
    const workouts = query<{
      id: number;
      started_at: string;
      ended_at: string | null;
      notes: string | null;
    }>('SELECT * FROM workouts WHERE id = ?', [req.params.id]);

    if (workouts.length === 0) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    const workout = workouts[0];
    const exercises = query<{
      id: number;
      workout_id: number;
      machine_name: string;
      muscles: string | null;
      image_data: string | null;
      position: number;
    }>('SELECT * FROM exercises WHERE workout_id = ? ORDER BY position', [workout.id]);

    const exercisesWithSets = exercises.map((ex) => {
      const sets = query('SELECT * FROM sets WHERE exercise_id = ? ORDER BY set_number', [ex.id]);
      return {
        ...ex,
        muscles: ex.muscles ? JSON.parse(ex.muscles) : [],
        sets,
      };
    });

    return res.json({ ...workout, exercises: exercisesWithSets });
  } catch (error) {
    console.error('Get workout error:', error);
    return res.status(500).json({ error: 'Failed to get workout' });
  }
});

// PATCH /api/workouts/:id/end — end a workout
router.patch('/:id/end', (req: Request, res: Response) => {
  try {
    const { changes } = run(
      "UPDATE workouts SET ended_at = datetime('now') WHERE id = ? AND ended_at IS NULL",
      [req.params.id]
    );

    if (changes === 0) {
      return res.status(404).json({ error: 'Workout not found or already ended' });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('End workout error:', error);
    return res.status(500).json({ error: 'Failed to end workout' });
  }
});

// POST /api/workouts/:workoutId/exercises — add exercise
router.post('/:workoutId/exercises', (req: Request, res: Response) => {
  try {
    const { machine_name, muscles, image_data, position } = req.body;

    if (!machine_name) {
      return res.status(400).json({ error: 'machine_name is required' });
    }

    const musclesJson = Array.isArray(muscles) ? JSON.stringify(muscles) : muscles || null;
    const { lastId } = run(
      'INSERT INTO exercises (workout_id, machine_name, muscles, image_data, position) VALUES (?, ?, ?, ?, ?)',
      [req.params.workoutId, machine_name, musclesJson, image_data || null, position || 0]
    );

    res.json({ exerciseId: lastId });
  } catch (error) {
    console.error('Add exercise error:', error);
    res.status(500).json({ error: 'Failed to add exercise' });
  }
});

// POST /api/workouts/exercises/:exerciseId/sets — log a set
router.post('/exercises/:exerciseId/sets', (req: Request, res: Response) => {
  try {
    const { set_number, weight, weight_unit, reps, rpe } = req.body;

    const { lastId } = run(
      "INSERT INTO sets (exercise_id, set_number, weight, weight_unit, reps, rpe, completed_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))",
      [
        req.params.exerciseId,
        set_number || 1,
        weight ?? null,
        weight_unit || 'kg',
        reps ?? null,
        rpe ?? null,
      ]
    );

    res.json({ setId: lastId });
  } catch (error) {
    console.error('Add set error:', error);
    res.status(500).json({ error: 'Failed to add set' });
  }
});

export default router;
