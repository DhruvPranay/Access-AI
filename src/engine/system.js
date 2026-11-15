// THE SYSTEM — pure game engine.
// Every exported mutator takes a mutable draft of `game` plus an `out`
// collector ({ notices: [], fx: [] }) and mutates both. The store clones the
// state before calling, so these never touch live React state.

import { LANG_NAME, INTERVIEW_TRACKS } from '../data/options.js';
import { QUIZ_BANK, TRACKS } from '../data/quizzes.js';

// ---------------- Time ----------------
export const DAY = 24 * 60 * 60 * 1000;
export const now = (game) => Date.now() + (game?.timeOffsetMs || 0);
const pad = (n) => String(n).padStart(2, '0');
export function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function weekKey(ts) {
  const d = new Date(ts);
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - dow);
  return dayKey(d.getTime());
}
const keyToTs = (key) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
export const daysBetween = (a, b) => Math.round((keyToTs(b) - keyToTs(a)) / DAY);
export function nextMidnight(ts) { const d = new Date(ts); d.setHours(24, 0, 0, 0); return d.getTime(); }
export function nextMonday(ts) { const d = new Date(keyToTs(weekKey(ts))); d.setDate(d.getDate() + 7); return d.getTime(); }

// ---------------- Levels & ranks ----------------
export const xpToNext = (level) => 100 + (level - 1) * 40;
export const RANKS = [
  { id: 'E', min: 1, name: 'E-Rank', color: '#94a3b8' },
  { id: 'D', min: 5, name: 'D-Rank', color: '#4ade80' },
  { id: 'C', min: 10, name: 'C-Rank', color: '#38bdf8' },
  { id: 'B', min: 18, name: 'B-Rank', color: '#a78bfa' },
  { id: 'A', min: 28, name: 'A-Rank', color: '#f472b6' },
  { id: 'S', min: 40, name: 'S-Rank', color: '#fbbf24' },
];
export function rankFor(level) {
  let r = RANKS[0];
  for (const x of RANKS) if (level >= x.min) r = x;
  return r;
}

export const STATS = [
  { id: 'str', name: 'STR', label: 'Problem Solving', desc: '+2% Gate XP per point above 10' },
  { id: 'agi', name: 'AGI', label: 'Speed', desc: '+2% speed-bonus time window per point' },
  { id: 'int', name: 'INT', label: 'Core CS Knowledge', desc: '+2% Trial XP per point above 10' },
  { id: 'vit', name: 'VIT', label: 'Consistency', desc: '-2% penalty severity per point (max 40%)' },
  { id: 'per', name: 'PER', label: 'Communication', desc: '+2% Interview XP per point above 10' },
];
const statMult = (v) => 1 + Math.max(0, v - 10) * 0.02;
export const vitReduction = (game) => Math.min(0.4, Math.max(0, game.stats.vit - 10) * 0.02);
export const agiFactor = (game) => 1 + Math.max(0, game.stats.agi - 10) * 0.02;

export const TITLES = {
  awakened: { name: 'The Awakened', desc: 'Accepted the System.' },
  gatebreaker: { name: 'Gatebreaker', desc: 'Cleared 10 Gates.' },
  ironwill: { name: 'Iron Will', desc: 'Held a 7-day streak.' },
  survivor: { name: 'Penalty Survivor', desc: 'Escaped the Penalty Zone.' },
  conqueror: { name: 'Weekly Conqueror', desc: 'Completed every weekly quest.' },
  slayer: { name: 'S-Rank Slayer', desc: 'Cleared an S-Rank Gate.' },
  speaker: { name: 'Silver Tongue', desc: 'Scored 75+ in a mock interview.' },
  scholar: { name: 'Scholar', desc: 'Scored 100% in 5 Trials.' },
};

