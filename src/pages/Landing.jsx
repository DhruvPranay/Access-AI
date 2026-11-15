import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PortalScene from '../three/PortalScene.jsx';
import { Tilt, Typewriter } from '../components/ui.jsx';
import { RANKS } from '../engine/system.js';
import { sfx } from '../lib/sound.js';

const FEATURES = [
  { icon: '◆', title: 'Personal System', body: 'Declare your goal, languages and interview rounds. The System builds an AI roadmap and binds you to it.' },
  { icon: '⚔', title: 'Daily & Weekly Quests', body: 'Concrete, trackable orders every day and every week — tuned to your intensity and target companies.' },
  { icon: '☠', title: 'Real Penalties', body: 'Miss a quest and lose XP, levels and stats. Fail badly and you are dragged into the Penalty Zone.' },
  { icon: '⌘', title: 'Gates + Live IDE', body: '27 hand-built Gates (E → S rank) plus infinite AI-generated ones. Code in Python, JS, C++, Java or C.' },
  { icon: '✦', title: 'AI Mentor', body: 'Progressive hints that never spoil, interview-grade code reviews with Big-O, and generated Trials.' },
  { icon: '◉', title: 'Mock Interviews', body: 'Face an AI interviewer for DSA, Core CS, System Design, language deep-dives or HR — then get scored.' },
];

const STEPS = [
  ['01', 'AWAKEN', 'Register your goal, languages, interview tracks and target date.'],
  ['02', 'RECEIVE', 'The System issues daily + weekly quests and an AI roadmap.'],
  ['03', 'HUNT', 'Clear Gates, pass Trials, survive interviews. Earn XP, levels, stats, titles.'],
  ['04', 'OR SUFFER', 'Unfinished quests are punished at midnight. No exceptions.'],
];

export default function Landing() {
  const nav = useNavigate();
  const hover = useRef(false);
  const [entering, setEntering] = useState(false);

  const enter = () => {
    sfx('boot');
    setEntering(true);
    hover.current = true;
    setTimeout(() => nav('/awaken'), 900);
  };

  return (
    <div>
      <section style={{ position: 'relative', height: '100vh', minHeight: 640, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <PortalScene hover={hover} />
        </div>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none', padding: '0 16px' }}>
          <div className="center" style={{ maxWidth: 900 }}>
            <motion.div initial={{ opacity: 0, letterSpacing: '1.2em' }} animate={{ opacity: 1, letterSpacing: '0.5em' }} transition={{ duration: 1.4 }} className="display" style={{ color: 'var(--accent)', fontSize: '0.8rem' }}>
              [SYSTEM NOTIFICATION]
            </motion.div>
            <motion.h1
              className="glitch glow-text"
              data-text="ACCESS AI"
              initial={{ opacity: 0, scale: 1.3, filter: 'blur(14px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 1.1, delay: 0.3 }}
              style={{ fontSize: 'clamp(2.4rem, 9vw, 8rem)', fontWeight: 900, margin: '14px 0 6px', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}
            >
              ACCESS AI
            </motion.h1>
            <div style={{ fontSize: 'clamp(1.05rem, 2.4vw, 1.45rem)', minHeight: '2.2em', color: '#e0f2fe', fontWeight: 600, textShadow: '0 0 6px #02040c, 0 0 18px #02040c, 0 2px 4px #000' }}>
              <Typewriter speed={28} text="You have been selected as a Player. Complete the System's quests to become placement-ready." />
            </div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.6 }} className="row wrap" style={{ justifyContent: 'center', marginTop: 28, pointerEvents: 'auto' }}>
              <button
                className="btn primary lg"
                onMouseEnter={() => { hover.current = true; sfx('hover'); }}
                onMouseLeave={() => { if (!entering) hover.current = false; }}
                onClick={enter}
              >
                {entering ? 'Synchronising…' : 'Accept · Awaken'}
              </button>
              <a className="btn ghost lg" href="#how" onMouseEnter={() => sfx('hover')}>How it works</a>
            </motion.div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.2 }} className="dim" style={{ marginTop: 16, fontSize: '0.85rem' }}>
              Declining is not an option. (It is. But the System will remember.)
            </motion.p>
          </div>
        </div>
        {entering && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9 }} style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle, #e0f2fe 0%, #38bdf8 30%, #02040c 75%)', mixBlendMode: 'screen' }} />}
      </section>

      <section id="how" className="page" style={{ paddingTop: 80 }}>
        <div className="center" style={{ marginBottom: 40 }}>
          <div className="display" style={{ color: 'var(--accent)', letterSpacing: '0.4em', fontSize: '0.75rem' }}>SYSTEM MODULES</div>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', marginTop: 10 }} className="grad-text">Your placement prep, gamified to the bone.</h1>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {FEATURES.map((f, i) => (
            <motion.div key={f.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
              <Tilt className="sys-window" style={{ height: '100%' }}>
                <span className="corner tl" /><span className="corner br" />
                <div style={{ fontSize: '2rem', color: 'var(--accent)', textShadow: 'var(--glow)' }}>{f.icon}</div>
                <h3 style={{ margin: '10px 0 8px' }}>{f.title}</h3>
                <p className="muted" style={{ margin: 0 }}>{f.body}</p>
              </Tilt>
            </motion.div>
          ))}
        </div>

        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', marginTop: 60 }}>
          {STEPS.map(([n, t, b], i) => (
            <motion.div key={n} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }} style={{ borderLeft: `2px solid ${i === 3 ? 'var(--bad)' : 'var(--accent)'}`, paddingLeft: 16 }}>
              <div className="display" style={{ fontSize: '2.4rem', color: i === 3 ? 'var(--bad)' : 'var(--accent)', opacity: 0.8 }}>{n}</div>
              <div className="display" style={{ letterSpacing: '0.3em', margin: '4px 0' }}>{t}</div>
              <div className="muted">{b}</div>
            </motion.div>
          ))}
        </div>

        <div className="center" style={{ marginTop: 70 }}>
          <div className="display muted" style={{ letterSpacing: '0.4em', fontSize: '0.75rem', marginBottom: 18 }}>RANK LADDER</div>
          <div className="row wrap" style={{ justifyContent: 'center', gap: 18 }}>
            {RANKS.map((r, i) => (
              <motion.div key={r.id} initial={{ opacity: 0, scale: 0.5 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1, type: 'spring' }} className="center">
                <div className="rank-letter float" style={{ '--rank-color': r.color, fontSize: '3rem', animationDelay: `${i * 0.4}s` }}>{r.id}</div>
                <div className="dim" style={{ fontSize: '0.8rem' }}>Lv.{r.min}+</div>
              </motion.div>
            ))}
          </div>
          <button className="btn primary lg" style={{ marginTop: 40 }} onClick={enter}>Begin the Awakening</button>
        </div>
      </section>
    </div>
  );
}
