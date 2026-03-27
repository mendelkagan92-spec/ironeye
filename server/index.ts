import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

import { initDb } from './db';
import { requireAuth } from './middleware/auth';
import authRouter from './routes/auth';
import identifyRouter from './routes/identify';
import workoutsRouter from './routes/workouts';
import generateRouter from './routes/generate';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Auth routes (public)
app.use('/api/auth', authRouter);

// Protected API routes
app.use('/api/identify', requireAuth, identifyRouter);
app.use('/api/workouts', requireAuth, workoutsRouter);
app.use('/api/generate', requireAuth, generateRouter);

// Global error handler — catches unhandled route errors and returns JSON, not HTML
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Serve built client in production
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Initialize DB then start server
initDb()
  .then(() => {
    // Verify critical modules loaded
    try {
      require('bcryptjs');
      console.log('[startup] bcryptjs: OK');
    } catch (e) {
      console.error('[startup] bcryptjs: MISSING', e);
    }
    try {
      require('jsonwebtoken');
      console.log('[startup] jsonwebtoken: OK');
    } catch (e) {
      console.error('[startup] jsonwebtoken: MISSING', e);
    }

    app.listen(PORT, () => {
      console.log(`IronEye server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });

export default app;
