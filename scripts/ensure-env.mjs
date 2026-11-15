// Runs before `npm run dev`: creates .env from .env.example on a fresh clone,
// so the API server (which watches .env) can start and the app works offline
// until a GEMINI_API_KEY is added.
import { existsSync, copyFileSync } from 'node:fs';

if (!existsSync('.env') && existsSync('.env.example')) {
  copyFileSync('.env.example', '.env');
  console.log('[setup] Created .env from .env.example — add your GEMINI_API_KEY there to enable AI features.');
}