// ---------------- Initial state ----------------
export function createGame(profile, plan) {
  return {
    version: 1,
    awakened: true,
    awakenedAt: Date.now(),
    timeOffsetMs: 0,
    profile,
    plan,
    level: 1,
    maxLevel: 1,
    xp: 0,
    totalXp: 0,
    statPoints: 3,
    stats: { str: 10, agi: 10, int: 10, vit: 10, per: 10 },
    titles: ['awakened'],
    equippedTitle: 'awakened',
    streak: 0,
    bestStreak: 0,
    daily: null,
    weekly: null,
    dailyHistory: [],
    penalty: null,
    debuffs: [],
    log: [],
    solved: {}, // problemId -> { langs: [], firstAt, bestSec }
    customProblems: [],
    quizHistory: [],
    interviewHistory: [],
    counters: { solves: 0, perfectQuizzes: 0, penaltiesSurvived: 0, penaltiesFailed: 0, dailiesDone: 0, weekliesDone: 0 },
  };
}

// ---------------- Helpers ----------------
const notice = (out, kind, title, body) => out.notices.push({ id: Math.random().toString(36).slice(2), kind, title, body });
function log(game, kind, text) {
  game.log.unshift({ t: now(game), kind, text });
  game.log = game.log.slice(0, 80);
}
function hash(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return Math.abs(h); }
const DIFF_ORDER = { Easy: 0, Medium: 1, Hard: 2 };

function quizPool(profile) {
  const pool = new Set();
  for (const t of profile.tracks || []) {
    const def = INTERVIEW_TRACKS.find((x) => x.id === t);
    if (!def?.quiz) continue;
    if (def.quiz === 'languages') (profile.languages || []).forEach((l) => QUIZ_BANK[l] && pool.add(l));
    else def.quiz.forEach((q) => pool.add(q));
  }
  if (!pool.size) ['os', 'dbms', 'oop', ...(profile.languages || []).filter((l) => QUIZ_BANK[l])].forEach((q) => pool.add(q));
  return [...pool];
}
export const trackName = (id) => TRACKS.find((t) => t.id === id)?.name || id;

function mkQuest(id, type, title, desc, target, filter, xp) {
  return { id, type, title, desc, target, progress: 0, filter: filter || {}, xp, seen: [] };
}

// ---------------- Quest generation ----------------
export function generateDaily(game, key) {
  const p = game.profile;
  const m = p.intensity || 2;
  const seed = hash(key + p.name);
  const langs = p.languages?.length ? p.languages : ['python'];
  const lang = langs[seed % langs.length];
  const solveN = m === 1 ? 1 : m === 2 ? 2 : 3;
  const quests = [
    mkQuest('d-solve', 'solve', `Clear ${solveN} Gate${solveN > 1 ? 's' : ''} in ${LANG_NAME[lang]}`, `Solve ${solveN} problem${solveN > 1 ? 's' : ''} you haven't cleared in ${LANG_NAME[lang]} before.`, solveN, { language: lang }, 0),
  ];
  if (m >= 2 || (p.tracks || []).includes('dsa')) {
    quests.push(mkQuest('d-medium', 'solve', 'Clear a C-Rank Gate or higher', 'Solve one Medium or Hard problem in any language.', 1, { minDifficulty: 'Medium' }, 0));
  }
  const pool = quizPool(p);
  const track = pool[(seed >> 3) % pool.length];
  quests.push(mkQuest('d-quiz', 'quiz', `Pass the ${trackName(track)} Trial`, `Score at least 60% in a ${trackName(track)} Knowledge Trial.`, 1, { track, minScore: 60 }, 0));
  const xpTarget = Math.round((m === 1 ? 80 : m === 2 ? 140 : 220) * (1 + Math.min(game.level, 30) * 0.03) / 10) * 10;
  quests.push(mkQuest('d-xp', 'xp', `Absorb ${xpTarget} XP`, 'Earn experience from any source today.', xpTarget, {}, 0));
  return { dayKey: key, quests, completed: false, generatedAt: now(game) };
}

