export const LANGUAGES = [
  { id: 'python', name: 'Python', monaco: 'python', color: '#facc15' },
  { id: 'javascript', name: 'JavaScript', monaco: 'javascript', color: '#fde047' },
  { id: 'cpp', name: 'C++', monaco: 'cpp', color: '#60a5fa' },
  { id: 'java', name: 'Java', monaco: 'java', color: '#fb923c' },
  { id: 'c', name: 'C', monaco: 'c', color: '#a5b4fc' },
];
export const LANG_NAME = Object.fromEntries(LANGUAGES.map((l) => [l.id, l.name]));

// Interview rounds the player can register for. Each maps to quest sources.
export const INTERVIEW_TRACKS = [
  { id: 'dsa', name: 'DSA / Coding Rounds', desc: 'Online assessments & live coding', quiz: null, interview: 'dsa' },
  { id: 'core', name: 'Core CS Fundamentals', desc: 'OS · DBMS · CN · OOP', quiz: ['os', 'dbms', 'cn', 'oop'], interview: 'core' },
  { id: 'lang', name: 'Language Deep-Dive', desc: 'Internals & output prediction', quiz: 'languages', interview: 'lang' },
  { id: 'system', name: 'System Design (Basics)', desc: 'Intern / new-grad level', quiz: null, interview: 'system' },
  { id: 'hr', name: 'HR / Behavioural', desc: 'STAR stories, culture fit', quiz: null, interview: 'hr' },
  { id: 'aptitude', name: 'Aptitude & Reasoning', desc: 'Service-company & OA screens', quiz: ['aptitude'], interview: null },
];

export const GOAL_PRESETS = [
  'Crack an SDE internship at a top product company',
  'Land a full-time placement offer through campus drives',
  'Clear service-company placement tests (TCS / Infosys / Wipro style)',
  'Get a Summer internship in Backend / Full-Stack development',
  'Prepare for off-campus placements at startups',
];

export const INTENSITY = [
  { id: 1, name: 'Casual', desc: '~30 min / day', mult: 1 },
  { id: 2, name: 'Standard', desc: '~1 hr / day', mult: 1.5 },
  { id: 3, name: 'Hardcore', desc: '2+ hrs / day', mult: 2 },
];

export const YEARS = ['1st year', '2nd year', '3rd year', '4th year', 'Graduated / Other'];
