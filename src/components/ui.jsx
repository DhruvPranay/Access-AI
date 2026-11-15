import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

export function SystemWindow({ tag, title, right, children, className = '', style, delay = 0, ...rest }) {
  return (
    <motion.section
      className={`sys-window ${className}`}
      style={style}
      initial={{ opacity: 0, y: 18, scale: 0.98, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.55, delay, ease: [0.2, 0.9, 0.2, 1] }}
      {...rest}
    >
      <span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" />
      {(tag || title || right) && (
        <header className="sys-head">
          <div className="col" style={{ gap: 4 }}>
            {tag && <span className="tag">{tag}</span>}
            {title && <h2>{title}</h2>}
          </div>
          {right}
        </header>
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </motion.section>
  );
}

/** 3D tilt on hover, following the cursor. */
export function Tilt({ children, max = 10, className = '', style, ...rest }) {
  const ref = useRef(null);
  const [t, setT] = useState({ x: 0, y: 0, gx: 50, gy: 50 });
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    setT({ x: (0.5 - py) * max * 2, y: (px - 0.5) * max * 2, gx: px * 100, gy: py * 100 });
  };
  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={onMove}
      onMouseLeave={() => setT({ x: 0, y: 0, gx: 50, gy: 50 })}
      style={{
        position: 'relative',
        ...style,
        transform: `perspective(900px) rotateX(${t.x}deg) rotateY(${t.y}deg)`,
        transition: 'transform 0.15s ease-out',
      }}
      {...rest}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute', inset: 0, borderRadius: 'inherit', pointerEvents: 'none', zIndex: 0,
          background: `radial-gradient(circle at ${t.gx}% ${t.gy}%, rgba(125,211,252,0.14), transparent 50%)`,
        }}
      />
      {children}
    </div>
  );
}

export function Typewriter({ text, speed = 18, className = '', onDone }) {
  const [n, setN] = useState(0);
  useEffect(() => { setN(0); }, [text]);
  useEffect(() => {
    if (n >= text.length) { onDone?.(); return undefined; }
    const id = setTimeout(() => setN((x) => x + 1), speed);
    return () => clearTimeout(id);
  }, [n, text, speed]); // eslint-disable-line react-hooks/exhaustive-deps
  return <span className={`${className} ${n < text.length ? 'typing' : ''}`}>{text.slice(0, n)}</span>;
}

export function Bar({ value, max, style, color }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className="bar" style={style}>
      <span style={{ width: `${pct}%`, ...(color ? { background: color, boxShadow: `0 0 14px ${color}` } : {}) }} />
    </div>
  );
}

export function useNowTick(game, ms = 1000) {
  const [, setX] = useState(0);
  useEffect(() => { const id = setInterval(() => setX((x) => x + 1), ms); return () => clearInterval(id); }, [ms]);
  return Date.now() + (game?.timeOffsetMs || 0);
}

export function fmtDuration(ms) {
  if (ms <= 0) return '00:00:00';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (x) => String(x).padStart(2, '0');
  return `${d ? d + 'd ' : ''}${p(h)}:${p(m)}:${p(sec)}`;
}

export function Radar({ stats, size = 240, color = 'var(--accent)' }) {
  const keys = Object.keys(stats);
  const max = Math.max(20, ...Object.values(stats)) * 1.1;
  const c = size / 2;
  const r = size / 2 - 28;
  const pt = (i, v) => {
    const a = -Math.PI / 2 + (i / keys.length) * Math.PI * 2;
    return [c + Math.cos(a) * r * v, c + Math.sin(a) * r * v];
  };
  const poly = keys.map((k, i) => pt(i, stats[k] / max).join(',')).join(' ');
  return (
    <svg width="100%" viewBox={`0 0 ${size} ${size}`} style={{ maxWidth: size, overflow: 'visible' }}>
      <defs>
        <radialGradient id="rg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(56,189,248,0.55)" />
          <stop offset="100%" stopColor="rgba(129,140,248,0.15)" />
        </radialGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((s) => (
        <polygon key={s} points={keys.map((_, i) => pt(i, s).join(',')).join(' ')} fill="none" stroke="rgba(96,165,250,0.18)" />
      ))}
      {keys.map((k, i) => { const [x, y] = pt(i, 1); return <line key={k} x1={c} y1={c} x2={x} y2={y} stroke="rgba(96,165,250,0.15)" />; })}
      <motion.polygon points={poly} fill="url(#rg)" stroke={color} strokeWidth="2" initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} style={{ transformOrigin: 'center', filter: 'drop-shadow(0 0 8px rgba(56,189,248,0.8))' }} />
      {keys.map((k, i) => {
        const [x, y] = pt(i, 1.17);
        return (
          <text key={k} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="#cfe7ff" fontFamily="Orbitron" fontSize="11" letterSpacing="2">
            {k.toUpperCase()} {stats[k]}
          </text>
        );
      })}
    </svg>
  );
}

export function Spinner({ label = 'PROCESSING' }) {
  return (
    <span className="row" style={{ gap: 10 }}>
      <motion.span
        style={{ width: 16, height: 16, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block' }}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
      />
      <span className="display pulse" style={{ fontSize: '0.7rem', letterSpacing: '0.25em', color: 'var(--accent)' }}>{label}</span>
    </span>
  );
}

export function Hex({ className }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none">
      <polygon points="32,4 58,18 58,46 32,60 6,46 6,18" stroke="var(--accent)" strokeWidth="4" />
      <polygon points="32,16 46,24 46,40 32,48 18,40 18,24" fill="var(--accent)" opacity="0.35" />
    </svg>
  );
}
