// Offline engine — deterministic stand-ins for the AI features so the
// System keeps working without an API key or network.
import { LANG_NAME, INTERVIEW_TRACKS } from '../data/options.js';

export function localPlan(profile) {
  const weeksLeft = profile.targetDate
    ? Math.max(4, Math.round((new Date(profile.targetDate) - Date.now()) / (7 * 864e5)))
    : 12;
  const tracks = profile.tracks || [];
  const langs = (profile.languages || []).map((l) => LANG_NAME[l]).join(', ') || 'your chosen language';
  const w = (f) => Math.max(1, Math.round(weeksLeft * f));
  const roadmap = [
    { phase: 'Phase I — Foundation', weeks: w(0.25), focus: ['Arrays & Strings', 'Hashing', `${langs} fluency`, 'Complexity analysis'], milestone: 'Clear every E-Rank and D-Rank Gate.' },
    { phase: 'Phase II — Patterns', weeks: w(0.3), focus: ['Two Pointers & Sliding Window', 'Stacks & Queues', 'Binary Search', 'Sorting'], milestone: 'Clear 8 C-Rank Gates in under target time.' },
    { phase: 'Phase III — Depth', weeks: w(0.3), focus: ['Dynamic Programming', 'Graphs (BFS/DFS)', 'Backtracking', ...(tracks.includes('core') ? ['OS · DBMS · CN revision'] : [])], milestone: 'Clear B-Rank and A-Rank Gates; pass 3 Trials at 80%+.' },
    { phase: 'Phase IV — Interview Simulation', weeks: w(0.15), focus: ['Timed mock interviews', 'Explaining solutions aloud', ...(tracks.includes('hr') ? ['STAR stories'] : []), 'Revision of weak stats'], milestone: 'Score 75+ in two mock interviews.' },
  ];
  return {
    title: 'The Unawakened Hunter',
    playerClass: tracks.includes('system') ? 'Architect Initiate' : tracks.includes('core') ? 'Fundamentals Knight' : 'Algorithm Hunter',
    directive: `[SYSTEM] Goal registered: "${profile.goal}". You have ${weeksLeft} weeks. Daily quests will be issued at 00:00. Failure will be punished. Your ascent begins now, Player.`,
    roadmap,
    focusTopics: ['Arrays', 'Hashing', 'Two Pointers', 'Sliding Window', 'Binary Search', 'Stacks', 'Dynamic Programming', 'Graphs', ...(tracks.includes('core') ? ['Operating Systems', 'DBMS'] : [])],
    dailyRitual: ['Clear your daily Gates before anything else', 'Explain one solution aloud as if in an interview', 'Revise one Core CS concept for 15 minutes', 'Log your mistakes — the System does.'],
    warnings: ['Reading solutions is not the same as solving. The System counts only clears.', 'Skipping days compounds. Absence is penalised per day.', 'Interviews test communication — not just code.'],
    offline: true,
  };
}

const OFFLINE_INTERVIEW = {
  dsa: [
    'Given an array of integers, how would you find the length of the longest consecutive sequence in O(n)? Walk me through your approach.',
    'What is the difference between BFS and DFS? When would you choose one over the other?',
    'How would you detect a cycle in a linked list? What is the space complexity of your approach?',
    'Explain how a hash map handles collisions. What happens to lookup time in the worst case?',
    'Describe how you would find the k most frequent elements in an array.',
    'Your solution passes small tests but times out on large ones. How do you debug and optimise it?',
  ],
  core: [
    'What is the difference between a process and a thread?',
    'Explain deadlock and the four necessary conditions. How can it be prevented?',
    'What are ACID properties? Give an example of each.',
    'Explain normalization up to 3NF with an example.',
    'What happens when you type a URL into a browser and press Enter?',
    'Explain the difference between TCP and UDP and when you would use each.',
  ],
  hr: [
    'Tell me about yourself.',
    'Describe a time you faced a difficult bug or problem. How did you resolve it?',
    'Tell me about a time you worked in a team and there was a disagreement.',
    'What is a project you are most proud of, and what was your specific contribution?',
    'Why do you want to work at this company?',
    'Where do you see yourself in three years?',
  ],
  system: [
    'Design a URL shortener. What are the core requirements?',
    'What APIs would your URL shortener expose?',
    'How would you generate unique short codes? What about collisions?',
    'How would you store the data? Which database would you choose and why?',
    'The service goes viral. How do you scale reads?',
    'How would you add analytics (click counts) without slowing down redirects?',
  ],
  lang: [
    'Explain the difference between pass-by-value and pass-by-reference in your primary language.',
    'How does memory management / garbage collection work in your language?',
    'What are the trade-offs between arrays/lists and linked structures in your language?',
    'Explain one tricky language feature (closures, generics, templates, decorators…) with an example.',
    'How does your language handle exceptions or errors?',
    'What would you do to make a slow program in your language faster?',
  ],
};

export function offlineQuestion(kind, index) {
  const list = OFFLINE_INTERVIEW[kind] || OFFLINE_INTERVIEW.dsa;
  if (index === 0) return `Hi! Let's begin. Answer each question the way you would explain it out loud in a real interview.\n\nQ1. ${list[0]}`;
  if (index >= list.length) return "That's all the questions I have. You can end the interview now to see your evaluation.";
  return `Q${index + 1}. ${list[index]}`;
}

export function offlineEvaluate(kind, messages) {
  const answers = messages.filter((m) => m.role === 'user').map((m) => m.content.trim());
  const words = answers.reduce((a, s) => a + s.split(/\s+/).filter(Boolean).length, 0);
  const avg = answers.length ? words / answers.length : 0;
  const coverage = Math.min(1, answers.length / 6);
  const depth = Math.min(1, avg / 60);
  const score = Math.round(15 + 55 * coverage * (0.4 + 0.6 * depth) + 15 * depth);
  return {
    score: Math.min(85, score),
    verdict: `${score >= 70 ? 'Lean hire' : score >= 50 ? 'Borderline' : 'No hire'} (offline estimate, based on how many questions you answered and how detailed your answers were).`,
    strengths: answers.length >= 4 ? ['Stayed through most of the interview'] : ['Started the interview'],
    improvements: [avg < 40 ? 'Answers are short — explain your reasoning step by step.' : 'Structure answers: approach → trade-offs → complexity.', 'Connect AI for an accurate, content-aware evaluation.'],
    nextSteps: ['Retry this interview type next week', 'Clear Gates on topics you struggled to explain'],
    offline: true,
  };
}
export const interviewKinds = INTERVIEW_TRACKS.filter((t) => t.interview).map((t) => ({ id: t.interview, name: t.name }));
