import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'ironeye.db');

let db: Database;

export async function initDb(): Promise<Database> {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  console.log('Creating tables...');

  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Verify users table exists
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
  console.log('Users table check:', tables.length > 0 && tables[0].values.length > 0 ? 'EXISTS' : 'MISSING');

  db.run(`CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    notes TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id INTEGER REFERENCES workouts(id),
    machine_name TEXT NOT NULL,
    muscles TEXT,
    image_data TEXT,
    position INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise_id INTEGER REFERENCES exercises(id),
    set_number INTEGER,
    weight REAL,
    weight_unit TEXT DEFAULT 'kg',
    reps INTEGER,
    rpe INTEGER,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS saved_workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER REFERENCES users(id),
    name TEXT NOT NULL,
    workout_data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Migrations: add user_id to tables that may exist without it
  try { db.run('ALTER TABLE workouts ADD COLUMN user_id INTEGER REFERENCES users(id)'); } catch { /* already exists */ }
  try { db.run('ALTER TABLE saved_workouts ADD COLUMN user_id INTEGER REFERENCES users(id)'); } catch { /* already exists */ }

  // Log all tables
  const allTables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
  console.log('All tables:', allTables.length > 0 ? allTables[0].values.map(r => r[0]).join(', ') : 'NONE');

  persist();
  return db;
}

export function persist() {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

export default { getDb, initDb, persist };
