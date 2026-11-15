import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Editor from '@monaco-editor/react';
import { useSystem } from '../store/useSystem.js';
import { PROBLEMS, testsFor } from '../data/problems.js';
import { LANGUAGES, LANG_NAME } from '../data/options.js';
import { RANKS, agiFactor } from '../engine/system.js';
import { judge, runInputs, starterCode, loadCode, saveCode, warmUp } from '../runner/runCode.js';
import { SystemWindow, Spinner, fmtDuration } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { sfx } from '../lib/sound.js';

const rankColor = (id) => RANKS.find((r) => r.id === id)?.color || '#38bdf8';

function defineTheme(monaco) {
  monaco.editor.defineTheme('system', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '4b6185', fontStyle: 'italic' },
      { token: 'keyword', foreground: '7dd3fc' },
      { token: 'string', foreground: 'a5f3fc' },
      { token: 'number', foreground: 'fbbf24' },
      { token: 'type', foreground: 'a78bfa' },
    ],
    colors: {
      'editor.background': '#050b1c',
      'editor.lineHighlightBackground': '#0b1a3a',
      'editorLineNumber.foreground': '#2b4166',
      'editorLineNumber.activeForeground': '#7dd3fc',
      'editorCursor.foreground': '#38bdf8',
      'editor.selectionBackground': '#1e3a8a88',
      'editorIndentGuide.background1': '#0f2347',
    },
  });
}

const STATUS_TEXT = { AC: 'ACCEPTED', WA: 'WRONG ANSWER', RE: 'RUNTIME ERROR', TLE: 'TIME LIMIT EXCEEDED', CE: 'COMPILATION ERROR', UNAVAILABLE: 'RUNTIME UNAVAILABLE', SKIPPED: 'SKIPPED' };

