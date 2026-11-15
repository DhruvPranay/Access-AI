import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { askJSON, streamChat, schemas, aiConfigured, resolveModel, activeModel } from './ai.js';
import { execute, runtimes, runReferenceJs } from './execute.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const clip = (s, n = 6000) => String(s ?? '').slice(0, n);

// Wrap AI routes so any failure becomes { offline: true, error } (HTTP 503)
// and the client switches to its offline engine.
const ai = (handler) => async (req, res) => {
  if (!aiConfigured()) return res.status(503).json({ offline: true, error: 'GEMINI_API_KEY not set' });
  try {
    res.json(await handler(req.body || {}));
  } catch (err) {
    console.error('[ai]', err?.status || '', err?.message);
    res.status(503).json({ offline: true, error: err?.message || 'AI request failed' });
  }
};

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ai: aiConfigured(), model: activeModel(), runtimes: runtimes() });
});

// ---------- Awakening: personalised plan ----------
app.post('/api/ai/plan', ai(async ({ profile }) => {
  return askJSON({
    voice: 'system',
    schema: schemas.plan,
    system: `Design a personalised preparation roadmap. "title" is an epic System title for the player (e.g. "The Recursion Hunter"). "playerClass" is a job-class style label tied to their goal (e.g. "Backend Assassin", "Full-Stack Mage"). "directive" is a 2–3 sentence System message accepting the player's goal and stating the terms. "roadmap" has 3–5 phases whose weeks add up to roughly the time until the target date (minimum 4 weeks total). IMPORTANT: inside "roadmap" (phase names, focus, milestone), "focusTopics", "dailyRitual" and "warnings", use plain, standard study language (e.g. "Arrays and Hashing", "Solve 15 medium problems") — no game terms there. "focusTopics" lists 6–10 concrete topics. "dailyRitual" lists 3–5 short daily habits. "warnings" lists 2–3 blunt warnings about common failure modes for this goal.`,
    prompt: `Player profile:\n${JSON.stringify(profile, null, 2)}`,
  });
}));

// ---------- Daily briefing ----------
app.post('/api/ai/briefing', ai(async ({ profile, snapshot }) => {
  return askJSON({
    voice: 'system',
    schema: schemas.briefing,
    maxTokens: 2000,
    system: 'Write a 2–3 sentence daily System briefing for the player. Reference their real numbers (level, streak, penalties, weak stats) and today\'s quests. Firm but motivating. No markdown.',
    prompt: JSON.stringify({ profile, snapshot }),
  });
}));

// ---------- IDE: hint ----------
app.post('/api/ai/hint', ai(async ({ problem, code, language, level = 1 }) => {
  return askJSON({
    schema: schemas.hint,
    maxTokens: 3000,
    system: `Give a hint for a coding problem WITHOUT revealing the full solution or writing the solution code. Hint level ${level} of 3: level 1 = gentle direction (which idea/data structure), level 2 = the key insight, level 3 = step-by-step approach in plain words or short pseudocode (still no full code). Keep it to 2–4 short sentences a student can follow. If the student's code has an obvious bug, point to it in "nudge"; otherwise give a short encouraging nudge.`,
    prompt: `Problem: ${problem?.title}\n${clip(problem?.statement, 3000)}\n\nLanguage: ${language}\nStudent's current code:\n\`\`\`\n${clip(code)}\n\`\`\``,
  });
}));

// ---------- IDE: code review ----------
app.post('/api/ai/review', ai(async ({ problem, code, language, results }) => {
  return askJSON({
    schema: schemas.review,
    effort: 'medium',
    maxTokens: 6000,
    system: 'Review the student\'s solution as a fair technical interviewer at a top product company, in simple clear English. "verdict" is one plain line (e.g. "Correct, but O(n²) — an O(n) approach is expected."). "score" is 0–100 for interview-readiness (correctness, complexity, readability, edge cases). Give Big-O for time and space. "issues" are concrete bugs/risks; "suggestions" are concrete improvements; "interviewTip" is how to explain this solution aloud in an interview.',
    prompt: `Problem: ${problem?.title}\n${clip(problem?.statement, 3000)}\n\nLanguage: ${language}\nTest summary: ${clip(JSON.stringify(results), 1500)}\n\nCode:\n\`\`\`\n${clip(code, 10000)}\n\`\`\``,
  });
}));

