# ACCESS AI — The System

**A gamified, AI-powered interview prep platform that punishes you for skipping practice.**

Most students don't fail placements because they aren't smart enough. They fail because they stop practicing in week 3. ACCESS AI is inspired by the "System" from *Solo Leveling*: tell it your goal, your languages and the interview rounds you're preparing for, and it gives you daily and weekly quests. Miss them, and you lose XP and levels and land in the **Penalty Zone**.

<!-- Add a screenshot or GIF here, e.g. ![ACCESS AI](docs/screenshot.png) -->

## Features

| | |
|---|---|
| 🎯 **Personal roadmap** | Onboarding asks for your goal, target companies and date, languages, interview rounds and intensity. Gemini writes a phased roadmap. |
| ⚔️ **Daily & weekly quests** | Generated from your profile and tracked automatically from what you actually do (problems solved, quizzes passed, interviews done). |
| ☠️ **Penalties** | At midnight, unfinished daily quests cost XP in proportion to what you left undone (you can drop levels), and your streak resets. You also enter a 24-hour **Penalty Zone**: XP gain is halved and the whole UI turns red. Fail it and you lose about a level and two stats. Missed weekly quests cost XP and stats too. |
| 📈 **Levels, ranks & stats** | XP and levels, ranks from E to S, and 5 stats with real effects. Titles, a streak heatmap and an activity log. |
| 💻 **Coding problems + IDE** | 27 classic interview problems (Two Sum → N-Queens) with hidden tests, in a Monaco editor. Python (Pyodide) and JavaScript run **in the browser**; C, C++ and Java run on the server. |
| 💡 **AI mentor** | Three levels of hints that never write the code for you, plus an interview-style code review with Big-O analysis. |
| 🧠 **Quizzes** | OS, DBMS, Computer Networks, OOP, Python, JavaScript, Java, C++, C and Aptitude. Use the built-in question bank or generate new questions with AI. |
| 🎙️ **Mock interviews** | DSA, Core CS, System Design, Language and HR rounds that stream live, then a score with strengths and improvements. |
| ✨ **AI-generated problems** | New problems on any topic. Their test answers are produced by running the AI's reference solution in a locked-down Node sandbox, so the tests are always consistent. |
| 🔌 **Works offline** | With no API key, a built-in engine provides plans, hints, quizzes and a scripted interviewer. |

## Quick start

**Requirements:** [Node.js](https://nodejs.org) **22.13 or newer**.

```bash
git clone https://github.com/<your-username>/access-ai.git
cd access-ai
npm install
npm run dev
```

Open **http://localhost:5173**. The first `npm run dev` creates a `.env` file for you. The app works right away on the offline engine.

### Enable the AI features (Google Gemini)

1. Get a free API key at **https://aistudio.google.com/apikey**.
2. Open `.env` and set:
   ```
   GEMINI_API_KEY=your-key-here
   ```
3. Save the file. The API server restarts automatically.

> **Free-tier note:** Google allows about 20 requests per model per day on the free tier. The server picks the newest Gemini Flash model. If a model is overloaded, unresponsive or out of quota, it automatically falls back to other Flash and Flash-Lite models. For heavier use, enable billing in Google AI Studio.

### Optional: C, C++ and Java

Python and JavaScript need nothing extra. For C, C++ and Java, either:
- install **gcc/g++** (e.g. MinGW-w64 on Windows) and/or a **JDK**, then restart `npm run dev`; or
- set `JUDGE0_URL` (and `JUDGE0_KEY`) in `.env` to use a Judge0 instance.

## Configuration (`.env`)

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | for AI features | Google Gemini API key. |
| `GEMINI_MODEL` | no | Pin a model (default: newest stable `gemini-*-flash`). |
| `API_PORT` | no | API server port (default `8787`; Vite proxies `/api` to it). |
| `JUDGE0_URL` / `JUDGE0_KEY` | no | Remote code runner for C / C++ / Java. |

`.env` is git-ignored. Never commit your real key; `.env.example` is the template.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts the web app (Vite, :5173) and the API server (:8787) together. |
| `npm run build` | Builds the frontend into `dist/`. |
| `npm start` | Runs the API server, which also serves `dist/` (run `npm run build` first). |
| `npm run verify:problems` | Checks every built-in problem's reference solution against its tests. |

## Demo tip

**Config → Time Manipulation** jumps the System clock forward (+6 h / +1 day / +1 week), so you can show daily resets, failed quests and the Penalty Zone live without waiting.

## How it's built

```
├── server/            Express API
│   ├── index.js       Routes: AI endpoints, code execution, serves dist/ in production
│   ├── ai.js          Gemini client (OpenAI-compatible endpoint), structured JSON output,
│   │                  streaming, model fallback and quota-aware cooldowns
│   └── execute.js     C/C++/Java runner (local compiler or Judge0) + sandboxed JS reference runner
├── src/
│   ├── engine/        Game rules: XP, levels, quests, penalties, rollovers (system.js);
│   │                  offline fallback engine (offline.js)
│   ├── data/          Problem bank, quiz bank, onboarding options
│   ├── runner/        Browser code runner + judge
│   ├── three/         3D scenes (portal shader, particle background, rank crystal)
│   ├── pages/         Landing, Onboarding, Dashboard, Problems, IDE, Quizzes, Interview, Penalty Zone, Config
│   ├── components/    UI building blocks, notifications, level-up / penalty overlays
│   └── store/         Zustand store (progress saved in localStorage)
├── public/workers/    Web Workers for JavaScript and Python (Pyodide) execution
└── scripts/           Problem verifier, .env bootstrap
```

**Stack:** React 19 · Vite · Three.js / React Three Fiber / drei / postprocessing · Framer Motion · Zustand · Monaco Editor · Pyodide · Node.js + Express · Google Gemini

## Notes

- Progress is stored in the browser's `localStorage`, so each browser holds one player.
- `npm audit` reports a `dompurify` advisory that comes in through `monaco-editor`. The editor itself loads Monaco from a CDN, not from that npm copy.
