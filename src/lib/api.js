// Thin client for the ACCESS AI server. AI calls resolve to
// { offline: true } instead of throwing so callers can fall back locally.

async function post(path, body) {
  try {
    const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({ offline: true, error: `HTTP ${r.status}` }));
    if (!r.ok && !j.offline) return { offline: true, error: j.error || `HTTP ${r.status}` };
    return j;
  } catch (e) {
    return { offline: true, error: 'Server unreachable' };
  }
}

export const api = {
  health: async () => {
    try { const r = await fetch('/api/health'); return await r.json(); } catch { return { ok: false, ai: false, runtimes: {} }; }
  },
  plan: (profile) => post('/api/ai/plan', { profile }),
  briefing: (profile, snapshot) => post('/api/ai/briefing', { profile, snapshot }),
  hint: (problem, code, language, level) => post('/api/ai/hint', { problem: { title: problem.title, statement: problem.statement }, code, language, level }),
  review: (problem, code, language, results) => post('/api/ai/review', { problem: { title: problem.title, statement: problem.statement }, code, language, results }),
  problem: (topic, difficulty, goal) => post('/api/ai/problem', { topic, difficulty, goal }),
  quiz: (track, count, goal) => post('/api/ai/quiz', { track, count, goal }),
  evaluate: (kind, messages) => post('/api/ai/interview/evaluate', { kind, messages }),
  execute: (language, code, inputs) => post('/api/execute', { language, code, inputs }),

  /** Streams an interviewer turn. onText(chunk) per delta. Resolves { ok } or { offline, error }. */
  async interview(body, onText) {
    try {
      const r = await fetch('/api/ai/interview/stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!r.ok || !r.body) return { offline: true, error: `HTTP ${r.status}` };
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop();
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data:')) continue;
          const msg = JSON.parse(line.slice(5));
          if (msg.t) onText(msg.t);
          if (msg.error) return { offline: true, error: msg.error };
        }
      }
      return { ok: true };
    } catch {
      return { offline: true, error: 'Server unreachable' };
    }
  },
};
