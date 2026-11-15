import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useSystem } from '../store/useSystem.js';
import { SystemWindow, Spinner } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { offlineQuestion, offlineEvaluate, interviewKinds } from '../engine/offline.js';
import { LANG_NAME } from '../data/options.js';
import { sfx } from '../lib/sound.js';

export default function Interview() {
  const game = useSystem((s) => s.game);
  const health = useSystem((s) => s.health);
  const recordInterview = useSystem((s) => s.recordInterview);
  const [kind, setKind] = useState(interviewKinds[0].id);
  const [company, setCompany] = useState(game.profile.companies || 'a top product company');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [offline, setOffline] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const chatRef = useRef(null);
  const active = messages.length > 0 && !evaluation;

  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' }); }, [messages]);

  const aiTurn = async (history) => {
    setStreaming(true);
    let acc = '';
    setMessages([...history, { role: 'assistant', content: '' }]);
    const r = await api.interview(
      { kind, company, language: (game.profile.languages || []).map((l) => LANG_NAME[l]).join(', '), messages: history, profile: { goal: game.profile.goal, year: game.profile.year, level: game.level } },
      (t) => { acc += t; setMessages([...history, { role: 'assistant', content: acc }]); },
    );
    setStreaming(false);
    if (r.offline && !acc) {
      setOffline(true);
      const asked = history.filter((m) => m.role === 'assistant').length;
      setMessages([...history, { role: 'assistant', content: offlineQuestion(kind, asked) }]);
    }
    sfx('tick');
  };

  const begin = async () => {
    setEvaluation(null);
    sfx('boot');
    const first = [{ role: 'user', content: `I am ready. Begin the ${interviewKinds.find((k) => k.id === kind).name} interview.` }];
    if (!health?.ai) {
      setOffline(true);
      setMessages([...first, { role: 'assistant', content: offlineQuestion(kind, 0) }]);
      return;
    }
    setOffline(false);
    await aiTurn(first);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');
    const history = [...messages, { role: 'user', content: text }];
    if (offline) {
      const asked = history.filter((m) => m.role === 'assistant').length;
      setMessages([...history, { role: 'assistant', content: offlineQuestion(kind, asked) }]);
      return;
    }
    await aiTurn(history);
  };

  const end = async () => {
    setEvaluating(true);
    const transcript = messages.slice(1);
    let ev = offline ? offlineEvaluate(kind, transcript) : await api.evaluate(kind, transcript);
    if (ev.offline && !ev.verdict) ev = offlineEvaluate(kind, transcript);
    setEvaluating(false);
    const score = Math.max(0, Math.min(100, Math.round(ev.score)));
    const answered = transcript.filter((m) => m.role === 'user').length;
    setEvaluation({ ...ev, score });
    if (answered >= 2) recordInterview({ kind, score, verdict: ev.verdict });
  };

  const answered = messages.filter((m) => m.role === 'user').length - 1;

  return (
    <div className="page">
      <div style={{ marginBottom: 20 }}>
        <div className="display" style={{ color: 'var(--accent)', letterSpacing: '0.4em', fontSize: '0.75rem' }}>SIMULATION CHAMBER</div>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)' }} className="grad-text">MOCK INTERVIEW</h1>
      </div>

      <div className="two-pane">
        <div className="col" style={{ gap: 20 }}>
          <SystemWindow tag="CONFIGURE" title="INTERVIEWER">
            <div className="col">
              <div className="row wrap" style={{ gap: 6 }}>
                {interviewKinds.map((k) => <span key={k.id} className={`chip ${kind === k.id ? 'on' : ''}`} onClick={() => !active && setKind(k.id)}>{k.name}</span>)}
              </div>
              <label className="field">Company style<input className="input" value={company} disabled={active} onChange={(e) => setCompany(e.target.value)} /></label>
              {!active ? (
                <button className="btn primary" onClick={begin}>{messages.length ? 'New Interview' : 'Begin Interview'}</button>
              ) : (
                <button className="btn danger" disabled={streaming || evaluating || answered < 1} onClick={end}>{evaluating ? <Spinner label="EVALUATING" /> : 'End & Evaluate'}</button>
              )}
              <div className="dim" style={{ fontSize: '0.85rem' }}>
                {health?.ai ? 'Live AI interviewer — adapts to your answers and scores the whole transcript.' : 'AI offline — scripted interviewer with an estimated score.'} Answer at least 2 questions for it to count toward quests.
              </div>
            </div>
          </SystemWindow>

          {evaluation && (
            <SystemWindow tag="EVALUATION" title="VERDICT">
              <div className="row spread">
                <div className="display" style={{ fontSize: '3rem', color: evaluation.score >= 75 ? 'var(--good)' : evaluation.score >= 50 ? 'var(--warn)' : 'var(--bad)', textShadow: '0 0 20px currentColor' }}>{evaluation.score}</div>
                <div className="muted" style={{ maxWidth: 260, textAlign: 'right' }}>{evaluation.verdict}</div>
              </div>
              {[['STRENGTHS', evaluation.strengths, 'var(--good)'], ['IMPROVE', evaluation.improvements, 'var(--warn)'], ['NEXT STEPS', evaluation.nextSteps, 'var(--accent)']].map(([t, list, c]) => list?.length > 0 && (
                <div key={t} style={{ marginTop: 12 }}>
                  <div className="display" style={{ fontSize: '0.62rem', letterSpacing: '0.25em', color: c }}>{t}</div>
                  <ul style={{ margin: '4px 0', paddingLeft: 18 }}>{list.map((x) => <li key={x}>{x}</li>)}</ul>
                </div>
              ))}
            </SystemWindow>
          )}

          {game.interviewHistory.length > 0 && (
            <SystemWindow tag="RECORD" title="PAST SESSIONS">
              {game.interviewHistory.slice(0, 6).map((h, i) => (
                <div key={i} className="log-item"><span className="k" style={{ color: 'var(--accent)' }}>{h.kind.toUpperCase()}</span><span style={{ flex: 1 }}>{new Date(h.t).toLocaleDateString()}</span><span className="mono">{h.score}</span></div>
              ))}
            </SystemWindow>
          )}
        </div>

        <SystemWindow tag={offline ? 'OFFLINE INTERVIEWER' : 'LIVE CHANNEL'} title="TRANSCRIPT" style={{ minWidth: 0 }}>
          <div ref={chatRef} className="chat" style={{ height: 'calc(100vh - 360px)', minHeight: 340 }}>
            {!messages.length && (
              <div className="center muted" style={{ margin: 'auto' }}>
                <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 2.4 }} style={{ fontSize: '3rem', color: 'var(--accent)', textShadow: 'var(--glow)' }}>◉</motion.div>
                Configure the interviewer and begin.
              </div>
            )}
            {messages.slice(1).map((m, i) => (
              <motion.div key={i} className={`msg ${m.role === 'user' ? 'me' : 'ai'}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                {m.content || <span className="typing" />}
              </motion.div>
            ))}
          </div>
          <div className="row" style={{ marginTop: 12, alignItems: 'flex-end' }}>
            <textarea
              className="input"
              style={{ minHeight: 70 }}
              placeholder={active ? 'Type your answer… (Ctrl+Enter to send)' : 'Begin an interview first'}
              disabled={!active || streaming}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send(); }}
            />
            <button className="btn primary" disabled={!active || streaming || !input.trim()} onClick={send}>Send</button>
          </div>
        </SystemWindow>
      </div>
    </div>
  );
}