export function generateWeekly(game, key) {
  const p = game.profile;
  const m = p.intensity || 2;
  // A week joined mid-way (e.g. awakening on a Friday) gets proportionally smaller targets.
  const daysLeft = 7 - ((new Date(now(game)).getDay() + 6) % 7);
  const scale = (n) => Math.max(1, Math.round(n * Math.max(0.3, daysLeft / 7)));
  const solveN = scale(5 * m + 2);
  const hardN = scale(m);
  const quizN = scale(3);
  const dailyN = Math.min(5, Math.max(1, daysLeft - 1));
  const quests = [
    mkQuest('w-solve', 'solve', `Clear ${solveN} Gates`, 'New problem/language clears this week.', solveN, {}, 0),
    mkQuest('w-hard', 'solve', `Clear ${hardN} B-Rank+ Gate${hardN > 1 ? 's' : ''}`, 'Medium or Hard problems.', hardN, { minDifficulty: 'Medium' }, 0),
    mkQuest('w-quiz', 'quiz', `Pass ${quizN} Trial${quizN > 1 ? 's' : ''} at 70%+`, 'Any Knowledge Trial track.', quizN, { minScore: 70 }, 0),
    mkQuest('w-daily', 'daily', `Complete ${dailyN} Daily Quest set${dailyN > 1 ? 's' : ''}`, `Finish every daily quest on ${dailyN} day${dailyN > 1 ? 's' : ''} this week.`, dailyN, {}, 0),
  ];
  const ivTracks = (p.tracks || []).filter((t) => INTERVIEW_TRACKS.find((x) => x.id === t)?.interview);
  if (ivTracks.length || !p.tracks?.length) {
    quests.push(mkQuest('w-interview', 'interview', 'Survive a Mock Interview', 'Complete one AI mock interview session (any type).', 1, {}, 0));
  }
  return { weekKey: key, quests, completed: false, generatedAt: now(game) };
}

const questRatio = (qs) => (qs.length ? qs.reduce((a, q) => a + Math.min(1, q.progress / q.target), 0) / qs.length : 1);
export const isDone = (q) => q.progress >= q.target;

// ---------------- XP ----------------
export function xpMultiplier(game, source) {
  let m = 1;
  if (source === 'solve') m *= statMult(game.stats.str);
  if (source === 'quiz') m *= statMult(game.stats.int);
  if (source === 'interview') m *= statMult(game.stats.per);
  const t = now(game);
  for (const d of game.debuffs) if (!d.until || d.until > t) m *= d.mult;
  if (game.penalty?.active) m *= 0.5;
  return m;
}

export function gainXp(game, out, base, source, reason) {
  const amount = Math.max(0, Math.round(base * xpMultiplier(game, source)));
  if (!amount) return 0;
  game.xp += amount;
  game.totalXp += amount;
  while (game.xp >= xpToNext(game.level)) {
    game.xp -= xpToNext(game.level);
    const before = rankFor(game.level);
    game.level += 1;
    // Stat points only for levels never reached before — re-climbing after a
    // penalty de-level must not be a stat farm.
    const fresh = game.level > (game.maxLevel || 1);
    if (fresh) { game.statPoints += 3; game.maxLevel = game.level; }
    const after = rankFor(game.level);
    out.fx.push({ type: 'levelup', level: game.level, fresh, rankUp: before.id !== after.id ? after : null });
    log(game, 'level', `Level up → Lv.${game.level}${before.id !== after.id ? ` · Promoted to ${after.name}` : ''}`);
  }
  if (reason) log(game, 'reward', `+${amount} XP · ${reason}`);
  // XP quests (daily) track positive gains only — but not XP from completing the xp quest itself
  if (source !== 'quest') progressQuests(game, out, { type: 'xp', amount });
  return amount;
}

export function loseXp(game, amount) {
  amount = Math.max(0, Math.round(amount));
  let levelsLost = 0;
  game.xp -= amount;
  while (game.xp < 0 && game.level > 1) {
    game.level -= 1;
    game.xp += xpToNext(game.level);
    levelsLost++;
  }
  if (game.xp < 0) game.xp = 0;
  game.totalXp = Math.max(0, game.totalXp - amount);
  return { amount, levelsLost };
}

function loseStats(game, count) {
  const ids = Object.keys(game.stats).sort((a, b) => game.stats[b] - game.stats[a]); // hit the strongest first
  const hit = [];
  for (let i = 0; i < count; i++) {
    const id = ids[i % ids.length];
    if (game.stats[id] > 5) { game.stats[id] -= 1; hit.push(id.toUpperCase()); }
  }
  return hit;
}