// ---------- Gates: AI-generated problem ----------
app.post('/api/ai/problem', ai(async ({ topic, difficulty, goal }) => {
  const p = await askJSON({
    schema: schemas.problem,
    effort: 'medium',
    maxTokens: 12000,
    system: `Create a coding problem of the kind actually asked in internship / placement coding rounds (LeetCode / GeeksforGeeks style). It reads from standard input and writes to standard output. Requirements:
- "title": a short, plain, descriptive title like a real problem name (e.g. "Longest Subarray With Sum K", "Minimum Window Substring"). No themed or made-up fantasy names.
- "topic": the standard topic name.
- "statement": 2–5 short sentences in plain English stating the task directly ("Given an array of N integers and an integer K, find …"). No story, no theme. Then one small worked example in words if it helps.
- "inputFormat"/"outputFormat": exact formats. Output must be deterministic (a single correct answer; no "any valid order").
- "tests": 6–8 inputs (raw stdin strings, use \\n for newlines), from tiny edge cases to moderately large; first two are simple samples.
- "referenceSolutionJs": plain JavaScript defining \`function solve(input) { ... return outputString; }\` that takes the whole stdin string and returns the full expected stdout (lines joined with \\n). No imports, no require, no I/O. It must be correct and efficient.
- "hints": 3 progressive hints in plain words.`,
    prompt: `Topic: ${topic || 'any core DSA topic'}\nDifficulty: ${difficulty || 'Medium'}\nStudent's goal: ${clip(goal, 300)}`,
  });
  const inputs = p.tests.map((t) => t.input);
  const outputs = await runReferenceJs(p.referenceSolutionJs, inputs);
  return {
    ...p,
    tests: inputs.map((input, i) => ({ input, output: outputs[i] })),
  };
}));

// ---------- Trials: AI-generated quiz ----------
app.post('/api/ai/quiz', ai(async ({ track, count = 5, difficulty = 'mixed', goal }) => {
  const q = await askJSON({
    schema: schemas.quiz,
    effort: 'low',
    maxTokens: 8000,
    system: `Write ${Math.min(10, Number(count) || 5)} multiple-choice questions exactly like the ones commonly asked in campus placement tests and internship interviews for this subject (the kind found on GeeksforGeeks / IndiaBix / standard interview lists).
- Each question is ONE short, direct sentence (or a short code snippet for output-prediction), e.g. "What is the difference between a process and a thread?" style, turned into MCQ form.
- Prefer the most frequently asked, fundamental questions over tricky or obscure ones. Easy-to-medium difficulty.
- Exactly 4 short options; "answer" is the 0-based index of the single correct option. The 3 wrong options must be believable — common misconceptions or closely related terms from the same subject — never silly or obviously unrelated.
- "explanation": 1–2 simple sentences explaining why the answer is correct.
- No themes, stories, tags or role-play anywhere. Be strictly accurate.`,
    prompt: `Subject: ${track}\nDifficulty: ${difficulty}\nStudent's goal: ${clip(goal, 300)}`,
  });
  q.questions = q.questions.filter((x) => x.options.length === 4 && x.answer >= 0 && x.answer < 4);
  return q;
}));

// ---------- Mock interview (streaming) ----------
const INTERVIEW_STYLES = {
  dsa: 'a coding-round interviewer. Ask one algorithmic problem at a time, ask the candidate to explain their approach and complexity before code, probe edge cases, and give a follow-up variation.',
  core: 'a CS-fundamentals interviewer covering Operating Systems, DBMS, Computer Networks and OOP. Ask one question at a time, go deeper based on answers.',
  hr: 'an HR / behavioural interviewer. Ask one question at a time (STAR-method style), probe for specifics, and react realistically.',
  system: 'a junior-level system design interviewer (suitable for interns/new grads). Start with a simple product, ask about requirements, APIs, data model, scaling basics.',
  lang: 'a language-specific interviewer. Ask about the candidate\'s chosen language internals, idioms, memory model, and tricky output-prediction snippets.',
};

