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

// ─── Running Workout Generation ────────────────────────────────────────────

const RUNNING_SYSTEM_PROMPT = `You are an expert running coach. Generate a structured running workout based on the user's inputs. Respond ONLY with valid JSON in this exact format:
{
  "workout_name": "Tempo Tuesday",
  "total_duration_minutes": 45,
  "description": "A classic tempo run to build lactate threshold",
  "steps": [
    {
      "order": 1,
      "type": "warmup",
      "name": "Easy Warmup",
      "duration_minutes": 10,
      "intensity": "easy",
      "pace_description": "Conversational pace, very comfortable",
      "heart_rate_zone": 1,
      "notes": "Keep it very easy, loosen up your legs"
    },
    {
      "order": 2,
      "type": "active",
      "name": "Tempo Effort",
      "duration_minutes": 25,
      "intensity": "threshold",
      "pace_description": "Comfortably hard, can speak only a few words",
      "heart_rate_zone": 4,
      "notes": "Maintain steady effort throughout"
    },
    {
      "order": 3,
      "type": "cooldown",
      "name": "Easy Cooldown",
      "duration_minutes": 10,
      "intensity": "easy",
      "pace_description": "Very easy jog or walk",
      "heart_rate_zone": 1,
      "notes": "Let your heart rate come down gradually"
    }
  ],
  "coaching_tips": "Focus on maintaining consistent effort rather than pace during the tempo portion."
}
Step types must be "warmup", "active", or "cooldown". Intensity must be "easy", "moderate", "threshold", or "hard". Heart rate zones 1-5. Always include a warmup and cooldown.`;

// POST /api/generate/running — generate a running workout via Claude
router.post('/running', async (req: AuthRequest, res: Response) => {
  try {
    const { goal_race, workout_type, fitness_level, target_duration, current_pace } = req.body;

    if (!goal_race || !workout_type || !fitness_level || !target_duration) {
      return res.status(400).json({ error: 'goal_race, workout_type, fitness_level, and target_duration are required' });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const userPrompt = `Generate a running workout with these parameters:
- Goal Race: ${goal_race}
- Workout Type: ${workout_type}
- Fitness Level: ${fitness_level}
- Target Duration: ${target_duration}
${current_pace ? `- Current Pace: ${current_pace}` : ''}

Create a well-structured running workout with appropriate warmup, main effort, and cooldown phases.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: RUNNING_SYSTEM_PROMPT,
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
    console.error('Generate running workout error:', error);
    return res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Failed to generate running workout' });
  }
});

// GET /api/generate/running/saved — list saved running workouts
router.get('/running/saved', (req: AuthRequest, res: Response) => {
  try {
    const rows = query<{ id: number; name: string; created_at: string; workout_data: string }>(
      'SELECT * FROM saved_running_workouts WHERE user_id = ? ORDER BY created_at DESC',
      [req.userId!]
    );
    return res.json(
      rows.map((r) => ({ ...r, workout_data: JSON.parse(r.workout_data) }))
    );
  } catch (error) {
    console.error('Get saved running workouts error:', error);
    return res.status(500).json({ error: 'Failed to get saved running workouts' });
  }
});

// POST /api/generate/running/saved — save a running workout
router.post('/running/saved', (req: AuthRequest, res: Response) => {
  try {
    const { name, workout_data } = req.body;
    if (!name || !workout_data) {
      return res.status(400).json({ error: 'name and workout_data are required' });
    }
    const { lastId } = run(
      "INSERT INTO saved_running_workouts (user_id, name, workout_data, created_at) VALUES (?, ?, ?, datetime('now'))",
      [req.userId!, name, JSON.stringify(workout_data)]
    );
    return res.json({ id: lastId });
  } catch (error) {
    console.error('Save running workout error:', error);
    return res.status(500).json({ error: 'Failed to save running workout' });
  }
});

// DELETE /api/generate/running/saved/:id — delete a saved running workout
router.delete('/running/saved/:id', (req: AuthRequest, res: Response) => {
  try {
    const { changes } = run('DELETE FROM saved_running_workouts WHERE id = ? AND user_id = ?', [req.params.id, req.userId!]);
    if (changes === 0) {
      return res.status(404).json({ error: 'Saved running workout not found' });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('Delete saved running workout error:', error);
    return res.status(500).json({ error: 'Failed to delete running workout' });
  }
});

export default router;
