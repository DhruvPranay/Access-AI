/* Sandboxed JavaScript runner (classic Web Worker).
 * Emulates the common Node stdin idioms so competitive-style code works:
 *   require('fs').readFileSync(0, 'utf8')
 *   require('readline').createInterface({ input: process.stdin }).on('line', ...)
 *   for await (const line of rl) ...
 *   process.stdin.on('data' | 'end', ...)
 */
const AsyncFunction = (async () => {}).constructor;
const realConsole = self.console;

function fmt(args) {
  return args
    .map((x) => {
      if (typeof x === 'string') return x;
      if (typeof x === 'bigint') return x.toString();
      if (x === undefined) return 'undefined';
      try { return typeof x === 'object' ? JSON.stringify(x) : String(x); } catch { return String(x); }
    })
    .join(' ');
}

self.onmessage = async (e) => {
  const { id, code, input } = e.data;
  let stdout = '';
  let stderr = '';
  const LIMIT = 256 * 1024;
  const write = (s) => { if (stdout.length < LIMIT) stdout += s; };
  const lines = String(input).replace(/\r/g, '').split('\n');
  if (lines.length && lines[lines.length - 1] === '') lines.pop();

  const lineHandlers = [];
  const closeHandlers = [];
  const dataHandlers = [];
  const endHandlers = [];
  const EXIT = { exit: true };

  const rlShim = {
    createInterface: () => {
      const rl = {
        on(ev, cb) { if (ev === 'line') lineHandlers.push(cb); if (ev === 'close') closeHandlers.push(cb); return rl; },
        once(ev, cb) { return rl.on(ev, cb); },
        close() {},
        question(_q, cb) { cb(lines.shift() ?? ''); },
        async *[Symbol.asyncIterator]() { while (lines.length) yield lines.shift(); },
      };
      return rl;
    },
  };
  const fsShim = { readFileSync: () => String(input) };

  self.console = {
    log: (...a) => write(fmt(a) + '\n'),
    info: (...a) => write(fmt(a) + '\n'),
    error: (...a) => { stderr += fmt(a) + '\n'; },
    warn: (...a) => { stderr += fmt(a) + '\n'; },
    debug: (...a) => { stderr += fmt(a) + '\n'; },
    table: (...a) => write(fmt(a) + '\n'),
  };
  self.require = (m) => {
    if (m === 'fs') return fsShim;
    if (m === 'readline') return rlShim;
    throw new Error(`Module "${m}" is not available in the browser runner`);
  };
  self.process = {
    stdin: {
      on(ev, cb) { if (ev === 'data') dataHandlers.push(cb); if (ev === 'end') endHandlers.push(cb); return this; },
      setEncoding() {}, resume() {},
    },
    stdout: { write: (s) => { write(String(s)); return true; } },
    stderr: { write: (s) => { stderr += String(s); return true; } },
    argv: [], env: {}, platform: 'browser',
    exit: () => { throw EXIT; },
    hrtime: { bigint: () => BigInt(Math.round(performance.now() * 1e6)) },
  };
  self.readLine = () => lines.shift();
  self.gets = self.readLine;

  const start = performance.now();
  let status = 'OK';
  try {
    const fn = new AsyncFunction(code);
    await fn();
    if (dataHandlers.length) dataHandlers.forEach((cb) => cb(String(input)));
    endHandlers.forEach((cb) => cb());
    if (lineHandlers.length) {
      while (lines.length) { const l = lines.shift(); lineHandlers.forEach((cb) => cb(l)); }
    }
    for (const cb of closeHandlers) await cb();
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
  } catch (err) {
    if (err !== EXIT) {
      status = 'RE';
      stderr += (err && err.stack ? String(err.stack).split('\n').slice(0, 4).join('\n') : String(err)) + '\n';
    }
  }
  self.console = realConsole;
  self.postMessage({ id, stdout, stderr, status, time: Math.round(performance.now() - start) });
};
self.postMessage({ ready: true });