app.post('/api/ai/interview/stream', async (req, res) => {
  if (!aiConfigured()) return res.status(503).json({ offline: true, error: 'GEMINI_API_KEY not set' });
  const { kind = 'dsa', company = 'a top product company', language = 'any', messages = [], profile = {} } = req.body || {};
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
  const history = messages
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && m.content)
    .slice(-30)
    .map((m) => ({ role: m.role, content: clip(m.content, 4000) }));
  if (!history.length || history[0].role !== 'user') history.unshift({ role: 'user', content: 'I am ready. Begin the interview.' });
  try {
    await streamChat({
      system: `For this session you are acting as ${INTERVIEW_STYLES[kind] || INTERVIEW_STYLES.dsa}
Company style: ${clip(company, 100)}. Candidate's preferred language: ${clip(language, 40)}. Candidate profile: ${clip(JSON.stringify(profile), 800)}.
Rules: behave exactly like a friendly, professional human interviewer in a real interview. Ask the standard, commonly asked questions for this round in simple wording — the kind students will actually face. Keep each turn short (under 100 words), ask exactly ONE question per turn, never answer your own question, use plain text (code blocks allowed). No tags, themes or role-play. Open with a one-line greeting, then the first question. After about 6 questions, tell the candidate they can end the interview to get their evaluation.`,
      messages: history,
      onText: (t) => send({ t }),
    });
    send({ done: true });
  } catch (err) {
    console.error('[interview]', err?.message);
    send({ error: err?.message || 'Interview failed', offline: true });
  }
  res.end();
});

app.post('/api/ai/interview/evaluate', ai(async ({ kind, messages = [] }) => {
  const transcript = messages.map((m) => `${m.role === 'user' ? 'CANDIDATE' : 'INTERVIEWER'}: ${clip(m.content, 2000)}`).join('\n\n');
  return askJSON({
    schema: schemas.evaluation,
    effort: 'medium',
    maxTokens: 5000,
    system: 'Evaluate the candidate\'s mock interview performance honestly. "score" 0–100 (be calibrated: 50 = borderline, 75 = likely hire for intern). If the candidate barely answered, score low. "verdict" is one plain line starting with Hire, Lean hire, Lean no hire or No hire, followed by a short reason. Write strengths, improvements and next steps in simple, specific language.',
    prompt: `Interview type: ${kind}\n\nTranscript:\n${clip(transcript, 30000)}`,
  });
}));

// ---------- Code execution ----------
app.post('/api/execute', async (req, res) => {
  const { language, code, inputs } = req.body || {};
  if (!language || typeof code !== 'string' || !Array.isArray(inputs)) return res.status(400).json({ error: 'language, code, inputs[] required' });
  try {
    res.json(await execute(language, clip(code, 100000), inputs.slice(0, 20).map((x) => clip(x, 200000))));
  } catch (err) {
    res.status(500).json({ compileError: err?.message || 'Execution failed' });
  }
});

// ---------- Production: serve the built SPA ----------
const dist = path.join(here, '..', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

// API_PORT (not PORT) so tools that set PORT for the web dev server don't
// make both servers fight over the same port. Vite proxies /api here.
const PORT = Number(process.env.API_PORT) || 8787;
app.listen(PORT, async () => {
  console.log(`[SYSTEM] API online at http://localhost:${PORT}`);
  console.log('[SYSTEM] runtimes:', runtimes());
  if (aiConfigured()) console.log(`[SYSTEM] AI: Google Gemini · model ${await resolveModel()}`);
  else console.log('[SYSTEM] AI: offline engine (set GEMINI_API_KEY in .env to enable Gemini)');
});
