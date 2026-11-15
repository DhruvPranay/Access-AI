import { NavLink, Link } from 'react-router-dom';
import { useSystem } from '../store/useSystem.js';
import { rankFor, xpToNext } from '../engine/system.js';
import { Bar, Hex } from './ui.jsx';

const LINKS = [
  ['/system', 'Status'],
  ['/gates', 'Gates'],
  ['/trials', 'Trials'],
  ['/interview', 'Interview'],
  ['/settings', 'Config'],
];

export default function Nav() {
  const game = useSystem((s) => s.game);
  const health = useSystem((s) => s.health);
  const rank = game ? rankFor(game.level) : null;
  return (
    <nav className="nav">
      <Link to={game ? '/system' : '/'} className="brand">
        <Hex className="hex" />
        <span className="hide-sm">ACCESS&nbsp;AI</span>
      </Link>
      {game && (
        <div className="links">
          {LINKS.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>{label}</NavLink>
          ))}
        </div>
      )}
      <div className="me">
        <span
          className="badge ai-badge"
          title={health?.ai ? `AI online · ${health.model}` : 'AI offline — using the built-in engine'}
          style={{ color: health?.ai ? 'var(--good)' : 'var(--warn)' }}
        >
          ● {health?.ai ? 'AI LINK' : 'OFFLINE ENGINE'}
        </span>
        {game?.penalty?.active && <Link to="/penalty" className="badge pulse" style={{ color: 'var(--bad)' }}>⚠ PENALTY ZONE</Link>}
        {game && (
          <>
            <div className="col" style={{ gap: 4, alignItems: 'flex-end' }}>
              <span className="lvl">
                <span className="name muted">{game.profile.name} · </span>
                <span style={{ color: rank.color }}>{rank.id}</span> · LV.{game.level}
              </span>
              <Bar value={game.xp} max={xpToNext(game.level)} style={{ width: 90, height: 6 }} />
            </div>
          </>
        )}
        {!game && <span className="muted hide-sm" style={{ fontSize: '0.85rem' }}>Unregistered Player</span>}
      </div>
    </nav>
  );
}
