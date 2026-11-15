import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSystem } from '../store/useSystem.js';
import { PROBLEMS, TOPICS, RANK_ORDER, DIFFICULTY_XP } from '../data/problems.js';
import { RANKS } from '../engine/system.js';
import { LANG_NAME } from '../data/options.js';
import { SystemWindow, Tilt, Spinner } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { sfx } from '../lib/sound.js';

const rankColor = (id) => RANKS.find((r) => r.id === id)?.color || '#38bdf8';

export function fromAiProblem(p) {
  const rank = p.difficulty === 'Easy' ? 'D' : p.difficulty === 'Medium' ? 'B' : 'A';
  return {
    id: `ai-${Date.now().toString(36)}`,
    generated: true,
    title: p.title,
    topic: p.topic,
    difficulty: p.difficulty,
    rank,
    xp: DIFFICULTY_XP[p.difficulty],
    timeTarget: { Easy: 10, Medium: 25, Hard: 40 }[p.difficulty],
    statement: p.statement,
    inputFormat: p.inputFormat,
    outputFormat: p.outputFormat,
    constraints: p.constraints,
    tests: p.tests,
    hints: p.hints,
    editorial: p.hints?.join('\n\n'),
  };
}

export default function Gates() {
  const nav = useNavigate();
  const game = useSystem((s) => s.game);
  const addCustom = useSystem((s) => s.addCustomProblem);
  const pushNotice = useSystem((s) => s.pushNotice);
  const health = useSystem((s) => s.health);
  const [rank, setRank] = useState('ALL');
  const [topic, setTopic] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [q, setQ] = useState('');
  const [summon, setSummon] = useState({ topic: 'Dynamic Programming', difficulty: 'Medium' });
  const [busy, setBusy] = useState(false);

  const all = useMemo(() => [...game.customProblems, ...PROBLEMS], [game.customProblems]);
  const list = all.filter((p) =>
    (rank === 'ALL' || p.rank === rank) &&
    (topic === 'ALL' || p.topic === topic) &&
    (status === 'ALL' || (status === 'CLEARED' ? game.solved[p.id] : !game.solved[p.id])) &&
    (!q || p.title.toLowerCase().includes(q.toLowerCase()) || p.topic.toLowerCase().includes(q.toLowerCase())),
  );

  const doSummon = async () => {
    setBusy(true);
    sfx('boot');
    const r = await api.problem(summon.topic, summon.difficulty, game.profile.goal);
    setBusy(false);
    if (r.offline || !r.tests) {
      pushNotice({ kind: 'penalty', title: 'Summoning Failed', body: r.error ? `AI link unavailable: ${r.error}` : 'The gate collapsed. Try again.' });
      return;
    }
    const p = fromAiProblem(r);
    addCustom(p);
    pushNotice({ kind: 'quest', title: 'A Gate Has Appeared', body: `${p.rank}-Rank Gate: ${p.title}` });
    nav(`/gates/${p.id}`);
  };

  const clearedCount = Object.keys(game.solved).length;

  return (
    <div className="page">
      <div className="row spread wrap" style={{ marginBottom: 20 }}>
        <div>
          <div className="display" style={{ color: 'var(--accent)', letterSpacing: '0.4em', fontSize: '0.75rem' }}>DUNGEON REGISTRY</div>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)' }} className="grad-text">GATES</h1>
          <div className="muted">{clearedCount} cleared · {all.length} detected · new clears grant XP, repeat clears in a new language grant 40%</div>
        </div>
      </div>

      <div className="two-pane">
        <div className="col sticky" style={{ gap: 20 }}>
          <SystemWindow tag="FILTER" title="SCAN">
            <div className="col">
              <input className="input" placeholder="Search gates…" value={q} onChange={(e) => setQ(e.target.value)} />
              <div className="row wrap" style={{ gap: 6 }}>
                {['ALL', ...RANK_ORDER].map((r) => (
                  <span key={r} className={`chip ${rank === r ? 'on' : ''}`} style={r !== 'ALL' ? { color: rankColor(r) } : undefined} onClick={() => setRank(r)}>{r}</span>
                ))}
              </div>
              <select className="input" value={topic} onChange={(e) => setTopic(e.target.value)}>
                <option value="ALL">All topics</option>
                {TOPICS.map((t) => <option key={t}>{t}</option>)}
              </select>
              <div className="row wrap" style={{ gap: 6 }}>
                {['ALL', 'OPEN', 'CLEARED'].map((s) => <span key={s} className={`chip ${status === s ? 'on' : ''}`} onClick={() => setStatus(s)}>{s}</span>)}
              </div>
            </div>
          </SystemWindow>

          <SystemWindow tag="AI · GATE SUMMONING" title="SUMMON A GATE">
            <p className="muted" style={{ marginTop: 0, fontSize: '0.95rem' }}>The System forges an original problem with verified test cases.</p>
            <div className="col">
              <select className="input" value={summon.topic} onChange={(e) => setSummon((s) => ({ ...s, topic: e.target.value }))}>
                {[...TOPICS, 'Greedy', 'Trees', 'Linked Lists', 'Tries', 'Heaps', 'Union Find', 'Strings (Hard)'].filter((v, i, a) => a.indexOf(v) === i).map((t) => <option key={t}>{t}</option>)}
              </select>
              <div className="row" style={{ gap: 6 }}>
                {['Easy', 'Medium', 'Hard'].map((d) => <span key={d} className={`chip ${summon.difficulty === d ? 'on' : ''}`} onClick={() => setSummon((s) => ({ ...s, difficulty: d }))}>{d}</span>)}
              </div>
              <button className="btn primary" disabled={busy || !health?.ai} onClick={doSummon}>{busy ? <Spinner label="FORGING" /> : 'Summon'}</button>
              {!health?.ai && <div className="dim" style={{ fontSize: '0.82rem' }}>Requires the AI link (set GEMINI_API_KEY in .env).</div>}
            </div>
          </SystemWindow>
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {list.map((p, i) => {
            const solved = game.solved[p.id];
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 20, rotateX: -15 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ delay: Math.min(i, 16) * 0.03 }}>
                <Tilt
                  max={9}
                  className={`gate-card ${solved ? 'cleared' : ''}`}
                  style={{ '--rank-color': rankColor(p.rank), height: '100%' }}
                  onClick={() => { sfx('tick'); nav(`/gates/${p.id}`); }}
                  onMouseEnter={() => sfx('hover')}
                >
                  <div className="portal-ring" />
                  <div className="row spread" style={{ alignItems: 'flex-start' }}>
                    <span className="rank-letter">{p.rank}</span>
                    <span className="badge" style={{ color: 'var(--muted)' }}>{p.difficulty.toUpperCase()}</span>
                  </div>
                  <h3 style={{ margin: '14px 0 6px', fontSize: '1rem' }}>{p.title}</h3>
                  <div className="muted" style={{ fontSize: '0.92rem' }}>{p.topic}{p.generated && <span style={{ color: 'var(--gold)' }}> · AI-forged</span>}</div>
                  <div className="row spread" style={{ marginTop: 14, fontSize: '0.85rem' }}>
                    <span className="mono" style={{ color: 'var(--gold)' }}>+{p.xp} XP</span>
                    <span className="dim">⏱ {p.timeTarget}m</span>
                  </div>
                  {solved && <div className="dim" style={{ fontSize: '0.78rem', marginTop: 6 }}>{solved.langs.map((l) => LANG_NAME[l]).join(' · ')}</div>}
                </Tilt>
              </motion.div>
            );
          })}
          {!list.length && <div className="muted">No gates match the scan.</div>}
        </div>
      </div>
    </div>
  );
}
