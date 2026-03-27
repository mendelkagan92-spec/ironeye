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
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  if (findUserByEmail(email)) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const db = getDb();
  db.run('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email, passwordHash]);
  persist();

  const idResult = db.exec('SELECT last_insert_rowid() as id');
  const userId = idResult[0]?.values[0][0] as number;

  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
  return res.status(201).json({ token, user: { id: userId, email } });
});

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
  return res.json({ token, user: { id: user.id, email: user.email } });
});

export default router;
