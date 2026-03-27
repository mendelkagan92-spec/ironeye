import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb, persist } from '../db';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'ironeye-dev-secret';

function findUserByEmail(email: string): { id: number; email: string; password_hash: string } | null {
  const db = getDb();
  const stmt = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?');
  stmt.bind([email]);
  let user = null;
  if (stmt.step()) {
    user = stmt.getAsObject() as { id: number; email: string; password_hash: string };
  }
  stmt.free();
  return user;
}

// POST /api/auth/signup
router.post('/signup', async (req: Request, res: Response) => {
  try {
    console.log('[signup] Request body keys:', Object.keys(req.body || {}));
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('[signup] Missing email or password');
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    console.log('[signup] Checking if user exists:', email);
    const existing = findUserByEmail(email);
    if (existing) {
      console.log('[signup] User already exists');
      return res.status(409).json({ error: 'Email already registered' });
    }

    console.log('[signup] Hashing password...');
    const passwordHash = await bcrypt.hash(password, 10);
    console.log('[signup] Password hashed, length:', passwordHash.length);

    console.log('[signup] Inserting user into DB...');
    const db = getDb();

    // Verify table exists before insert
    const tableCheck = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
    console.log('[signup] Users table exists:', tableCheck.length > 0 && tableCheck[0].values.length > 0);

    const stmt = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)');
    stmt.run([email, passwordHash]);
    stmt.free();
    persist();
    console.log('[signup] User inserted and persisted');

    const idResult = db.exec('SELECT last_insert_rowid() as id');
    const userId = idResult[0]?.values[0][0] as number;
    console.log('[signup] New user ID:', userId);

    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
    console.log('[signup] JWT created, responding with success');
    return res.status(201).json({ token, user: { id: userId, email } });
  } catch (error) {
    console.error('[signup] ERROR:', error);
    if (error instanceof Error) {
      console.error('[signup] Error message:', error.message);
      console.error('[signup] Error stack:', error.stack);
    }
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Signup failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    console.log('[login] Attempt for:', req.body?.email);
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = findUserByEmail(email);
    if (!user) {
      console.log('[login] User not found:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      console.log('[login] Invalid password for:', email);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    console.log('[login] Success for user:', user.id);
    return res.json({ token, user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error('[login] ERROR:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Login failed' });
  }
});

export default router;