export default function Arena() {
  const { id } = useParams();
  const nav = useNavigate();
  const game = useSystem((s) => s.game);
  const health = useSystem((s) => s.health);
  const recordSolve = useSystem((s) => s.recordSolve);
  const problem = useMemo(() => PROBLEMS.find((p) => p.id === id) || game.customProblems.find((p) => p.id === id), [id, game.customProblems]);

  const prefLangs = game.profile.languages?.length ? game.profile.languages : ['python'];
  const [lang, setLang] = useState(prefLangs[0]);
  const [code, setCode] = useState('');
  const [tab, setTab] = useState('brief');
  const [outTab, setOutTab] = useState('results');
  const [custom, setCustom] = useState('');
  const [running, setRunning] = useState(null); // 'run' | 'submit' | null
  const [result, setResult] = useState(null);
  const [runOut, setRunOut] = useState(null);
  const [clear, setClear] = useState(null);
  const [hint, setHint] = useState({ level: 0, items: [], busy: false });
  const [review, setReview] = useState({ busy: false, data: null });
  const startKey = `access-ai-start:${id}`;
  const [startAt] = useState(() => {
    try { const v = sessionStorage.getItem(startKey); if (v) return Number(v); const n = Date.now(); sessionStorage.setItem(startKey, String(n)); return n; } catch { return Date.now(); }
  });
  const [nowT, setNowT] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNowT(Date.now()), 1000); return () => clearInterval(t); }, []);
  const saveTimer = useRef(null);

  const tests = useMemo(() => (problem ? testsFor(problem) : []), [problem]);
  const samples = tests.slice(0, 2);

  useEffect(() => {
    if (!problem) return;
    setCode(loadCode(problem.id, lang) ?? starterCode(lang, problem));
    setResult(null); setRunOut(null);
    warmUp(lang);
  }, [problem, lang]);

  useEffect(() => { if (samples[0] && !custom) setCustom(samples[0].input); }, [samples]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!problem) {
    return <div className="page"><SystemWindow tag="ERROR" title="GATE NOT FOUND"><button className="btn" onClick={() => nav('/gates')}>Back to Gates</button></SystemWindow></div>;
  }

  const onChange = (v) => {
    setCode(v ?? '');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveCode(problem.id, lang, v ?? ''), 400);
  };

  const runtime = ['python', 'javascript'].includes(lang) ? 'browser' : health?.runtimes?.[lang] || 'unknown';
  const elapsed = Math.floor((nowT - startAt) / 1000);
  const speedWindow = problem.timeTarget * 60 * agiFactor(game);
  const solvedRec = game.solved[problem.id];

  const doRun = async () => {
    setRunning('run'); setOutTab('output'); sfx('tick');
    const r = await runInputs(lang, code, [custom]);
    setRunning(null);
    if (r.compileError) setRunOut({ status: r.unavailable ? 'UNAVAILABLE' : 'CE', stdout: '', stderr: r.compileError });
    else setRunOut(r.results[0]);
  };

  const doSubmit = async () => {
    setRunning('submit'); setOutTab('results'); sfx('tick');
    const r = await judge(lang, code, tests);
    setRunning(null);
    setResult(r);
    if (r.verdict === 'AC') {
      const res = recordSolve({ problem, language: lang, seconds: elapsed });
      setClear(res);
      try { sessionStorage.removeItem(startKey); } catch { /* ignore */ }
    } else {
      sfx('fail');
    }
  };

  const askHint = async () => {
    const level = Math.min(3, hint.level + 1);
    setHint((h) => ({ ...h, busy: true }));
    const r = await api.hint(problem, code, LANG_NAME[lang], level);
    let item;
    if (r.offline || !r.hint) {
      const local = problem.hints?.[level - 1] || [
        `Think about the topic: ${problem.topic}. What data structure gives you the operation you need fastest?`,
        `Key idea: ${problem.editorial?.split('.')[0]}.`,
        problem.editorial,
      ][level - 1];
      item = { level, hint: local, nudge: 'Offline hint from the System archive.' };
    } else item = { level, ...r };
    setHint((h) => ({ level, busy: false, items: [...h.items, item] }));
    sfx('notify');
  };

  const askReview = async () => {
    setReview({ busy: true, data: null });
    const summary = result ? { verdict: result.verdict, passed: result.cases.filter((c) => c.status === 'AC').length, total: tests.length } : { verdict: 'not run' };
    const r = await api.review(problem, code, LANG_NAME[lang], summary);
    setReview({ busy: false, data: r.offline ? { error: r.error } : r });
  };

  return (
    <div className="page" style={{ maxWidth: 1600, paddingTop: 88 }}>
      <div className="ide">
        {/* ---------- LEFT: Brief ---------- */}
        <SystemWindow
          tag={`${problem.rank}-RANK GATE · ${problem.topic.toUpperCase()}`}
          title={problem.title}
          right={<span className="rank-letter" style={{ '--rank-color': rankColor(problem.rank) }}>{problem.rank}</span>}
          style={{ maxHeight: 'calc(100vh - 110px)', overflow: 'auto' }}
        >
          <div className="row wrap" style={{ gap: 8, marginBottom: 12 }}>
            <span className="badge" style={{ color: 'var(--gold)' }}>+{problem.xp} XP</span>
            <span className="badge" style={{ color: elapsed <= speedWindow ? 'var(--good)' : 'var(--muted)' }}>⏱ {fmtDuration(elapsed * 1000)} / {Math.round(speedWindow / 60)}m bonus</span>
            {solvedRec && <span className="badge" style={{ color: 'var(--good)' }}>CLEARED · {solvedRec.langs.map((l) => LANG_NAME[l]).join(', ')}</span>}
          </div>
          <div className="tabs">
            {[['brief', 'BRIEF'], ['mentor', 'AI MENTOR'], ['editorial', 'EDITORIAL']].map(([k, l]) => (
              <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
            ))}
          </div>

          {tab === 'brief' && (
            <div className="col" style={{ gap: 14 }}>
              <div className="statement" style={{ fontSize: '1.05rem' }}>{problem.statement}</div>
              <div><div className="display muted" style={{ fontSize: '0.68rem', letterSpacing: '0.2em', marginBottom: 6 }}>INPUT</div><pre className="block">{problem.inputFormat}</pre></div>
              <div><div className="display muted" style={{ fontSize: '0.68rem', letterSpacing: '0.2em', marginBottom: 6 }}>OUTPUT</div><pre className="block">{problem.outputFormat}</pre></div>
              {problem.constraints?.length > 0 && (
                <div><div className="display muted" style={{ fontSize: '0.68rem', letterSpacing: '0.2em', marginBottom: 6 }}>CONSTRAINTS</div><ul style={{ margin: 0, paddingLeft: 18 }} className="mono">{problem.constraints.map((c) => <li key={c} style={{ fontSize: '0.85rem' }}>{c}</li>)}</ul></div>
              )}
              {samples.map((s, i) => (
                <div key={i} className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div><div className="dim display" style={{ fontSize: '0.62rem', letterSpacing: '0.2em' }}>SAMPLE {i + 1} · IN</div><pre className="block">{s.input}</pre></div>
                  <div><div className="dim display" style={{ fontSize: '0.62rem', letterSpacing: '0.2em' }}>SAMPLE {i + 1} · OUT</div><pre className="block">{s.output}</pre></div>
                </div>
              ))}
              <div className="dim" style={{ fontSize: '0.85rem' }}>{tests.length - samples.length} hidden tests guard this Gate.</div>
            </div>
          )}

          {tab === 'mentor' && (
            <div className="col" style={{ gap: 14 }}>
              <p className="muted" style={{ margin: 0 }}>Hints escalate from a gentle direction to a full approach — the System never writes your code.</p>
              <div className="row wrap">
                <button className="btn" disabled={hint.busy || hint.level >= 3} onClick={askHint}>{hint.busy ? <Spinner label="ANALYSING" /> : hint.level >= 3 ? 'All hints used' : `Request hint ${hint.level + 1}/3`}</button>
                <button className="btn primary" disabled={review.busy || !health?.ai} onClick={askReview}>{review.busy ? <Spinner label="REVIEWING" /> : 'Interview-grade review'}</button>
              </div>
              <AnimatePresence>
                {hint.items.map((h) => (
                  <motion.div key={h.level} className="quest" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="display" style={{ fontSize: '0.65rem', letterSpacing: '0.25em', color: 'var(--accent)' }}>HINT {h.level}</div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{h.hint}</div>
                    {h.nudge && <div className="muted" style={{ fontSize: '0.9rem', marginTop: 6 }}>↳ {h.nudge}</div>}
                  </motion.div>
                ))}
              </AnimatePresence>
              {review.data?.error && <div className="quest" style={{ borderColor: 'var(--bad)' }}>Review unavailable: {review.data.error}</div>}
              {review.data && !review.data.error && (
                <motion.div className="quest" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ borderColor: 'var(--accent)' }}>
                  <div className="row spread">
                    <div className="display" style={{ fontSize: '0.7rem', letterSpacing: '0.25em', color: 'var(--accent)' }}>SYSTEM REVIEW</div>
                    <span className="display" style={{ fontSize: '1.5rem', color: review.data.score >= 75 ? 'var(--good)' : review.data.score >= 50 ? 'var(--warn)' : 'var(--bad)' }}>{review.data.score}</span>
                  </div>
                  <div style={{ fontWeight: 700, margin: '4px 0 8px' }}>{review.data.verdict}</div>
                  <div className="row wrap mono" style={{ fontSize: '0.85rem', gap: 14 }}><span>Time: {review.data.timeComplexity}</span><span>Space: {review.data.spaceComplexity}</span></div>
                  {review.data.issues?.length > 0 && <><div className="dim display" style={{ fontSize: '0.62rem', marginTop: 10, letterSpacing: '0.2em' }}>ISSUES</div><ul style={{ margin: 4, paddingLeft: 18 }}>{review.data.issues.map((x) => <li key={x}>{x}</li>)}</ul></>}
                  {review.data.suggestions?.length > 0 && <><div className="dim display" style={{ fontSize: '0.62rem', marginTop: 10, letterSpacing: '0.2em' }}>SUGGESTIONS</div><ul style={{ margin: 4, paddingLeft: 18 }}>{review.data.suggestions.map((x) => <li key={x}>{x}</li>)}</ul></>}
                  {review.data.interviewTip && <div style={{ marginTop: 8, color: 'var(--gold)' }}>🎙 {review.data.interviewTip}</div>}
                </motion.div>
              )}
              {!health?.ai && <div className="dim" style={{ fontSize: '0.85rem' }}>AI link offline — hints come from the built-in archive; reviews need GEMINI_API_KEY.</div>}
            </div>
          )}

          {tab === 'editorial' && (
            solvedRec
              ? <div className="statement">{problem.editorial}</div>
              : <div className="quest center" style={{ padding: 30 }}><div style={{ fontSize: '2rem' }}>🔒</div><div className="display" style={{ letterSpacing: '0.2em' }}>SEALED</div><div className="muted">The editorial unlocks once you clear this Gate.</div></div>
          )}
        </SystemWindow>

        {/* ---------- RIGHT: Editor ---------- */}
        <div className="col" style={{ gap: 12, minWidth: 0 }}>
          <div className="row spread wrap">
            <div className="row wrap" style={{ gap: 6 }}>
              {[...prefLangs, ...LANGUAGES.map((l) => l.id).filter((l) => !prefLangs.includes(l))].map((l) => (
                <span key={l} className={`chip ${lang === l ? 'on' : ''}`} onClick={() => setLang(l)} style={!prefLangs.includes(l) ? { opacity: 0.6 } : undefined}>{LANG_NAME[l]}</span>
              ))}
              <span className="badge" style={{ color: runtime === 'none' ? 'var(--bad)' : 'var(--good)' }} title="Where this language executes">{runtime === 'browser' ? 'IN-BROWSER' : runtime === 'none' ? 'NO RUNTIME' : runtime.toUpperCase()}</span>
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn ghost sm" onClick={() => { if (confirm('Reset code to the starter template?')) { const s = starterCode(lang, problem); setCode(s); saveCode(problem.id, lang, s); } }}>Reset</button>
              <button className="btn sm" disabled={!!running} onClick={doRun}>{running === 'run' ? 'Running…' : '▶ Run'}</button>
              <button className="btn primary sm" disabled={!!running} onClick={doSubmit}>{running === 'submit' ? 'Judging…' : '⚔ Submit'}</button>
            </div>
          </div>

          <div className="editor-wrap" style={{ height: 'calc(100vh - 470px)', minHeight: 320 }}>
            <Editor
              height="100%"
              theme="system"
              language={LANGUAGES.find((l) => l.id === lang)?.monaco}
              value={code}
              onChange={onChange}
              beforeMount={defineTheme}
              loading={<Spinner label="LOADING EDITOR" />}
              options={{ fontSize: 14, fontFamily: 'JetBrains Mono, monospace', minimap: { enabled: false }, scrollBeyondLastLine: false, smoothScrolling: true, cursorSmoothCaretAnimation: 'on', cursorBlinking: 'phase', padding: { top: 12 }, tabSize: 4, automaticLayout: true }}
            />
          </div>

          <SystemWindow style={{ padding: 14 }}>
            <div className="tabs" style={{ marginTop: -4 }}>
              {[['results', 'TEST RESULTS'], ['input', 'CUSTOM INPUT'], ['output', 'OUTPUT']].map(([k, l]) => (
                <button key={k} className={outTab === k ? 'on' : ''} onClick={() => setOutTab(k)}>{l}</button>
              ))}
            </div>
            {outTab === 'input' && <textarea className="input mono" style={{ minHeight: 110, fontSize: '0.85rem' }} value={custom} onChange={(e) => setCustom(e.target.value)} />}
            {outTab === 'output' && (
              running === 'run' ? <Spinner label={lang === 'python' ? 'BOOTING PYTHON' : 'EXECUTING'} />
                : runOut ? (
                  <div className="col" style={{ gap: 8 }}>
                    <div className="row" style={{ gap: 10 }}><span className="badge" style={{ color: runOut.status === 'OK' ? 'var(--good)' : 'var(--bad)' }}>{runOut.status === 'OK' ? 'FINISHED' : STATUS_TEXT[runOut.status] || runOut.status}</span>{runOut.time != null && <span className="dim mono">{runOut.time} ms</span>}</div>
                    <div className="console">{runOut.stdout || <span className="dim">(no output)</span>}</div>
                    {runOut.stderr && <div className="console" style={{ color: '#fda4af' }}>{runOut.stderr}</div>}
                  </div>
                ) : <div className="dim">Run your code against the custom input.</div>
            )}
            {outTab === 'results' && (
              running === 'submit' ? <Spinner label="JUDGING" />
                : result ? (
                  <div className="col" style={{ gap: 10 }}>
                    <div className="display" style={{ fontSize: '1.2rem', color: result.verdict === 'AC' ? 'var(--good)' : 'var(--bad)', textShadow: '0 0 14px currentColor' }}>
                      {STATUS_TEXT[result.verdict]} {result.cases.length > 0 && <span className="mono" style={{ fontSize: '0.85rem' }}>· {result.cases.filter((c) => c.status === 'AC').length}/{tests.length}</span>}
                    </div>
                    {result.compileError && <div className="console" style={{ color: '#fda4af' }}>{result.compileError}</div>}
                    <div className="row wrap" style={{ gap: 6 }}>
                      {result.cases.map((c, i) => (
                        <span key={i} className={`case ${c.status}`} title={c.status}>#{i + 1} {c.status === 'AC' ? '✓' : c.status} {c.time != null && <span className="dim">{c.time}ms</span>}</span>
                      ))}
                    </div>
                    {(() => {
                      const bad = result.cases.findIndex((c) => c.status !== 'AC');
                      if (bad < 0) return null;
                      const c = result.cases[bad];
                      const hidden = bad >= samples.length;
                      return (
                        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                          <div><div className="dim display" style={{ fontSize: '0.6rem' }}>INPUT #{bad + 1}{hidden ? ' (hidden)' : ''}</div><div className="console">{c.input.length > 400 ? c.input.slice(0, 400) + '…' : c.input}</div></div>
                          <div><div className="dim display" style={{ fontSize: '0.6rem' }}>EXPECTED</div><div className="console">{hidden ? '█ sealed █' : c.expected}</div></div>
                          <div><div className="dim display" style={{ fontSize: '0.6rem' }}>YOUR OUTPUT</div><div className="console" style={{ color: '#fda4af' }}>{c.got || c.stderr || '(empty)'}</div></div>
                        </div>
                      );
                    })()}
                  </div>
                ) : <div className="dim">Submit to face all {tests.length} tests. <span className="kbd">Run</span> uses your custom input.</div>
            )}
          </SystemWindow>
        </div>
      </div>

      <AnimatePresence>
        {clear && (
          <motion.div className="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, pointerEvents: 'none' }} onClick={() => setClear(null)} style={{ zIndex: 90 }}>
            <motion.div className="center" initial={{ scale: 0.5, rotateY: 90 }} animate={{ scale: 1, rotateY: 0 }} transition={{ type: 'spring', stiffness: 140, damping: 13 }}>
              <div className="display" style={{ letterSpacing: '0.5em', color: 'var(--accent)' }}>[SYSTEM]</div>
              <h1 className="glow-text glitch" data-text="GATE CLEARED" style={{ fontSize: 'clamp(2.4rem, 8vw, 5rem)', margin: '10px 0' }}>GATE CLEARED</h1>
              <div className="display" style={{ fontSize: '1.4rem', color: 'var(--gold)' }}>{clear.gained ? `+${clear.gained} XP` : 'Already cleared in this language — no XP'}</div>
              {clear.speed && <div className="display" style={{ color: 'var(--good)', marginTop: 8 }}>⚡ AGI SPEED BONUS ×1.25</div>}
              <div className="row" style={{ justifyContent: 'center', marginTop: 24 }}>
                <button className="btn" onClick={(e) => { e.stopPropagation(); setClear(null); setTab('editorial'); }}>Read editorial</button>
                <button className="btn primary" onClick={(e) => { e.stopPropagation(); setClear(null); nav('/gates'); }}>Next Gate</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
