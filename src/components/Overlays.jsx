import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSystem } from '../store/useSystem.js';

const TAGS = { quest: 'QUEST', reward: 'REWARD', penalty: 'WARNING', info: 'NOTICE', levelup: 'LEVEL UP' };

export function Toasts() {
  const notices = useSystem((s) => s.notices);
  const dismiss = useSystem((s) => s.dismissNotice);
  useEffect(() => {
    if (!notices.length) return undefined;
    const first = notices[0];
    const id = setTimeout(() => dismiss(first.id), first.kind === 'penalty' ? 9000 : 5500);
    return () => clearTimeout(id);
  }, [notices, dismiss]);
  return (
    <div className="toasts">
      <AnimatePresence>
        {notices.map((n) => (
          <motion.div
            key={n.id}
            layout
            className={`toast ${n.kind}`}
            onClick={() => dismiss(n.id)}
            initial={{ opacity: 0, x: 60, rotateY: -30 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            exit={{ opacity: 0, x: 80, transition: { duration: 0.25 } }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          >
            <div className="t-tag">[SYSTEM] · {TAGS[n.kind] || 'NOTICE'}</div>
            <div className="t-title">{n.title}</div>
            {n.body && <div className="t-body">{n.body}</div>}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

function Burst({ color = '#38bdf8', count = 28 }) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {Array.from({ length: count }).map((_, i) => {
        const a = (i / count) * Math.PI * 2;
        const d = 180 + (i % 5) * 60;
        return (
          <motion.span
            key={i}
            style={{ position: 'absolute', left: '50%', top: '50%', width: 4, height: 18, background: color, borderRadius: 2, boxShadow: `0 0 12px ${color}`, rotate: `${(a * 180) / Math.PI + 90}deg` }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
            animate={{ x: Math.cos(a) * d, y: Math.sin(a) * d, opacity: 0, scale: 1.2 }}
            transition={{ duration: 1.3, ease: 'easeOut', delay: 0.15 }}
          />
        );
      })}
    </div>
  );
}

/** Full-screen ceremonies: level up, quest clear, penalty. One at a time. */
export function FxOverlay() {
  const fx = useSystem((s) => s.fx[0]);
  const shift = useSystem((s) => s.shiftFx);
  const nav = useNavigate();
  useEffect(() => {
    if (!fx) return undefined;
    const id = setTimeout(shift, fx.type === 'penalty' || fx.type === 'punish' ? 6500 : 3600);
    return () => clearTimeout(id);
  }, [fx, shift]);

  const red = fx && (fx.type === 'penalty' || fx.type === 'punish');
  return (
    <AnimatePresence>
      {fx && (
        <motion.div
          key={JSON.stringify(fx)}
          className={`overlay ${red ? 'red' : ''}`}
          onClick={shift}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, pointerEvents: 'none', transition: { duration: 0.4 } }}
        >
          <Burst color={red ? '#f43f5e' : fx.type === 'levelup' ? '#fbbf24' : '#38bdf8'} />
          <motion.div
            className="center"
            initial={{ scale: 0.6, opacity: 0, rotateX: 50 }}
            animate={{ scale: 1, opacity: 1, rotateX: 0 }}
            transition={{ type: 'spring', stiffness: 160, damping: 14 }}
            style={{ maxWidth: 720 }}
          >
            {fx.type === 'levelup' && (
              <>
                <div className="display" style={{ letterSpacing: '0.5em', color: 'var(--gold)', fontSize: '0.85rem' }}>[SYSTEM]</div>
                <h1 className="glitch glow-text" data-text="LEVEL UP!" style={{ fontSize: 'clamp(3rem, 10vw, 6.5rem)', margin: '10px 0' }}>LEVEL UP!</h1>
                <div className="display" style={{ fontSize: '1.4rem' }}>LV.{fx.level - 1} → <span style={{ color: 'var(--gold)' }}>LV.{fx.level}</span></div>
                <p className="muted">{fx.fresh === false ? 'Level reclaimed. No stat points are granted for levels already reached.' : '+3 Stat Points available. Allocate them in your Status window.'}</p>
                {fx.rankUp && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="display" style={{ fontSize: '1.6rem', color: fx.rankUp.color, textShadow: `0 0 20px ${fx.rankUp.color}` }}>
                    RANK PROMOTION — {fx.rankUp.name}
                  </motion.div>
                )}
              </>
            )}
            {fx.type === 'quest-clear' && (
              <>
                <div className="display" style={{ letterSpacing: '0.5em', color: 'var(--accent)', fontSize: '0.85rem' }}>[SYSTEM]</div>
                <h1 className="glow-text" style={{ fontSize: 'clamp(2rem, 6vw, 4rem)', margin: '12px 0' }}>{fx.title}</h1>
                <div className="display" style={{ color: 'var(--gold)', letterSpacing: '0.15em' }}>{fx.sub}</div>
              </>
            )}
            {fx.type === 'penalty' && (
              <>
                <div className="display pulse" style={{ letterSpacing: '0.5em', color: 'var(--bad)', fontSize: '0.9rem' }}>[WARNING]</div>
                <h1 className="glitch" data-text="PENALTY ZONE" style={{ fontSize: 'clamp(2.6rem, 9vw, 6rem)', margin: '12px 0', color: '#fecdd3', textShadow: '0 0 24px #f43f5e' }}>PENALTY ZONE</h1>
                <p style={{ fontSize: '1.15rem', color: '#fecdd3' }}>You failed to complete the Daily Quest.<br />{fx.reason}</p>
                <p className="muted">Clear the survival objectives within 24 hours or face a harsher sentence. XP gain is halved until you escape.</p>
                <button className="btn danger" onClick={(e) => { e.stopPropagation(); shift(); nav('/penalty'); }}>Enter the Penalty Zone</button>
              </>
            )}
            {fx.type === 'punish' && (
              <>
                <div className="display pulse" style={{ letterSpacing: '0.5em', color: 'var(--bad)', fontSize: '0.9rem' }}>[SYSTEM]</div>
                <h1 className="glitch" data-text={fx.title} style={{ fontSize: 'clamp(2rem, 7vw, 4.6rem)', margin: '12px 0', color: '#fecdd3', textShadow: '0 0 24px #f43f5e' }}>{fx.title}</h1>
                <p style={{ fontSize: '1.1rem', color: '#fecdd3' }}>{fx.sub}</p>
              </>
            )}
            <p className="dim" style={{ marginTop: 18, fontSize: '0.8rem' }}>click to dismiss</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
