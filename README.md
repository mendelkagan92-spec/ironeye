# IronEye

AI-powered gym equipment tracker. Point your camera at any gym machine and let Claude identify it, suggest workout parameters, and log your sets.

## Setup

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set your Anthropic API key:

```
ANTHROPIC_API_KEY=sk-ant-...
PORT=3001
```

### 3. Run in development

```bash
npm run dev
```

This starts:
- **Server** on http://localhost:3001
- **Client** on http://localhost:5173 (proxies /api to server)

### 4. Production build

```bash
npm run build   # builds client
npm start       # serves everything from port 3001
```

## Features

- **AI Machine Identification** — Point camera at gym equipment, Claude identifies it with form tips and suggested reps
- **Set Logging** — Track weight (kg/lbs), reps, and RPE per set
- **Workout Sessions** — Live timer, exercise list, end workout flow
- **History** — All past workouts with exercises and sets
- **Profile** — Total stats, top muscles trained, favorite equipment
- **Manual Entry** — Search by machine name if camera unavailable
- **Camera Fallback** — File upload if camera permission denied

## Tech Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite via sql.js (no native compilation needed)
- **AI**: Anthropic Claude API with vision + extended thinking