function grantTitle(game, out, id) {
  if (game.titles.includes(id)) return;
  game.titles.push(id);
  notice(out, 'reward', 'Title Acquired', `[${TITLES[id].name}] — ${TITLES[id].desc}`);
  log(game, 'reward', `Title acquired: ${TITLES[id].name}`);
}

// ---------------- Quest progress ----------------
function matches(q, ev) {
  if (q.type === 'xp') return ev.type === 'xp';
  if (q.type !== ev.type) return false;
  const f = q.filter;
  if (ev.type === 'solve') {
    if (!ev.newClear) return false;
    if (f.language && f.language !== ev.language) return false;
    if (f.minDifficulty && DIFF_ORDER[ev.difficulty] < DIFF_ORDER[f.minDifficulty]) return false;
    const tag = `${ev.problemId}:${ev.language}`;
    if (q.seen.includes(tag)) return false;
    q.seen.push(tag);
    return true;
  }
  if (ev.type === 'quiz') {
    if (f.track && f.track !== ev.track) return false;
    if (f.minScore && ev.score < f.minScore) return false;
    return true;
  }
  if (ev.type === 'interview' || ev.type === 'daily') return true;
  return false;
}

function progressQuests(game, out, ev) {
  const groups = [
    ['daily', game.daily],
    ['weekly', game.weekly],
    ['penalty', game.penalty?.active ? game.penalty : null],
  ];
  for (const [kind, set] of groups) {
    if (!set || set.completed) continue;
    let changed = false;
    for (const q of set.quests) {
      if (isDone(q) || !matches(q, ev)) continue;
      q.progress = Math.min(q.target, q.progress + (ev.type === 'xp' ? ev.amount : 1));
      changed = true;
      if (isDone(q)) notice(out, 'quest', kind === 'penalty' ? 'Penalty Objective Cleared' : 'Quest Objective Complete', q.title);
    }
    if (changed && set.quests.every(isDone)) completeSet(game, out, kind);
  }
}

function completeSet(game, out, kind) {
  if (kind === 'daily') {
    game.daily.completed = true;
    game.streak += 1;
    game.bestStreak = Math.max(game.bestStreak, game.streak);
    game.counters.dailiesDone += 1;
    const bonus = 50 + 10 * Math.min(game.streak, 10);
    out.fx.push({ type: 'quest-clear', title: 'DAILY QUEST COMPLETE', sub: `Streak ${game.streak} · +${bonus} XP · +1 Stat Point` });
    game.statPoints += 1;
    gainXp(game, out, bonus, 'quest', 'Daily quests complete');
    if (game.streak >= 7) grantTitle(game, out, 'ironwill');
    progressQuests(game, out, { type: 'daily' });
  } else if (kind === 'weekly') {
    game.weekly.completed = true;
    game.counters.weekliesDone += 1;
    out.fx.push({ type: 'quest-clear', title: 'WEEKLY QUEST COMPLETE', sub: '+300 XP · +3 Stat Points' });
    game.statPoints += 3;
    gainXp(game, out, 300, 'quest', 'Weekly quests complete');
    grantTitle(game, out, 'conqueror');
  } else if (kind === 'penalty') {
    game.penalty.active = false;
    game.penalty.completed = true;
    game.counters.penaltiesSurvived += 1;
    out.fx.push({ type: 'quest-clear', title: 'PENALTY ZONE CLEARED', sub: 'You survived. The debuff has been lifted.' });
    log(game, 'info', 'Survived the Penalty Zone.');
    grantTitle(game, out, 'survivor');
  }
}

// ---------------- Player actions ----------------
export function recordSolve(game, out, { problem, language, seconds }) {
  const rec = game.solved[problem.id] || { langs: [], firstAt: now(game), bestSec: null };
  const newProblem = !game.solved[problem.id];
  const newClear = !rec.langs.includes(language);
  if (newClear) rec.langs.push(language);
  rec.bestSec = rec.bestSec == null ? seconds : Math.min(rec.bestSec, seconds);
  game.solved[problem.id] = rec;

  let xp = 0;
  if (newProblem) xp = problem.xp;
  else if (newClear) xp = Math.round(problem.xp * 0.4);
  let speed = false;
  if (xp && seconds != null && seconds <= problem.timeTarget * 60 * agiFactor(game)) {
    xp = Math.round(xp * 1.25);
    speed = true;
  }
  let gained = 0;
  if (xp) {
    game.counters.solves += 1;
    gained = gainXp(game, out, xp, 'solve', `Gate cleared: ${problem.title} (${LANG_NAME[language] || language})`);
  }
  progressQuests(game, out, { type: 'solve', newClear, language, difficulty: problem.difficulty, problemId: problem.id });
  if (game.counters.solves >= 10) grantTitle(game, out, 'gatebreaker');
  if (problem.rank === 'S' && newProblem) grantTitle(game, out, 'slayer');
  return { gained, speed, newClear, newProblem };
}

