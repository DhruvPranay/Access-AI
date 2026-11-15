import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useSystem } from './store/useSystem.js';
import { api } from './lib/api.js';
import Nav from './components/Nav.jsx';
import { Toasts, FxOverlay } from './components/Overlays.jsx';
import { Spinner } from './components/ui.jsx';
import Background3D from './three/Background3D.jsx';
import Landing from './pages/Landing.jsx';
import Awaken from './pages/Awaken.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Gates from './pages/Gates.jsx';
import Trials from './pages/Trials.jsx';
import Interview from './pages/Interview.jsx';
import PenaltyZone from './pages/PenaltyZone.jsx';
import Settings from './pages/Settings.jsx';

const Arena = lazy(() => import('./pages/Arena.jsx'));

function RequireGame({ children }) {
  const game = useSystem((s) => s.game);
  return game ? children : <Navigate to="/awaken" replace />;
}

const page = (el) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -12, transition: { duration: 0.18 } }}
    transition={{ duration: 0.35 }}
  >
    {el}
  </motion.div>
);

export default function App() {
  const location = useLocation();
  const game = useSystem((s) => s.game);
  const tick = useSystem((s) => s.tick);
  const setHealth = useSystem((s) => s.setHealth);
  const reduced = useSystem((s) => s.settings.reduceMotion);
  const danger = !!game?.penalty?.active;
  const onLanding = location.pathname === '/';

  // The System's heartbeat: rollovers, penalty deadlines, debuff expiry.
  useEffect(() => {
    tick();
    const id = setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [tick, !!game]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { api.health().then(setHealth); }, [setHealth]);
  useEffect(() => { document.body.classList.toggle('penalty-mode', danger); }, [danger]);
  useEffect(() => { document.body.classList.toggle('reduce-motion', reduced); }, [reduced]);

  return (
    <div className="app-shell">
      {!onLanding && <Background3D danger={danger} reduced={reduced} />}
      <Nav />
      <Toasts />
      <FxOverlay />
      <main style={{ position: 'relative', zIndex: 1 }}>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname.split('/')[1]}>
          <Route path="/" element={game ? <Navigate to="/system" replace /> : <Landing />} />
          <Route path="/awaken" element={page(<Awaken />)} />
          <Route path="/system" element={<RequireGame>{page(<Dashboard />)}</RequireGame>} />
          <Route path="/gates" element={<RequireGame>{page(<Gates />)}</RequireGame>} />
          <Route
            path="/gates/:id"
            element={
              <RequireGame>
                <Suspense fallback={<div className="page"><Spinner label="OPENING GATE" /></div>}>{page(<Arena />)}</Suspense>
              </RequireGame>
            }
          />
          <Route path="/trials" element={<RequireGame>{page(<Trials />)}</RequireGame>} />
          <Route path="/interview" element={<RequireGame>{page(<Interview />)}</RequireGame>} />
          <Route path="/penalty" element={<RequireGame>{page(<PenaltyZone />)}</RequireGame>} />
          <Route path="/settings" element={<RequireGame>{page(<Settings />)}</RequireGame>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
      </main>
    </div>
  );
}
