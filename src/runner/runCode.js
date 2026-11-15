// Code execution manager: JS + Python in browser workers, C/C++/Java via server.
import { api } from '../lib/api.js';

const TIMEOUT = { javascript: 4000, python: 6000 };
const WORKER_URL = { javascript: '/workers/js-runner.js', python: '/workers/py-runner.js' };
const workers = {};

function getWorker(lang) {
  if (workers[lang]) return workers[lang];
  const w = new Worker(WORKER_URL[lang]);
  const entry = { w, pending: new Map(), ready: null, seq: 0 };
  entry.ready = new Promise((resolve) => {
    w.addEventListener('message', function onReady(e) {
      if (e.data?.ready || e.data?.loadError) { w.removeEventListener('message', onReady); resolve(e.data); }
    });
  });
  w.addEventListener('message', (e) => {
    const p = entry.pending.get(e.data?.id);
    if (p) { entry.pending.delete(e.data.id); p(e.data); }
  });
  workers[lang] = entry;
  return entry;
}

/** Start loading the Python runtime early (it is ~10 MB, cached after first load). */
export function warmUp(lang) {
  if (WORKER_URL[lang]) return getWorker(lang).ready;
  return Promise.resolve({ ready: true });
}

function runInWorker(lang, code, input) {
  const entry = getWorker(lang);
  return entry.ready.then((st) => new Promise((resolve) => {
    if (st.loadError) return resolve({ stdout: '', stderr: `Runtime failed to load: ${st.loadError}`, status: 'RE', time: 0 });
    const id = ++entry.seq;
    const timer = setTimeout(() => {
      entry.pending.delete(id);
      entry.w.terminate();
      delete workers[lang]; // respawn fresh next run
      resolve({ stdout: '', stderr: `Time limit exceeded (${TIMEOUT[lang] / 1000}s)`, status: 'TLE', time: TIMEOUT[lang] });
    }, TIMEOUT[lang] + (lang === 'python' ? 2000 : 0));
    entry.pending.set(id, (data) => { clearTimeout(timer); resolve(data); });
    entry.w.postMessage({ id, code, input });
  }));
}

const normalize = (s) => String(s ?? '').replace(/\r/g, '').split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').replace(/\n+$/, '').trim();

/**
 * Run code against inputs. Returns { results: [{stdout, stderr, status, time}], compileError?, unavailable? }.
 */
export async function runInputs(lang, code, inputs) {
  if (WORKER_URL[lang]) {
    const results = [];
    for (const input of inputs) {
      const r = await runInWorker(lang, code, input);
      results.push(r);
      if (r.status === 'TLE') break; // don't burn time on the rest
    }
    return { results };
  }
  const r = await api.execute(lang, code, inputs);
  if (r.offline) return { compileError: 'Execution server unreachable. Start it with `npm run dev`.', unavailable: true };
  return r;
}

/** Judge code against tests [{input, output}]. */
export async function judge(lang, code, tests) {
  const r = await runInputs(lang, code, tests.map((t) => t.input));
  if (r.compileError) return { verdict: r.unavailable ? 'UNAVAILABLE' : 'CE', compileError: r.compileError, cases: [] };
  const cases = tests.map((t, i) => {
    const res = r.results[i];
    if (!res) return { input: t.input, expected: t.output, got: '', status: 'SKIPPED', time: 0 };
    let status = res.status;
    if (status === 'OK') status = normalize(res.stdout) === normalize(t.output) ? 'AC' : 'WA';
    return { input: t.input, expected: t.output, got: res.stdout, stderr: res.stderr, status, time: res.time };
  });
  const verdict = cases.every((c) => c.status === 'AC') ? 'AC' : cases.find((c) => c.status !== 'AC').status;
  return { verdict, cases };
}

// ---------------- Starter code ----------------
const comment = (lang, text) => {
  const prefix = lang === 'python' ? '# ' : '// ';
  return text.split('\n').map((l) => prefix + l).join('\n');
};

export function starterCode(lang, problem) {
  const header = comment(lang, `${problem.title}\nInput:\n${problem.inputFormat}\nOutput:\n${problem.outputFormat}`);
  switch (lang) {
    case 'python':
      return `${header}\nimport sys\n\n\ndef main():\n    data = sys.stdin.read().split()\n    # Write your solution here\n    \n\n\nif __name__ == "__main__":\n    main()\n`;
    case 'javascript':
      return `${header}\nconst input = require('fs').readFileSync(0, 'utf8').trim();\nconst lines = input.split('\\n');\n\n// Write your solution here\n\n`;
    case 'cpp':
      return `${header}\n#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    // Write your solution here\n\n    return 0;\n}\n`;
    case 'java':
      return `${header}\nimport java.util.*;\nimport java.io.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n        // Write your solution here\n\n    }\n}\n`;
    case 'c':
      return `${header}\n#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\nint main(void) {\n    // Write your solution here\n\n    return 0;\n}\n`;
    default:
      return header;
  }
}

const codeKey = (pid, lang) => `access-ai-code:${pid}:${lang}`;
export function loadCode(pid, lang) {
  try { return localStorage.getItem(codeKey(pid, lang)); } catch { return null; }
}
export function saveCode(pid, lang, code) {
  try { localStorage.setItem(codeKey(pid, lang), code); } catch { /* storage full or blocked */ }
}
