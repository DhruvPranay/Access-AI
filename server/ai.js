// Google Gemini integration for ACCESS AI — "The System".
// Uses Gemini's OpenAI-compatible endpoint, so plain fetch is enough.
// Every function here throws on failure; routes translate failures into
// { offline: true } so the frontend can fall back to its local engine.

const BASE_URL = (process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai').replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = 180_000;
const apiKey = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

// Default model; replaced at startup by the newest Gemini Flash model your
// key can access, unless GEMINI_MODEL pins one explicitly.
export let MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
// Older Flash models to fall back to when MODEL is overloaded / rate-limited.
let FALLBACKS = ['gemini-flash-latest', 'gemini-2.5-flash'];
const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function aiConfigured() {
  return Boolean(apiKey());
}

const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${apiKey()}`,
});

/**
 * Pick the newest stable general-purpose Gemini Flash model available to this
 * key (fast, and covered by the free tier). Pin another with GEMINI_MODEL.
 */
export async function resolveModel() {
  if (process.env.GEMINI_MODEL || !aiConfigured()) return MODEL;
  try {
    const r = await fetch(`${BASE_URL}/models`, { headers: headers(), signal: AbortSignal.timeout(15_000) });
    if (!r.ok) return MODEL;
    const { data = [] } = await r.json();
    const version = (id) => Number((id.match(/^gemini-(\d+(?:\.\d+)?)/) || [])[1] || 0);
    const ids = data.map((m) => String(m.id).replace(/^models\//, ''));
    const byVersion = (a, b) => version(b) - version(a);
    // Stable Flash models first, then stable Flash-Lite ones. On the free tier
    // each model has its own daily request quota, so every fallback adds capacity.
    const flash = ids.filter((id) => /^gemini-\d+(\.\d+)?-flash$/.test(id)).sort(byVersion);
    const lite = ids.filter((id) => /^gemini-\d+(\.\d+)?-flash-lite$/.test(id)).sort(byVersion);
    if (flash.length) {
      MODEL = flash[0];
      FALLBACKS = [...flash.slice(1), ...lite, 'gemini-flash-latest', 'gemini-flash-lite-latest'];
    }
  } catch {
    /* keep the default */
  }
  return MODEL;
}

class ApiError extends Error {
  constructor(status, body) {
    let msg = body;
    try {
      const j = JSON.parse(body);
      const e = Array.isArray(j) ? j[0]?.error : j.error;
      msg = e?.message || e || body;
    } catch { /* raw text */ }
    super(`Gemini ${status}: ${String(msg).slice(0, 300)}`);
    this.status = status;
  }
}

/**
 * POST a chat completion. On overload / rate limits (429, 5xx) it retries the
 * primary model once, then walks down the fallback list of older Flash models.
 */
// Models that recently answered "busy" are skipped for a while, so one
// overloaded model doesn't add its (slow) 503 to every request.
const busyUntil = new Map();
const BUSY_COOLDOWN_MS = 5 * 60_000;

// Every request streams, so a healthy model sends response headers within a
// second or two. A model that hasn't started answering by then is treated as
// hung and we move on to the next one.
const FIRST_BYTE_TIMEOUT_MS = 20_000;

async function post(body) {
  const all = [MODEL, ...FALLBACKS.filter((m) => m !== MODEL)];
  const t = Date.now();
  const healthy = all.filter((m) => !(busyUntil.get(m) > t));
  const models = healthy.length ? healthy : all; // everything busy → try them all anyway
  let lastErr;
  for (const model of models) {
    const ctrl = new AbortController();
    const firstByte = setTimeout(() => ctrl.abort(new Error('no response')), FIRST_BYTE_TIMEOUT_MS);
    let r;
    try {
      r = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ model, stream: true, ...body }),
        signal: AbortSignal.any([ctrl.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]),
      });
    } catch (err) {
      clearTimeout(firstByte);
      lastErr = new Error(`Gemini ${model}: no response within ${FIRST_BYTE_TIMEOUT_MS / 1000}s`);
      busyUntil.set(model, Date.now() + BUSY_COOLDOWN_MS);
      continue;
    }
    clearTimeout(firstByte);
    if (r.ok) {
      busyUntil.delete(model);
      if (model !== MODEL) console.log(`[ai] ${MODEL} unavailable — served by ${model}`);
      return r;
    }
    const errText = await r.text();
    lastErr = new ApiError(r.status, errText);
    // 404 = model retired for this key; treat like busy and move on.
    if (!RETRYABLE.has(r.status) && r.status !== 404) throw lastErr;
    // Quota errors say how long until reset (e.g. "retryDelay": "59448s") —
    // skip that model until then instead of re-hitting it every few minutes.
    const retrySec = Number((errText.match(/"retryDelay":\s*"(\d+)/) || [])[1] || 0);
    const cooldown = r.status === 404 ? 24 * 3600_000 : Math.max(BUSY_COOLDOWN_MS, Math.min(retrySec * 1000, 24 * 3600_000));
    busyUntil.set(model, Date.now() + cooldown);
    if (r.status === 429) console.log(`[ai] ${model} quota exhausted — skipping for ${Math.round(cooldown / 60_000)} min`);
    await sleep(300);
  }
  throw lastErr;
}

/** Read an OpenAI-style SSE stream; returns the full text and finish reason. */
async function readStream(r, onText) {
  const decoder = new TextDecoder();
  let buf = '';
  let text = '';
  let finishReason = null;
  for await (const chunk of r.body) {
    buf += decoder.decode(chunk, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) {
      const s = line.trim();
      if (!s.startsWith('data:')) continue;
      const data = s.slice(5).trim();
      if (data === '[DONE]') return { text, finishReason };
      try {
        const choice = JSON.parse(data).choices?.[0];
        const delta = choice?.delta?.content;
        if (delta) { text += delta; onText?.(delta); }
        if (choice?.finish_reason) finishReason = choice.finish_reason;
      } catch {
        /* ignore keep-alives / partial lines */
      }
    }
  }
  return { text, finishReason };
}

/** Which model is actually answering right now (for /api/health). */
export function activeModel() {
  const t = Date.now();
  return [MODEL, ...FALLBACKS].find((m) => !(busyUntil.get(m) > t)) || MODEL;
}

// Two voices. The game-like "System" voice is only for motivational UI text
// (briefings, roadmap directive). Everything a student must actually read and
// answer — questions, problems, hints, reviews, interviews — uses PLAIN.
const PERSONAS = {
  system: `You are "THE SYSTEM" inside ACCESS AI, a gamified preparation platform for undergraduate students targeting software internships and campus placements. You speak like a cold, precise, game-like system interface: short declarative sentences, occasional bracketed tags like [NOTICE] or [QUEST]. You are technically accurate. Address the user as "Player".`,
  plain: `You are an experienced software engineering interviewer and mentor helping undergraduate students prepare for internship and campus placement interviews.
Write exactly the way questions are asked in real interview rounds and online assessments at companies (LeetCode / GeeksforGeeks / campus-placement style):
- Plain, simple English that a 2nd- or 3rd-year student can understand on first read. Short sentences.
- No story, fantasy, game, dungeon, "player", "quest", "gate", "mana" or similar theme. No bracketed tags like [NOTICE] or [QUEST]. No role-play.
- Use the standard, well-known names for problems and concepts (e.g. "Two Sum", "deadlock", "normalization").
- Be strictly technically accurate.`,
};

function parseJson(text) {
  const cleaned = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  return JSON.parse(cleaned);
}

/** Ask Gemini for JSON matching `schema` (structured outputs, with a JSON-mode fallback). */
export async function askJSON({ system, prompt, schema, maxTokens = 16000, voice = 'plain' }) {
  const messages = [
    { role: 'system', content: `${PERSONAS[voice]}\n\n${system}` },
    { role: 'user', content: prompt },
  ];
  let r;
  try {
    r = await post({
      messages,
      max_tokens: maxTokens,
      response_format: { type: 'json_schema', json_schema: { name: 'system_response', schema, strict: true } },
    });
  } catch (err) {
    // Some models/accounts reject json_schema — fall back to plain JSON mode
    // with the schema spelled out in the prompt.
    if (err.status !== 400 && err.status !== 422) throw err;
    r = await post({
      messages: [
        { role: 'system', content: `${messages[0].content}\n\nRespond with ONLY a JSON object that conforms to this JSON Schema (no prose, no code fences):\n${JSON.stringify(schema)}` },
        messages[1],
      ],
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    });
  }
  const { text, finishReason } = await readStream(r);
  if (finishReason === 'length') throw new Error('Response was cut off (max_tokens reached)');
  if (!text.trim()) throw new Error(`Gemini returned an empty response${finishReason ? ` (${finishReason})` : ''}`);
  return parseJson(text);
}

/** Stream a chat reply; calls onText(chunk) for each text delta. */
export async function streamChat({ system, messages, onText, maxTokens = 8000, voice = 'plain' }) {
  const r = await post({
    max_tokens: maxTokens,
    messages: [{ role: 'system', content: `${PERSONAS[voice]}\n\n${system}` }, ...messages],
  });
  await readStream(r, onText);
}

// ---------- Schemas (strict structured outputs) ----------
const obj = (properties) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const str = { type: 'string' };
const strArr = { type: 'array', items: str };

export const schemas = {
  plan: obj({
    title: str,
    playerClass: str,
    directive: str,
    roadmap: {
      type: 'array',
      items: obj({ phase: str, weeks: { type: 'integer' }, focus: strArr, milestone: str }),
    },
    focusTopics: strArr,
    dailyRitual: strArr,
    warnings: strArr,
  }),
  hint: obj({ hint: str, nudge: str }),
  review: obj({
    verdict: str,
    score: { type: 'integer' },
    timeComplexity: str,
    spaceComplexity: str,
    issues: strArr,
    suggestions: strArr,
    interviewTip: str,
  }),
  problem: obj({
    title: str,
    topic: str,
    difficulty: { type: 'string', enum: ['Easy', 'Medium', 'Hard'] },
    statement: str,
    inputFormat: str,
    outputFormat: str,
    constraints: strArr,
    tests: { type: 'array', items: obj({ input: str }) },
    referenceSolutionJs: str,
    hints: strArr,
  }),
  quiz: obj({
    questions: {
      type: 'array',
      items: obj({ q: str, options: strArr, answer: { type: 'integer' }, explanation: str }),
    },
  }),
  evaluation: obj({
    score: { type: 'integer' },
    verdict: str,
    strengths: strArr,
    improvements: strArr,
    nextSteps: strArr,
  }),
  briefing: obj({ message: str }),
};
