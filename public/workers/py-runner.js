/* Python runner on Pyodide (classic Web Worker). Loaded once, reused. */
const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.27.5/full/';
let pyodide = null;

const ready = (async () => {
  importScripts(PYODIDE_URL + 'pyodide.js');
  pyodide = await loadPyodide({ indexURL: PYODIDE_URL });
  self.postMessage({ ready: true });
})().catch((err) => {
  self.postMessage({ loadError: String(err && err.message ? err.message : err) });
});

const HARNESS = `
import sys, io, traceback
_out, _err = io.StringIO(), io.StringIO()
_old = (sys.stdin, sys.stdout, sys.stderr)
sys.stdin, sys.stdout, sys.stderr = io.StringIO(__stdin), _out, _err
_ok = True
try:
    exec(compile(__code, "solution.py", "exec"), {"__name__": "__main__"})
except SystemExit:
    pass
except BaseException:
    _ok = False
    traceback.print_exc()
finally:
    sys.stdin, sys.stdout, sys.stderr = _old
[_out.getvalue(), _err.getvalue(), _ok]
`;

self.onmessage = async (e) => {
  const { id, code, input } = e.data;
  await ready;
  if (!pyodide) {
    self.postMessage({ id, stdout: '', stderr: 'Python runtime failed to load (check your internet connection).', status: 'RE', time: 0 });
    return;
  }
  const start = performance.now();
  try {
    pyodide.globals.set('__code', code);
    pyodide.globals.set('__stdin', String(input));
    const res = pyodide.runPython(HARNESS);
    const [stdout, stderr, ok] = res.toJs();
    res.destroy && res.destroy();
    self.postMessage({ id, stdout, stderr, status: ok ? 'OK' : 'RE', time: Math.round(performance.now() - start) });
  } catch (err) {
    self.postMessage({ id, stdout: '', stderr: String(err), status: 'RE', time: Math.round(performance.now() - start) });
  }
};