export function recordQuiz(game, out, { track, correct, total }) {
  const score = Math.round((correct / Math.max(1, total)) * 100);
  game.quizHistory.unshift({ t: now(game), track, score, correct, total });
  game.quizHistory = game.quizHistory.slice(0, 50);
  const base = correct * 6 + (score >= 60 ? 15 : 0);
  const gained = gainXp(game, out, base, 'quiz', `Trial: ${trackName(track)} ${score}%`);
  if (score === 100) {
    game.counters.perfectQuizzes += 1;
    if (game.counters.perfectQuizzes >= 5) grantTitle(game, out, 'scholar');
  }
  progressQuests(game, out, { type: 'quiz', track, score });
  return { score, gained };
}

export function recordInterview(game, out, { kind, score, verdict }) {
  game.interviewHistory.unshift({ t: now(game), kind, score, verdict });
  game.interviewHistory = game.interviewHistory.slice(0, 30);
  const gained = gainXp(game, out, 40 + score * 1.2, 'interview', `Mock interview (${kind}) scored ${score}`);
  if (score >= 75) grantTitle(game, out, 'speaker');
  progressQuests(game, out, { type: 'interview', kind, score });
  return { gained };
}

export function allocateStat(game, stat) {
  if (game.statPoints <= 0 || !(stat in game.stats)) return;
  game.stats[stat] += 1;
  game.statPoints -= 1;
}

// ---------------- Penalty Zone ----------------
function activatePenaltyZone(game, out, reason) {
  if (game.penalty?.active) return;
  const t = now(game);
  const p = game.profile;
  const pool = quizPool(p);
  game.penalty = {
    active: true,
    reason,
    startedAt: t,
    deadline: t + DAY,
    quests: [
      mkQuest('p-solve', 'solve', 'Survival: Clear 2 Gates', 'Any new clears. Failure is not an option.', 2, {}, 0),
      mkQuest('p-quiz', 'quiz', 'Survival: Pass a Trial at 70%+', `Any track (suggested: ${trackName(pool[0])}).`, 1, { minScore: 70 }, 0),
    ],
  };
  out.fx.push({ type: 'penalty', reason });
  log(game, 'penalty', `PENALTY ZONE activated — ${reason}`);
}

function checkPenaltyExpiry(game, out) {
  const pz = game.penalty;
  if (!pz?.active || now(game) < pz.deadline) return;
  pz.active = false;
  pz.failed = true;
  game.counters.penaltiesFailed += 1;
  const red = 1 - vitReduction(game);
  const { amount, levelsLost } = loseXp(game, (xpToNext(game.level) * 0.8 + 60) * red);
  const hit = loseStats(game, 2);
  game.streak = 0;
  game.debuffs.push({ id: 'cursed', name: 'Cursed', mult: 0.7, until: now(game) + 2 * DAY });
  const body = `You failed to escape the Penalty Zone. −${amount} XP${levelsLost ? `, −${levelsLost} level` : ''}${hit.length ? `, ${hit.join(' ')} −1` : ''}. Debuff [Cursed]: XP ×0.7 for 48h.`;
  notice(out, 'penalty', 'PENALTY ZONE FAILED', body);
  out.fx.push({ type: 'punish', title: 'PENALTY EXECUTED', sub: body });
  log(game, 'penalty', body);
}

