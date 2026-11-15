import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystem } from '../store/useSystem.js';
import { TRACKS, localQuiz } from '../data/quizzes.js';
import { SystemWindow, Tilt, Spinner, Bar } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { sfx } from '../lib/sound.js';

export default function Trials() {
  const game = useSystem((s) => s.game);
  const health = useSystem((s) => s.health);
  const recordQuiz = useSystem((s) => s.recordQuiz);
  const pushNotice = useSystem((s) => s.pushNotice);
  const [run, setRun] = useState(null); // { track, questions, i, picked, correct, source }
  const [loading, setLoading] = useState(null);
  const [done, setDone] = useState(null);

  const questTracks = new Set([
    ...(game.daily?.quests || []).filter((q) => q.type === 'quiz' && q.filter.track && q.progress < q.target).map((q) => q.filter.track),
    ...(game.penalty?.active ? game.penalty.quests.filter((q) => q.type === 'quiz').map((q) => q.filter.track) : []),
  ]);

  const start = async (track, useAi) => {
    setDone(null);
    if (useAi) {
      setLoading(track.id);
      const r = await api.quiz(track.name, 5, game.profile.goal);
      setLoading(null);
      if (r.offline || !r.questions?.length) {
        pushNotice({ kind: 'info', title: 'AI Trial unavailable', body: 'Falling back to the System archive.' });
      } else {
        sfx('notify');
        setRun({ track, questions: r.questions, i: 0, picked: null, correct: 0, source: 'AI' });
        return;
      }
    }
    sfx('notify');
    setRun({ track, questions: localQuiz(track.id, 5), i: 0, picked: null, correct: 0, source: 'ARCHIVE' });
  };

  const pick = (idx) => {
    if (run.picked !== null) return;
    const ok = idx === run.questions[run.i].answer;
    sfx(ok ? 'pass' : 'fail');
    setRun((r) => ({ ...r, picked: idx, correct: r.correct + (ok ? 1 : 0) }));
  };

  const next = () => {
    if (run.i + 1 < run.questions.length) { setRun((r) => ({ ...r, i: r.i + 1, picked: null })); return; }
    const res = recordQuiz({ track: run.track.id, correct: run.correct, total: run.questions.length });
    setDone({ ...res, track: run.track, correct: run.correct, total: run.questions.length });
    setRun(null);
  };

  const groups = [...new Set(TRACKS.map((t) => t.group))];
  const q = run?.questions[run.i];

  return (
    <div className="page">
      <div style={{ marginBottom: 20 }}>
        <div className="display" style={{ color: 'var(--accent)', letterSpacing: '0.4em', fontSize: '0.75rem' }}>KNOWLEDGE TRIALS</div>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)' }} className="grad-text">TRIALS</h1>
        <div className="muted">5-question trials. 60%+ passes daily quests, 70%+ counts for weekly and penalty objectives. INT boosts Trial XP.</div>
      </div>

      <AnimatePresence mode="wait">
        {run ? (
          <motion.div key={`q${run.i}`} initial={{ opacity: 0, rotateY: -20, x: 40 }} animate={{ opacity: 1, rotateY: 0, x: 0 }} exit={{ opacity: 0, rotateY: 20, x: -40 }} transition={{ duration: 0.35 }} style={{ maxWidth: 820, margin: '0 auto', perspective: 1000 }}>
            <SystemWindow tag={`${run.track.name.toUpperCase()} · ${run.source}`} title={`QUESTION ${run.i + 1}/${run.questions.length}`} right={<span className="mono" style={{ color: 'var(--good)' }}>{run.correct} ✓</span>}>
              <Bar value={run.i + (run.picked !== null ? 1 : 0)} max={run.questions.length} style={{ marginBottom: 16, height: 5 }} />
              <div className="statement" style={{ fontSize: '1.15rem', marginBottom: 16, fontFamily: q.q.includes('\n') ? 'var(--font-mono)' : undefined }}>{q.q}</div>
              <div className="col" style={{ gap: 10 }}>
                {q.options.map((o, i) => {
                  const cls = run.picked === null ? '' : i === q.answer ? 'correct' : i === run.picked ? 'wrong' : '';
                  return (
                    <motion.button key={i} whileHover={{ x: run.picked === null ? 6 : 0 }} className={`option ${cls}`} disabled={run.picked !== null} onClick={() => pick(i)}>
                      <span className="display" style={{ color: 'var(--accent)', marginRight: 10 }}>{'ABCD'[i]}</span>{o}
                    </motion.button>
                  );
                })}
              </div>
              {run.picked !== null && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="quest" style={{ marginTop: 14 }}>
                  <div className="display" style={{ fontSize: '0.7rem', letterSpacing: '0.2em', color: run.picked === q.answer ? 'var(--good)' : 'var(--bad)' }}>{run.picked === q.answer ? 'CORRECT' : 'INCORRECT'}</div>
                  <div className="muted">{q.explanation}</div>
                </motion.div>
              )}
              <div className="row spread" style={{ marginTop: 16 }}>
                <button className="btn ghost sm" onClick={() => setRun(null)}>Abandon</button>
                <button className="btn primary" disabled={run.picked === null} onClick={next}>{run.i + 1 < run.questions.length ? 'Next' : 'Finish Trial'}</button>
              </div>
            </SystemWindow>
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {done && (
              <SystemWindow tag="TRIAL RESULT" title={done.track.name.toUpperCase()} style={{ maxWidth: 820, margin: '0 auto 24px' }}>
                <div className="row spread wrap">
                  <div className="display" style={{ fontSize: '2.6rem', color: done.score >= 70 ? 'var(--good)' : done.score >= 60 ? 'var(--warn)' : 'var(--bad)' }}>{done.score}%</div>
                  <div className="col" style={{ alignItems: 'flex-end' }}>
                    <span className="mono">{done.correct}/{done.total} correct</span>
                    <span className="display" style={{ color: 'var(--gold)' }}>+{done.gained} XP</span>
                  </div>
                </div>
              </SystemWindow>
            )}
            {groups.map((g) => (
              <div key={g} style={{ marginBottom: 28 }}>
                <div className="display muted" style={{ letterSpacing: '0.3em', fontSize: '0.72rem', marginBottom: 12 }}>{g.toUpperCase()}</div>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
                  {TRACKS.filter((t) => t.group === g).map((t) => {
                    const best = game.quizHistory.filter((h) => h.track === t.id).reduce((a, h) => Math.max(a, h.score), -1);
                    const quest = questTracks.has(t.id);
                    return (
                      <Tilt key={t.id} className="gate-card" style={quest ? { borderColor: 'var(--gold)', boxShadow: '0 0 24px rgba(251,191,36,0.3)' } : undefined}>
                        <div className="row spread">
                          <span className="rank-letter" style={{ fontSize: '1.4rem' }}>{t.icon}</span>
                          {quest && <span className="badge pulse" style={{ color: 'var(--gold)' }}>QUEST</span>}
                        </div>
                        <h3 style={{ margin: '12px 0 4px', fontSize: '1rem' }}>{t.name}</h3>
                        <div className="dim" style={{ fontSize: '0.85rem' }}>{best >= 0 ? `Best: ${best}%` : 'Not attempted'}</div>
                        <div className="row" style={{ marginTop: 12, gap: 8 }}>
                          <button className="btn sm" onClick={() => start(t, false)}>Archive</button>
                          <button className="btn primary sm" disabled={!health?.ai || loading} onClick={() => start(t, true)}>{loading === t.id ? <Spinner label="" /> : 'AI Trial'}</button>
                        </div>
                      </Tilt>
                    );
                  })}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
