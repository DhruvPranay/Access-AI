import { motion } from 'framer-motion';
import { Bar } from './ui.jsx';

export default function QuestList({ quests, danger }) {
  return (
    <div className="col" style={{ gap: 10 }}>
      {quests.map((q, i) => {
        const done = q.progress >= q.target;
        return (
          <motion.div
            key={q.id}
            className={`quest ${done ? 'done' : ''}`}
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08 * i }}
            style={danger && !done ? { borderColor: 'rgba(244,63,94,0.45)' } : undefined}
          >
            <div className="row spread" style={{ alignItems: 'flex-start' }}>
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <span className="check">{done ? '✓' : ''}</span>
                <div>
                  <div className="q-title">{q.title}</div>
                  <div className="q-desc">{q.desc}</div>
                </div>
              </div>
              <span className="q-count">[{Math.min(q.progress, q.target)}/{q.target}]</span>
            </div>
            <Bar value={q.progress} max={q.target} style={{ height: 5, marginTop: 10 }} color={done ? 'var(--good)' : undefined} />
          </motion.div>
        );
      })}
    </div>
  );
}
