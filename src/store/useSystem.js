import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as E from '../engine/system.js';
import { sfx } from '../lib/sound.js';

// Run an engine mutator on a deep clone of the game, then commit the result
// and surface notices / fx (overlays) to the UI.
function act(set, get, fn) {
  const cur = get().game;
  if (!cur) return undefined;
  const game = structuredClone(cur);
  const out = { notices: [], fx: [] };
  const result = fn(game, out);
  set((s) => ({
    game,
    notices: [...s.notices, ...out.notices].slice(-6),
    fx: [...s.fx, ...out.fx],
  }));
  if (get().settings.sound) {
    if (out.fx.some((f) => f.type === 'penalty' || f.type === 'punish')) sfx('penalty');
    else if (out.fx.some((f) => f.type === 'levelup')) sfx('levelup');
    else if (out.fx.length) sfx('clear');
    else if (out.notices.length) sfx(out.notices.some((n) => n.kind === 'penalty') ? 'warn' : 'notify');
  }
  return result;
}

export const useSystem = create(
  persist(
    (set, get) => ({
      game: null,
      settings: { sound: true, reduceMotion: false },
      notices: [],
      fx: [],
      health: null,

      setHealth: (health) => set({ health }),
      awaken: (profile, plan) => {
        const game = E.createGame(profile, plan);
        if (plan?.title) game.planTitle = plan.title;
        set({ game, notices: [], fx: [] });
        act(set, get, (g, out) => E.tick(g, out));
      },
      setPlan: (plan) => act(set, get, (g) => { g.plan = plan; }),
      tick: () => act(set, get, (g, out) => E.tick(g, out)),
      timeTravel: (ms) => act(set, get, (g, out) => { g.timeOffsetMs += ms; E.tick(g, out); }),
      resetTime: () => act(set, get, (g) => { g.timeOffsetMs = 0; }),
      recordSolve: (payload) => act(set, get, (g, out) => E.recordSolve(g, out, payload)),
      recordQuiz: (payload) => act(set, get, (g, out) => E.recordQuiz(g, out, payload)),
      recordInterview: (payload) => act(set, get, (g, out) => E.recordInterview(g, out, payload)),
      allocateStat: (stat) => { act(set, get, (g) => E.allocateStat(g, stat)); if (get().settings.sound) sfx('tick'); },
      equipTitle: (id) => act(set, get, (g) => { if (g.titles.includes(id)) g.equippedTitle = id; }),
      addCustomProblem: (p) => act(set, get, (g) => { g.customProblems = [p, ...g.customProblems.filter((x) => x.id !== p.id)].slice(0, 40); }),
      dismissNotice: (id) => set((s) => ({ notices: s.notices.filter((n) => n.id !== id) })),
      pushNotice: (n) => set((s) => ({ notices: [...s.notices, { id: Math.random().toString(36).slice(2), ...n }].slice(-6) })),
      shiftFx: () => set((s) => ({ fx: s.fx.slice(1) })),
      toggleSound: () => set((s) => ({ settings: { ...s.settings, sound: !s.settings.sound } })),
      toggleMotion: () => set((s) => ({ settings: { ...s.settings, reduceMotion: !s.settings.reduceMotion } })),
      hardReset: () => set({ game: null, notices: [], fx: [] }),
    }),
    {
      name: 'access-ai-system',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ game: s.game, settings: s.settings }),
    },
  ),
);
