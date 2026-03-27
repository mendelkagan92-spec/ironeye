import { Router, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { getDb, persist } from '../db';
import { AuthRequest } from '../middleware/auth';

const router = Router();

function query<T = Record<string, unknown>>(
  sql: string,
  params: (string | number | null | undefined)[] = []
): T[] {
  const db = getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params as any[]);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

function run(
  sql: string,
  params: (string | number | null | undefined)[] = []
): { lastId: number; changes: number } {
  const db = getDb();
  db.run(sql, params as any[]);
  const lastId =
    (db.exec('SELECT last_insert_rowid() as id')[0]?.values[0][0] as number) ?? 0;
  const changes =
    (db.exec('SELECT changes() as n')[0]?.values[0][0] as number) ?? 0;
  persist();
  return { lastId, changes };
}

const SYSTEM_PROMPT = `You are an expert personal trainer. Generate a complete workout plan based on the user's inputs. Respond ONLY with valid JSON in this exact format:
{
  "workout_name": "Power Upper Body",
  "estimated_duration": "45 min",
  "exercises": [
    {
      "name": "Bench Press",
      "muscles": ["Chest", "Triceps", "Front Delts"],
      "sets": 4,
      "reps": "8-10",
      "rest_seconds": 90,
      "instructions": "Keep your back flat on the bench, lower the bar to your chest with control"
    }
  ],
  "notes": "Optional overall workout tip"
}
Include 4-8 exercises appropriate for the duration and experience level. Use exact equipment specified.`;

// POST /api/generate — generate a workout plan via Claude
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { goal, experience, equipment, duration, focus } = req.body;

    if (!goal || !experience || !equipment || !duration || !focus) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const userPrompt = `Generate a workout with these parameters:
- Goal: ${goal}
- Experience Level: ${experience}
- Available Equipment: ${Array.isArray(equipment) ? equipment.join(', ') : equipment}
- Workout Duration: ${duration}
- Muscle Focus: ${focus}

Create a complete, well-balanced workout appropriate for the experience level and available equipment.`;

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textContent = response.content.find((b) => b.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return res.status(500).json({ error: 'No response from AI' });
    }

    const jsonMatch = textContent.text.trim().match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Invalid JSON response from AI' });
    }

    return res.json(JSON.parse(jsonMatch[0]));
  } catch (error) {
    console.error('Generate workout error:', error);
    return res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Failed to generate workout' });
  }
});

// GET /api/generate/saved — list saved workouts for this user
router.get('/saved', (req: AuthRequest, res: Response) => {
  try {
    const rows = query<{ id: number; name: string; created_at: string; workout_data: string }>(
      'SELECT * FROM saved_workouts WHERE user_id = ? ORDER BY created_at DESC',
      [req.userId!]
    );
    return res.json(
      rows.map((r) => ({ ...r, workout_data: JSON.parse(r.workout_data) }))
    );
  } catch (error) {
    console.error('Get saved workouts error:', error);
    return res.status(500).json({ error: 'Failed to get saved workouts' });
  }
});

// POST /api/generate/saved — save a generated workout for this user
router.post('/saved', (req: AuthRequest, res: Response) => {
  try {
    const { name, workout_data } = req.body;
    if (!name || !workout_data) {
      return res.status(400).json({ error: 'name and workout_data are required' });
    }
    const { lastId } = run(
      "INSERT INTO saved_workouts (user_id, name, workout_data, created_at) VALUES (?, ?, ?, datetime('now'))",
      [req.userId!, name, JSON.stringify(workout_data)]
    );
    return res.json({ id: lastId });
  } catch (error) {
    console.error('Save workout error:', error);
    return res.status(500).json({ error: 'Failed to save workout' });
  }
});

// DELETE /api/generate/saved/:id — delete a saved workout (must belong to user)
router.delete('/saved/:id', (req: AuthRequest, res: Response) => {
  try {
    const { changes } = run('DELETE FROM saved_workouts WHERE id = ? AND user_id = ?', [req.params.id, req.userId!]);
    if (changes === 0) {
      return res.status(404).json({ error: 'Saved workout not found' });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('Delete saved workout error:', error);
    return res.status(500).json({ error: 'Failed to delete workout' });
  }
});

export default router;