// ---------------- Rollover (the System's clock) ----------------
export function tick(game, out) {
  if (!game?.awakened) return;
  const t = now(game);
  const today = dayKey(t);
  const week = weekKey(t);
  game.debuffs = game.debuffs.filter((d) => !d.until || d.until > t);

  checkPenaltyExpiry(game, out);

  // ----- Daily -----
  if (!game.daily) {
    game.daily = generateDaily(game, today);
    notice(out, 'quest', 'Daily Quest Received', 'Your daily training has arrived. Failure to complete it will result in an appropriate penalty.');
  } else if (game.daily.dayKey !== today) {
    const prev = game.daily;
    const ratio = questRatio(prev.quests);
    game.dailyHistory.unshift({ dayKey: prev.dayKey, ratio, completed: prev.completed });
    const missedDays = Math.max(0, daysBetween(prev.dayKey, today) - 1);
    for (let i = 1; i <= Math.min(missedDays, 30); i++) game.dailyHistory.unshift({ dayKey: dayKey(keyToTs(prev.dayKey) + i * DAY), ratio: 0, completed: false });
    game.dailyHistory = game.dailyHistory.slice(0, 90);

    if (!prev.completed || missedDays > 0) {
      const red = 1 - vitReduction(game);
      const base = 40 + 15 * game.level;
      let loss = base * (prev.completed ? 0 : 1 - ratio) * red;
      const absences = Math.min(missedDays, 5);
      loss += absences * base * red;
      const { amount, levelsLost } = loseXp(game, loss);
      const hit = !prev.completed && ratio < 0.34 ? loseStats(game, 1) : absences ? loseStats(game, Math.min(2, absences)) : [];
      game.streak = 0;
      const pct = Math.round(ratio * 100);
      const parts = [];
      if (!prev.completed) parts.push(`Daily quests ${pct}% complete`);
      if (missedDays) parts.push(`${missedDays} day${missedDays > 1 ? 's' : ''} absent`);
      const body = `${parts.join(' · ')}. Penalty: −${amount} XP${levelsLost ? `, −${levelsLost} level${levelsLost > 1 ? 's' : ''}` : ''}${hit.length ? `, ${hit.join(' ')} −1` : ''}. Streak reset.`;
      notice(out, 'penalty', 'Daily Quest Failed', body);
      log(game, 'penalty', body);
      activatePenaltyZone(game, out, parts.join(' · '));
    }
    game.daily = generateDaily(game, today);
    notice(out, 'quest', 'Daily Quest Received', 'A new day. New orders. The System is watching.');
  }

  // ----- Weekly -----
  if (!game.weekly) {
    game.weekly = generateWeekly(game, week);
  } else if (game.weekly.weekKey !== week) {
    const prev = game.weekly;
    if (!prev.completed) {
      const ratio = questRatio(prev.quests);
      const red = 1 - vitReduction(game);
      const { amount, levelsLost } = loseXp(game, (150 + 30 * game.level) * (1 - ratio) * red);
      const hit = ratio < 0.5 ? loseStats(game, 2) : [];
      game.debuffs.push({ id: 'weakened', name: 'Weakened', mult: 0.75, until: now(game) + 3 * DAY });
      const body = `Weekly quests ${Math.round(ratio * 100)}% complete. Penalty: −${amount} XP${levelsLost ? `, −${levelsLost} level` : ''}${hit.length ? `, ${hit.join(' ')} −1` : ''}. Debuff [Weakened]: XP ×0.75 for 3 days.`;
      notice(out, 'penalty', 'Weekly Quest Failed', body);
      out.fx.push({ type: 'punish', title: 'WEEKLY QUEST FAILED', sub: body });
      log(game, 'penalty', body);
    }
    game.weekly = generateWeekly(game, week);
    notice(out, 'quest', 'Weekly Quest Received', 'A new week of trials has begun.');
  }
}

export function snapshot(game) {
  return {
    level: game.level,
    rank: rankFor(game.level).name,
    streak: game.streak,
    stats: game.stats,
    penaltyActive: !!game.penalty?.active,
    debuffs: game.debuffs.map((d) => d.name),
    todayQuests: game.daily?.quests.map((q) => `${q.title} (${Math.min(q.progress, q.target)}/${q.target})`),
    recentDays: game.dailyHistory.slice(0, 7).map((d) => (d.completed ? 'done' : `${Math.round(d.ratio * 100)}%`)),
    solvedCount: Object.keys(game.solved).length,
  };
}
