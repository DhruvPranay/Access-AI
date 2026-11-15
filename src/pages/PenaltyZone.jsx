import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSystem } from '../store/useSystem.js';
import { SystemWindow, useNowTick, fmtDuration } from '../components/ui.jsx';
import QuestList from '../components/QuestList.jsx';

export default function PenaltyZone() {
  const game = useSystem((s) => s.game);
  const t = useNowTick(game);
  const pz = game.penalty;

  if (!pz?.active) {
    return (
      <div className="page page-narrow">
        <SystemWindow tag="PENALTY ZONE" title={pz?.completed ? 'ESCAPED' : pz?.failed ? 'SENTENCE EXECUTED' : 'NO ACTIVE PENALTY'}>
          <p className="muted" style={{ marginTop: 0 }}>
            {pz?.completed ? 'You survived the Penalty Zone. The System has lifted the debuff.' : pz?.failed ? 'You failed to escape. The penalty has been applied to your status.' : 'Complete your daily quests to stay out of here.'}
          </p>
          <Link to="/system" className="btn">Return to Status</Link>
        </SystemWindow>
      </div>
    );
  }

  const left = pz.deadline - t;
  const frac = Math.max(0, Math.min(1, left / (pz.deadline - pz.startedAt)));
  return (
    <div className="page page-narrow">
      <div className="center" style={{ marginBottom: 24 }}>
        <motion.div className="display pulse" style={{ color: 'var(--bad)', letterSpacing: '0.6em', fontSize: '0.85rem' }}>[WARNING]</motion.div>
        <h1 className="glitch" data-text="PENALTY ZONE" style={{ fontSize: 'clamp(2.6rem, 9vw, 5.5rem)', color: '#fecdd3', textShadow: '0 0 30px #f43f5e', margin: '10px 0' }}>PENALTY ZONE</h1>
        <div className="muted">{pz.reason}</div>
      </div>

      <div style={{ display: 'grid', placeItems: 'center', marginBottom: 24 }}>
        <svg width="240" height="240" viewBox="0 0 240 240">
          <circle cx="120" cy="120" r="100" stroke="rgba(244,63,94,0.15)" strokeWidth="10" fill="none" />
          <motion.circle cx="120" cy="120" r="100" stroke="#f43f5e" strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray={2 * Math.PI * 100} strokeDashoffset={2 * Math.PI * 100 * (1 - frac)} transform="rotate(-90 120 120)" style={{ filter: 'drop-shadow(0 0 10px #f43f5e)' }} />
          <text x="120" y="112" textAnchor="middle" fill="#fecdd3" fontFamily="Orbitron" fontSize="24">{fmtDuration(left)}</text>
          <text x="120" y="142" textAnchor="middle" fill="#fb7185" fontFamily="Orbitron" fontSize="10" letterSpacing="4">UNTIL EXECUTION</text>
        </svg>
      </div>

      <SystemWindow tag="SURVIVAL OBJECTIVES" title="ESCAPE CONDITIONS">
        <QuestList quests={pz.quests} danger />
        <div className="divider" />
        <ul className="muted" style={{ margin: 0, paddingLeft: 18 }}>
          <li>While inside the Penalty Zone all XP gain is halved.</li>
          <li>Failure to escape before the timer ends: <b style={{ color: '#fecdd3' }}>≈ one level of XP lost, −1 to your two strongest stats, streak reset, and [Cursed] (XP ×0.7 for 48h).</b></li>
          <li>Higher VIT reduces penalty severity.</li>
        </ul>
        <div className="row wrap" style={{ marginTop: 16 }}>
          <Link className="btn danger" to="/gates">Enter Gates</Link>
          <Link className="btn danger" to="/trials">Take a Trial</Link>
        </div>
      </SystemWindow>
    </div>
  );
}
