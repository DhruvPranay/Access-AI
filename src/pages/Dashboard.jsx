import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSystem } from '../store/useSystem.js';
import { SystemWindow, Bar, Radar, Tilt, Typewriter, useNowTick, fmtDuration } from '../components/ui.jsx';
import QuestList from '../components/QuestList.jsx';
import RankCrystal from '../three/RankCrystal.jsx';
import { rankFor, xpToNext, STATS, TITLES, nextMidnight, nextMonday, dayKey, snapshot, vitReduction, xpMultiplier, DAY } from '../engine/system.js';
import { api } from '../lib/api.js';

function useBriefing(game) {
  const key = `access-ai-brief:${game.daily?.dayKey}`;
  const [text, setText] = useState(() => { try { return sessionStorage.getItem(key); } catch { return null; } });
  useEffect(() => {
    if (text) return;
    let alive = true;
    api.briefing({ name: game.profile.name, goal: game.profile.goal }, snapshot(game)).then((r) => {
      const local = game.penalty?.active
        ? `[WARNING] Player ${game.profile.name}, you are inside the Penalty Zone. Clear the survival objectives before the deadline, or lose a level.`
        : game.streak >= 3
          ? `[NOTICE] ${game.streak}-day streak maintained. Level ${game.level}. The System acknowledges your discipline — do not break it today.`
          : `[NOTICE] Player ${game.profile.name}: Level ${game.level}, ${rankFor(game.level).name}. Today's quests have been issued. Complete them before midnight.`;
      const msg = r.offline || !r.message ? local : r.message;
      if (!alive) return;
      setText(msg);
      try { sessionStorage.setItem(key, msg); } catch { /* ignore */ }
    });
    return () => { alive = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return text;
}

function Heatmap({ history, today }) {
  const days = useMemo(() => {
    const map = Object.fromEntries(history.map((h) => [h.dayKey, h]));
    const out = [];
    for (let i = 27; i >= 0; i--) {
      const k = dayKey(today - i * DAY);
      const h = map[k];
      out.push({ k, cls: !h ? '' : h.completed ? 'l3' : h.ratio >= 0.5 ? 'l2' : 'l1' });
    }
    return out;
  }, [history, today]);
  return <div className="heat">{days.map((d) => <span key={d.k} className={d.cls} title={d.k} />)}</div>;
}

export default function Dashboard() {
  const game = useSystem((s) => s.game);
  const allocate = useSystem((s) => s.allocateStat);
  const equip = useSystem((s) => s.equipTitle);
  const t = useNowTick(game);
  const brief = useBriefing(game);
  const rank = rankFor(game.level);
  const need = xpToNext(game.level);
  const plan = game.plan;
  const weeksIn = Math.floor((t - game.awakenedAt) / (7 * DAY));
  let acc = 0;
  const phaseIdx = plan?.roadmap ? Math.max(0, plan.roadmap.findIndex((r) => { acc += r.weeks; return weeksIn < acc; })) : 0;
  const mult = xpMultiplier(game, 'none');

  return (
    <div className="page">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', alignItems: 'start' }}>
        {/* ---------- STATUS ---------- */}
        <div className="col" style={{ gap: 20 }}>
          <SystemWindow tag="STATUS" title={game.profile.name.toUpperCase()} right={<span className="badge" style={{ color: rank.color }}>{rank.name}</span>}>
            <div className="row" style={{ alignItems: 'stretch', gap: 16 }}>
              <div style={{ position: 'relative', width: 150, height: 170, flex: 'none' }}>
                <RankCrystal color={rank.color} />
                <div className="rank-letter" style={{ '--rank-color': rank.color, position: 'absolute', bottom: 0, left: 0, right: 0, textAlign: 'center', fontSize: '1.3rem' }}>{rank.id}-RANK</div>
              </div>
              <div className="col" style={{ flex: 1, gap: 8, justifyContent: 'center' }}>
                <div className="kpi"><span className="k">Level</span><span className="v" style={{ fontSize: '2.6rem' }}>{game.level}</span></div>
                <div>
                  <div className="row spread mono" style={{ fontSize: '0.8rem' }}><span className="muted">EXP</span><span>{game.xp} / {need}</span></div>
                  <Bar value={game.xp} max={need} />
                </div>
                <div style={{ fontSize: '0.92rem' }}>
                  <span className="muted">Title: </span>
                  <select className="input" style={{ display: 'inline-block', width: 'auto', padding: '2px 8px', fontSize: '0.9rem' }} value={game.equippedTitle} onChange={(e) => equip(e.target.value)}>
                    {game.titles.map((id) => <option key={id} value={id}>{TITLES[id]?.name}</option>)}
                  </select>
                </div>
                <div className="muted" style={{ fontSize: '0.92rem' }}>Job: <span style={{ color: '#fff' }}>{plan?.playerClass || 'None'}</span></div>
              </div>
            </div>
            <div className="divider" />
            <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              <div className="kpi"><span className="v">{game.streak}</span><span className="k">Streak</span></div>
              <div className="kpi"><span className="v">{Object.keys(game.solved).length}</span><span className="k">Gates</span></div>
              <div className="kpi"><span className="v">{game.totalXp}</span><span className="k">Total XP</span></div>
              <div className="kpi"><span className="v" style={{ color: mult < 1 ? 'var(--bad)' : undefined }}>×{mult.toFixed(2)}</span><span className="k">XP Rate</span></div>
            </div>
          </SystemWindow>

          <SystemWindow tag="ATTRIBUTES" title="STATS" right={game.statPoints > 0 && <span className="badge pulse" style={{ color: 'var(--gold)' }}>{game.statPoints} POINTS</span>} delay={0.08}>
            <div className="row wrap" style={{ alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 220 }}><Radar stats={game.stats} size={220} /></div>
              <div className="col" style={{ flex: 1, minWidth: 200, gap: 8 }}>
                {STATS.map((s) => (
                  <div key={s.id} className="row spread" title={s.desc}>
                    <div>
                      <span className="display" style={{ color: 'var(--accent)', fontSize: '0.85rem' }}>{s.name}</span>{' '}
                      <span className="muted" style={{ fontSize: '0.9rem' }}>{s.label}</span>
                    </div>
                    <div className="row" style={{ gap: 8 }}>
                      <span className="mono">{game.stats[s.id]}</span>
                      <button className="btn sm" disabled={game.statPoints <= 0} onClick={() => allocate(s.id)}>+</button>
                    </div>
                  </div>
                ))}
                <div className="dim" style={{ fontSize: '0.8rem' }}>VIT currently reduces penalties by {Math.round(vitReduction(game) * 100)}%.</div>
              </div>
            </div>
          </SystemWindow>
        </div>

        {/* ---------- QUESTS ---------- */}
        <div className="col" style={{ gap: 20 }}>
          {game.penalty?.active && (
            <Tilt max={4} className="sys-window" style={{ borderColor: 'var(--bad)', boxShadow: '0 0 40px rgba(244,63,94,0.35)' }}>
              <div className="row spread">
                <div>
                  <div className="display pulse" style={{ color: 'var(--bad)', letterSpacing: '0.3em', fontSize: '0.75rem' }}>⚠ PENALTY ZONE ACTIVE</div>
                  <div className="display" style={{ fontSize: '1.6rem', margin: '6px 0' }}>{fmtDuration(game.penalty.deadline - t)}</div>
                  <div className="muted" style={{ fontSize: '0.9rem' }}>{game.penalty.reason}</div>
                </div>
                <Link to="/penalty" className="btn danger">Enter</Link>
              </div>
            </Tilt>
          )}

          <SystemWindow
            tag="QUEST INFO"
            title="DAILY QUEST"
            right={<div className="col" style={{ alignItems: 'flex-end', gap: 0 }}><span className="dim" style={{ fontSize: '0.7rem', letterSpacing: '0.2em' }}>RESETS IN</span><span className="mono" style={{ color: game.daily?.completed ? 'var(--good)' : 'var(--warn)' }}>{fmtDuration(nextMidnight(t) - t)}</span></div>}
            delay={0.05}
          >
            {game.daily?.completed && <div className="badge" style={{ color: 'var(--good)', marginBottom: 12 }}>✓ ALL DAILY QUESTS COMPLETE — REWARD CLAIMED</div>}
            {game.daily && <QuestList quests={game.daily.quests} />}
            {!game.daily?.completed && (
              <p className="dim" style={{ fontSize: '0.85rem', marginBottom: 0 }}>
                WARNING: Failure to complete the daily quest will result in an appropriate penalty (≈ −{Math.round((40 + 15 * game.level) * (1 - vitReduction(game)))} XP at 0%, streak reset, Penalty Zone).
              </p>
            )}
            <div className="row wrap" style={{ marginTop: 12 }}>
              <Link className="btn primary sm" to="/gates">Enter Gates</Link>
              <Link className="btn sm" to="/trials">Take a Trial</Link>
            </div>
          </SystemWindow>

          <SystemWindow
            tag="QUEST INFO"
            title="WEEKLY QUEST"
            right={<div className="col" style={{ alignItems: 'flex-end', gap: 0 }}><span className="dim" style={{ fontSize: '0.7rem', letterSpacing: '0.2em' }}>RESETS IN</span><span className="mono" style={{ color: 'var(--accent)' }}>{fmtDuration(nextMonday(t) - t)}</span></div>}
            delay={0.12}
          >
            {game.weekly?.completed && <div className="badge" style={{ color: 'var(--good)', marginBottom: 12 }}>✓ WEEKLY QUEST COMPLETE</div>}
            {game.weekly && <QuestList quests={game.weekly.quests} />}
          </SystemWindow>

          {game.debuffs.length > 0 && (
            <SystemWindow tag="STATUS EFFECTS" title="DEBUFFS">
              {game.debuffs.map((d) => (
                <div key={d.id + d.until} className="row spread" style={{ color: '#fecdd3' }}>
                  <span>☠ [{d.name}] XP ×{d.mult}</span>
                  <span className="mono dim">{fmtDuration(d.until - t)}</span>
                </div>
              ))}
            </SystemWindow>
          )}
        </div>

        {/* ---------- INTEL ---------- */}
        <div className="col" style={{ gap: 20 }}>
          <SystemWindow tag="SYSTEM MESSAGE" title="DAILY BRIEFING" delay={0.1}>
            <p style={{ margin: 0, fontSize: '1.05rem', minHeight: 60 }}>{brief ? <Typewriter text={brief} speed={14} /> : <span className="pulse muted">Receiving transmission…</span>}</p>
          </SystemWindow>

          {plan?.roadmap && (
            <SystemWindow tag="DIRECTIVE" title="ROADMAP" delay={0.16}>
              <div className="dim" style={{ fontSize: '0.9rem', marginBottom: 10 }}>Goal: <span style={{ color: '#fff' }}>{game.profile.goal}</span></div>
              <div className="col" style={{ gap: 10 }}>
                {plan.roadmap.map((r, i) => (
                  <motion.div key={r.phase} className={`quest ${i < phaseIdx ? 'done' : ''}`} style={i === phaseIdx ? { borderColor: 'var(--accent)', boxShadow: 'var(--glow)' } : { opacity: i > phaseIdx ? 0.6 : 1 }} initial={{ opacity: 0 }} animate={{ opacity: i > phaseIdx ? 0.6 : 1 }}>
                    <div className="row spread">
                      <span className="q-title" style={{ fontSize: '0.98rem' }}>{r.phase}</span>
                      {i === phaseIdx && <span className="badge" style={{ color: 'var(--accent)' }}>CURRENT</span>}
                    </div>
                    <div className="q-desc">{r.focus.join(' · ')}</div>
                  </motion.div>
                ))}
              </div>
            </SystemWindow>
          )}

          <SystemWindow tag="RECORD" title="LAST 28 DAYS" delay={0.2}>
            <Heatmap history={game.dailyHistory} today={t} />
            <div className="row" style={{ gap: 14, marginTop: 10, fontSize: '0.8rem' }}>
              <span className="row" style={{ gap: 6 }}><span className="heat"><span className="l3" style={{ width: 12 }} /></span> complete</span>
              <span className="row" style={{ gap: 6 }}><span className="heat"><span className="l2" style={{ width: 12 }} /></span> partial</span>
              <span className="row" style={{ gap: 6 }}><span className="heat"><span className="l1" style={{ width: 12 }} /></span> failed</span>
            </div>
          </SystemWindow>

          <SystemWindow tag="LOG" title="SYSTEM LOG" delay={0.24}>
            <div style={{ maxHeight: 260, overflow: 'auto' }}>
              {game.log.length === 0 && <div className="dim">No entries yet. Go clear a Gate.</div>}
              {game.log.slice(0, 30).map((l, i) => (
                <div key={i} className="log-item">
                  <span className="k" style={{ color: l.kind === 'penalty' ? 'var(--bad)' : l.kind === 'level' ? 'var(--gold)' : l.kind === 'reward' ? 'var(--good)' : 'var(--accent)' }}>{l.kind.toUpperCase()}</span>
                  <span>{l.text}</span>
                </div>
              ))}
            </div>
          </SystemWindow>
        </div>
      </div>
    </div>
  );
}
