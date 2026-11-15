import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { SystemWindow, Typewriter, Spinner } from '../components/ui.jsx';
import { LANGUAGES, INTERVIEW_TRACKS, GOAL_PRESETS, INTENSITY, YEARS } from '../data/options.js';
import { useSystem } from '../store/useSystem.js';
import { api } from '../lib/api.js';
import { localPlan } from '../engine/offline.js';
import { sfx } from '../lib/sound.js';

const STEP_MSGS = [
  'A new Player signal has been detected. Identify yourself.',
  'State the goal you wish to achieve. The System will hold you to it.',
  'Select the languages you will wield in battle.',
  'Register the interview rounds you intend to face.',
  'Choose your training intensity. Higher intensity — harder quests, faster growth.',
  'Analysing Player…',
];

const defaultDate = () => { const d = new Date(); d.setMonth(d.getMonth() + 3); return d.toISOString().slice(0, 10); };

export default function Awaken() {
  const nav = useNavigate();
  const awaken = useSystem((s) => s.awaken);
  const existing = useSystem((s) => s.game);
  const [step, setStep] = useState(0);
  const [p, setP] = useState({ name: '', year: YEARS[2], college: '', goal: GOAL_PRESETS[0], companies: '', targetDate: defaultDate(), languages: ['python'], tracks: ['dsa', 'core'], intensity: 2 });
  const [plan, setPlan] = useState(null);
  const [scanLines, setScanLines] = useState([]);
  const set = (k, v) => setP((x) => ({ ...x, [k]: v }));
  const toggle = (k, v) => setP((x) => ({ ...x, [k]: x[k].includes(v) ? x[k].filter((y) => y !== v) : [...x[k], v] }));

  const canNext = [p.name.trim().length > 1, p.goal.trim().length > 5, p.languages.length > 0, p.tracks.length > 0, true][step];
  const next = () => { sfx('tick'); setStep((s) => s + 1); };

  useEffect(() => {
    if (step !== 5) return undefined;
    let alive = true;
    const lines = ['Reading goal parameters…', 'Mapping interview tracks…', 'Calibrating quest difficulty…', 'Forging roadmap…', 'Binding Player to the System…'];
    lines.forEach((l, i) => setTimeout(() => alive && setScanLines((s) => [...s, l]), 450 * (i + 1)));
    const started = Date.now();
    api.plan(p).then((res) => {
      const result = res.offline || !res.roadmap ? localPlan(p) : res;
      const wait = Math.max(0, 2600 - (Date.now() - started));
      setTimeout(() => { if (alive) { setPlan(result); sfx('notify'); } }, wait);
    });
    return () => { alive = false; };
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  const accept = () => {
    awaken({ ...p, name: p.name.trim() }, plan);
    nav('/system');
  };

  return (
    <div className="page page-narrow" style={{ minHeight: '100vh', display: 'grid', alignContent: 'center' }}>
      {existing && step === 0 && (
        <div className="badge" style={{ color: 'var(--warn)', marginBottom: 12, justifySelf: 'start' }}>An existing Player profile will be overwritten.</div>
      )}
      <AnimatePresence mode="wait">
        <motion.div key={step + (plan ? 'p' : '')} initial={{ opacity: 0, rotateX: -25, y: 30 }} animate={{ opacity: 1, rotateX: 0, y: 0 }} exit={{ opacity: 0, rotateX: 25, y: -30 }} transition={{ duration: 0.45 }} style={{ perspective: 1000 }}>
          <SystemWindow tag={`AWAKENING · ${Math.min(step + 1, 5)}/5`} title={plan ? 'SYSTEM DIRECTIVE' : 'PLAYER REGISTRATION'}>
            <p style={{ fontSize: '1.2rem', minHeight: '1.6em', color: '#dbeafe', marginTop: 0 }}>
              <Typewriter text={plan ? 'Analysis complete. Review your directive.' : STEP_MSGS[step]} />
            </p>

            {step === 0 && (
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                <label className="field">Player name<input className="input" autoFocus value={p.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Aarav" onKeyDown={(e) => e.key === 'Enter' && canNext && next()} /></label>
                <label className="field">Year of study<select className="input" value={p.year} onChange={(e) => set('year', e.target.value)}>{YEARS.map((y) => <option key={y}>{y}</option>)}</select></label>
                <label className="field" style={{ gridColumn: '1 / -1' }}>College / University (optional)<input className="input" value={p.college} onChange={(e) => set('college', e.target.value)} /></label>
              </div>
            )}

            {step === 1 && (
              <div className="col">
                <div className="row wrap">{GOAL_PRESETS.map((g) => <span key={g} className={`chip ${p.goal === g ? 'on' : ''}`} onClick={() => set('goal', g)}>{g}</span>)}</div>
                <label className="field">Your goal (edit freely)<textarea className="input" value={p.goal} onChange={(e) => set('goal', e.target.value)} /></label>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                  <label className="field">Target companies (optional)<input className="input" value={p.companies} onChange={(e) => set('companies', e.target.value)} placeholder="e.g. Google, Amazon, Flipkart" /></label>
                  <label className="field">Target date<input type="date" className="input" value={p.targetDate} onChange={(e) => set('targetDate', e.target.value)} /></label>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
                {LANGUAGES.map((l) => (
                  <motion.button key={l.id} whileHover={{ y: -4, rotateX: 8 }} whileTap={{ scale: 0.96 }} className={`chip ${p.languages.includes(l.id) ? 'on' : ''}`} style={{ padding: 18, borderRadius: 14, justifyContent: 'center', fontSize: '1.1rem', borderColor: p.languages.includes(l.id) ? l.color : undefined }} onClick={() => toggle('languages', l.id)}>
                    <span style={{ color: l.color, fontFamily: 'var(--font-display)' }}>{'</>'}</span> {l.name}
                  </motion.button>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
                {INTERVIEW_TRACKS.map((t) => (
                  <motion.button key={t.id} whileHover={{ y: -3 }} className={`chip ${p.tracks.includes(t.id) ? 'on' : ''}`} style={{ padding: 16, borderRadius: 14, flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }} onClick={() => toggle('tracks', t.id)}>
                    <span style={{ fontWeight: 700 }}>{t.name}</span>
                    <span className="muted" style={{ fontSize: '0.88rem' }}>{t.desc}</span>
                  </motion.button>
                ))}
              </div>
            )}

            {step === 4 && (
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                {INTENSITY.map((t) => (
                  <motion.button key={t.id} whileHover={{ y: -4 }} className={`chip ${p.intensity === t.id ? 'on' : ''}`} style={{ padding: 22, borderRadius: 14, flexDirection: 'column', gap: 6 }} onClick={() => set('intensity', t.id)}>
                    <span className="display" style={{ fontSize: '1.1rem', color: t.id === 3 ? 'var(--bad)' : undefined }}>{t.name}</span>
                    <span className="muted">{t.desc}</span>
                    <span className="dim" style={{ fontSize: '0.8rem' }}>{['1 Gate/day', '2 Gates + 1 C-rank/day', '3 Gates + 1 C-rank/day'][t.id - 1]}</span>
                  </motion.button>
                ))}
              </div>
            )}

            {step === 5 && !plan && (
              <div className="col" style={{ minHeight: 200, justifyContent: 'center' }}>
                <Spinner label="SYNCHRONISING" />
                <div className="mono muted" style={{ fontSize: '0.85rem' }}>
                  {scanLines.map((l) => <motion.div key={l} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>&gt; {l}</motion.div>)}
                </div>
              </div>
            )}

            {plan && (
              <div className="col" style={{ gap: 16 }}>
                <div className="row wrap" style={{ gap: 10 }}>
                  <span className="badge" style={{ color: 'var(--gold)' }}>TITLE · {plan.title}</span>
                  <span className="badge" style={{ color: 'var(--accent)' }}>CLASS · {plan.playerClass}</span>
                  {plan.offline && <span className="badge" style={{ color: 'var(--warn)' }}>OFFLINE PLAN</span>}
                </div>
                <p style={{ fontSize: '1.08rem', margin: 0 }}>{plan.directive}</p>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
                  {plan.roadmap.map((r, i) => (
                    <motion.div key={r.phase} className="quest" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.12 }}>
                      <div className="display" style={{ fontSize: '0.7rem', color: 'var(--accent)', letterSpacing: '0.2em' }}>{r.weeks} WEEK{r.weeks > 1 ? 'S' : ''}</div>
                      <div className="q-title">{r.phase}</div>
                      <div className="q-desc">{r.focus.join(' · ')}</div>
                      <div style={{ fontSize: '0.88rem', marginTop: 6, color: 'var(--gold)' }}>⟶ {r.milestone}</div>
                    </motion.div>
                  ))}
                </div>
                <div className="quest" style={{ borderColor: 'rgba(244,63,94,0.5)' }}>
                  <div className="display" style={{ fontSize: '0.7rem', color: 'var(--bad)', letterSpacing: '0.25em' }}>TERMS OF THE SYSTEM</div>
                  <ul style={{ margin: '6px 0 0', paddingLeft: 18, color: 'var(--muted)' }}>
                    <li>Daily quests reset at midnight. Unfinished quests cost XP proportional to what was left undone and reset your streak.</li>
                    <li>A failed day opens the <b style={{ color: '#fecdd3' }}>Penalty Zone</b>: survival objectives within 24 h, XP gain halved. Fail it and lose a level and stats.</li>
                    <li>Weekly quests reset Monday. Failure: heavy XP loss, stat loss and the [Weakened] debuff.</li>
                    {plan.warnings?.map((w) => <li key={w}>{w}</li>)}
                  </ul>
                </div>
              </div>
            )}

            <div className="row spread" style={{ marginTop: 22 }}>
              <button className="btn ghost" disabled={step === 0 || (step === 5 && !plan)} onClick={() => { setPlan(null); setScanLines([]); setStep((s) => Math.max(0, s - 1)); }}>Back</button>
              {step < 5 && <button className="btn primary" disabled={!canNext} onClick={next}>{step === 4 ? 'Generate Directive' : 'Continue'}</button>}
              {plan && <button className="btn primary lg" onClick={accept}>Accept the Terms</button>}
            </div>
          </SystemWindow>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
