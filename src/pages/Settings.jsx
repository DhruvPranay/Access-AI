import { useNavigate } from 'react-router-dom';
import { useSystem } from '../store/useSystem.js';
import { SystemWindow, useNowTick } from '../components/ui.jsx';
import { DAY } from '../engine/system.js';
import { LANG_NAME } from '../data/options.js';
import { api } from '../lib/api.js';

export default function Settings() {
  const nav = useNavigate();
  const game = useSystem((s) => s.game);
  const settings = useSystem((s) => s.settings);
  const health = useSystem((s) => s.health);
  const setHealth = useSystem((s) => s.setHealth);
  const toggleSound = useSystem((s) => s.toggleSound);
  const toggleMotion = useSystem((s) => s.toggleMotion);
  const timeTravel = useSystem((s) => s.timeTravel);
  const resetTime = useSystem((s) => s.resetTime);
  const hardReset = useSystem((s) => s.hardReset);
  const t = useNowTick(game);

  return (
    <div className="page page-narrow">
      <div style={{ marginBottom: 20 }}>
        <div className="display" style={{ color: 'var(--accent)', letterSpacing: '0.4em', fontSize: '0.75rem' }}>SYSTEM CONFIGURATION</div>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.6rem)' }} className="grad-text">CONFIG</h1>
      </div>
      <div className="col" style={{ gap: 20 }}>
        <SystemWindow tag="PLAYER" title="PROFILE">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
            <div><span className="dim">Name</span><div>{game.profile.name}</div></div>
            <div><span className="dim">Year</span><div>{game.profile.year}</div></div>
            <div style={{ gridColumn: '1 / -1' }}><span className="dim">Goal</span><div>{game.profile.goal}</div></div>
            <div><span className="dim">Languages</span><div>{game.profile.languages.map((l) => LANG_NAME[l]).join(', ')}</div></div>
            <div><span className="dim">Target date</span><div>{game.profile.targetDate}</div></div>
          </div>
          <button className="btn sm" style={{ marginTop: 14 }} onClick={() => nav('/awaken')}>Re-awaken (new profile)</button>
        </SystemWindow>

        <SystemWindow tag="LINK" title="SYSTEM STATUS">
          <div className="col" style={{ gap: 6 }}>
            <div>AI link: <b style={{ color: health?.ai ? 'var(--good)' : 'var(--warn)' }}>{health?.ai ? `ONLINE · ${health.model}` : 'OFFLINE — built-in engine active'}</b></div>
            <div className="row wrap" style={{ gap: 8 }}>
              {['python', 'javascript', 'cpp', 'java', 'c'].map((l) => {
                const rt = ['python', 'javascript'].includes(l) ? 'browser' : health?.runtimes?.[l] || 'none';
                return <span key={l} className="badge" style={{ color: rt === 'none' ? 'var(--bad)' : 'var(--good)' }}>{LANG_NAME[l]} · {rt}</span>;
              })}
            </div>
            <div className="dim" style={{ fontSize: '0.88rem' }}>Set GEMINI_API_KEY (Google) in .env for AI features. C/C++/Java run on the server via local gcc/g++/JDK, or Judge0 (JUDGE0_URL).</div>
            <button className="btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => api.health().then(setHealth)}>Re-scan</button>
          </div>
        </SystemWindow>

        <SystemWindow tag="INTERFACE" title="PREFERENCES">
          <div className="row wrap">
            <button className={`chip ${settings.sound ? 'on' : ''}`} onClick={toggleSound}>Sound effects {settings.sound ? 'ON' : 'OFF'}</button>
            <button className={`chip ${settings.reduceMotion ? 'on' : ''}`} onClick={toggleMotion}>Reduce motion {settings.reduceMotion ? 'ON' : 'OFF'}</button>
          </div>
        </SystemWindow>

        <SystemWindow tag="DEMO · TEMPORAL CONTROL" title="TIME MANIPULATION">
          <p className="muted" style={{ marginTop: 0 }}>Shift the System clock to demonstrate daily/weekly resets and penalties without waiting. Current System time: <span className="mono" style={{ color: '#fff' }}>{new Date(t).toLocaleString()}</span>{game.timeOffsetMs ? <span style={{ color: 'var(--warn)' }}> (+{(game.timeOffsetMs / DAY).toFixed(2)} days)</span> : null}</p>
          <div className="row wrap">
            <button className="btn sm" onClick={() => timeTravel(6 * 3600 * 1000)}>+6 hours</button>
            <button className="btn sm" onClick={() => timeTravel(DAY)}>+1 day</button>
            <button className="btn sm" onClick={() => timeTravel(7 * DAY)}>+1 week</button>
            <button className="btn ghost sm" onClick={resetTime} disabled={!game.timeOffsetMs}>Reset clock</button>
          </div>
          <div className="dim" style={{ fontSize: '0.85rem', marginTop: 8 }}>Note: resetting the clock does not undo penalties already applied.</div>
        </SystemWindow>

        <SystemWindow tag="DANGER" title="ERASE PLAYER">
          <button className="btn danger" onClick={() => { if (confirm('Erase all progress? This cannot be undone.')) { hardReset(); nav('/'); } }}>Erase all progress</button>
        </SystemWindow>
      </div>
    </div>
  );
}
