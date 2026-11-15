// Code execution for languages the browser can't run natively (C, C++, Java).
// Strategy: local toolchain if installed → Judge0 if configured → unavailable.
// Also runs AI-generated JS reference solutions in a locked-down Node process.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const RUN_TIMEOUT_MS = 4000;
const COMPILE_TIMEOUT_MS = 20000;
const OUTPUT_CAP = 64 * 1024;

function has(cmd, args = ['--version']) {
  try {
    const r = spawnSync(cmd, args, { stdio: 'ignore', timeout: 5000, shell: false });
    return r.status === 0;
  } catch {
    return false;
  }
}

const local = {
  c: has('gcc'),
  cpp: has('g++'),
  java: has('javac', ['-version']) && has('java', ['-version']),
  python: has('python') || has('python3'),
  javascript: true,
};
const pythonCmd = has('python') ? 'python' : 'python3';
const judge0 = process.env.JUDGE0_URL ? { url: process.env.JUDGE0_URL.replace(/\/$/, ''), key: process.env.JUDGE0_KEY } : null;
const JUDGE0_IDS = { c: 50, cpp: 54, java: 62, python: 71, javascript: 63 };

export function runtimes() {
  const out = {};
  for (const lang of ['c', 'cpp', 'java', 'python', 'javascript']) {
    out[lang] = local[lang] ? 'local' : judge0 ? 'judge0' : 'none';
  }
  return out;
}

function run(cmd, args, { cwd, input = '', timeout = RUN_TIMEOUT_MS } = {}) {
  return new Promise((resolve) => {
    const start = performance.now();
    let stdout = '';
    let stderr = '';
    let killed = false;
    const child = spawn(cmd, args, { cwd, shell: false, windowsHide: true });
    const timer = setTimeout(() => {
      killed = true;
      child.kill('SIGKILL');
    }, timeout);
    child.stdout.on('data', (d) => { if (stdout.length < OUTPUT_CAP) stdout += d; });
    child.stderr.on('data', (d) => { if (stderr.length < OUTPUT_CAP) stderr += d; });
    child.on('error', (e) => { stderr += String(e.message); });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        stdout,
        stderr,
        code,
        time: Math.round(performance.now() - start),
        status: killed ? 'TLE' : code === 0 ? 'OK' : 'RE',
      });
    });
    child.stdin.on('error', () => {});
    child.stdin.end(input);
  });
}

async function runLocal(language, code, inputs) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'access-ai-'));
  try {
    let exec;
    if (language === 'cpp' || language === 'c') {
      const src = path.join(dir, language === 'cpp' ? 'main.cpp' : 'main.c');
      const bin = path.join(dir, process.platform === 'win32' ? 'main.exe' : 'main');
      await fs.writeFile(src, code);
      const compiler = language === 'cpp' ? 'g++' : 'gcc';
      const flags = language === 'cpp' ? ['-O2', '-std=c++17'] : ['-O2', '-std=c11'];
      const c = await run(compiler, [...flags, src, '-o', bin], { cwd: dir, timeout: COMPILE_TIMEOUT_MS });
      if (c.code !== 0) return { compileError: c.stderr || c.stdout || 'Compilation failed' };
      exec = (input) => run(bin, [], { cwd: dir, input });
    } else if (language === 'java') {
      await fs.writeFile(path.join(dir, 'Main.java'), code);
      const c = await run('javac', ['Main.java'], { cwd: dir, timeout: COMPILE_TIMEOUT_MS });
      if (c.code !== 0) return { compileError: c.stderr || c.stdout || 'Compilation failed' };
      exec = (input) => run('java', ['-Xss64m', '-cp', dir, 'Main'], { cwd: dir, input, timeout: RUN_TIMEOUT_MS + 1500 });
    } else if (language === 'python') {
      await fs.writeFile(path.join(dir, 'main.py'), code);
      exec = (input) => run(pythonCmd, ['-I', 'main.py'], { cwd: dir, input });
    } else if (language === 'javascript') {
      await fs.writeFile(path.join(dir, 'main.js'), code);
      exec = (input) => run(process.execPath, ['main.js'], { cwd: dir, input });
    } else {
      return { compileError: `Unsupported language: ${language}` };
    }
    const results = [];
    for (const input of inputs) results.push(await exec(input));
    return { results };
  } finally {
    fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

async function runJudge0(language, code, inputs) {
  const headers = { 'Content-Type': 'application/json' };
  if (judge0.key) {
    headers['X-RapidAPI-Key'] = judge0.key;
    headers['X-Auth-Token'] = judge0.key;
  }
  const results = [];
  for (const input of inputs) {
    const r = await fetch(`${judge0.url}/submissions?base64_encoded=false&wait=true`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ source_code: code, language_id: JUDGE0_IDS[language], stdin: input }),
    });
    if (!r.ok) throw new Error(`Judge0 error ${r.status}`);
    const j = await r.json();
    if (j.status?.id === 6) return { compileError: j.compile_output || 'Compilation failed' };
    results.push({
      stdout: j.stdout || '',
      stderr: j.stderr || '',
      time: Math.round(Number(j.time || 0) * 1000),
      status: j.status?.id === 3 ? 'OK' : j.status?.id === 5 ? 'TLE' : 'RE',
    });
  }
  return { results };
}

export async function execute(language, code, inputs) {
  if (local[language]) return runLocal(language, code, inputs);
  if (judge0 && JUDGE0_IDS[language]) return runJudge0(language, code, inputs);
  return {
    unavailable: true,
    compileError: `No ${language.toUpperCase()} runtime found on the server. Install ${
      language === 'java' ? 'a JDK (javac/java)' : language === 'c' ? 'gcc (e.g. MinGW-w64)' : 'g++ (e.g. MinGW-w64)'
    } and restart, or set JUDGE0_URL in .env.`,
  };
}

/**
 * Run an AI-written `function solve(input) { return output }` against inputs
 * in a Node process with the permission model on (no fs / child processes /
 * workers / network addons). Returns the outputs, which become the expected
 * outputs of the generated problem — so tests are always self-consistent.
 */
export async function runReferenceJs(source, inputs) {
  const script = `
    ${source}
    const __inputs = ${JSON.stringify(inputs)};
    const __out = __inputs.map((x) => { try { return String(solve(x)); } catch (e) { return '__ERROR__' + e.message; } });
    process.stdout.write(JSON.stringify(__out));
  `;
  const r = await run(process.execPath, ['--permission', '-e', script], { timeout: 8000 });
  if (r.status !== 'OK') throw new Error(`Reference solution failed: ${r.stderr.slice(0, 400)}`);
  const outs = JSON.parse(r.stdout);
  if (outs.some((o) => o.startsWith('__ERROR__'))) throw new Error('Reference solution threw on a test');
  return outs;
}
