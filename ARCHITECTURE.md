# Peep Companion — Architecture & Implementation Plan

A Windows desktop game blending a **habit tracker**, a **monster-catcher (gacha)**, and a
**turn-based roguelite battler**.

> Core loop: complete real-life habits → earn Gold + XP → collect & evolve **Peeps** →
> take a team of 3 into a procedurally-generated dungeon → beat the Final Boss.

---

## 1. Tech stack recommendation

**Recommendation: keep the existing Electron + React + Vite stack.** Do **not** migrate to
Godot/Unity.

| Option | Verdict | Why |
|--------|---------|-----|
| **Electron + React + Vite** ✅ | **Chosen** | The app is ~80% UI: lists, menus, progress bars, a *turn-based* (not real-time) battler. React excels here. It already ships as a framed window **and** a tray "mini" companion overlay. Habit data lives in a JSON file via Electron IPC. No physics, no 60fps sprite work needed. |
| Godot + C# | Overkill | Great for the battler, but you'd rebuild the entire habit-tracker/IPC/tray/mini-window layer that already works. Two UI paradigms for one small app. |
| Unity | Overkill + heavyweight | Huge runtime, slow iteration for a menu-driven productivity app. Best when you need a real engine; you don't. |
| WPF / WinForms | Too limited | Fine for the tracker, painful for animated game UI and cross-platform reach. |

The turn-based combat is **state transitions over data**, which is exactly what React + a pure
combat module models cleanly. If the battler ever needs rich animation we can drop a `<canvas>`
(PixiJS) inside the Battle view without touching the rest of the app.

**Persistence:** single JSON save at `app.getPath('userData')/peep-save.json`, read/written over
IPC (`electron/main.js`). The renderer has a `localStorage` mock so it runs in a plain browser
during dev.

---

## 2. Data schema

All game state lives in one `save` object (see `getDefaultSave()` in `src/gameLogic.js`).

### PlayerProfile (the save root)
```js
{
  onboarded: boolean,
  profile: { name: string, peepName: string },
  coins: number,                 // Gold, spent in the gacha
  peeps: Peep[],                 // every owned Peep
  activePeepId: string,          // the companion shown on the tracker
  teamIds: string[],             // up to 3 Peep ids chosen for battle (Phase C gate)
  tasks: Habit[],
  log: LogEntry[],               // recent completions
  streak: number,
  lastStreakDate: string|null,
  lastReset: string,             // toDateString() of last daily reset
  run: Run | null,               // active roguelite run, else null
  trophies: Trophy[],            // permanent boss rewards
}
```

### Habit (`tasks[]`)
```js
{
  id: string,
  templateId: string,            // from goalTemplates.js
  label: string, icon: string,
  type: 'count' | 'timer',       // tap-to-increment vs. timed session
  goal: number, unit: string,    // e.g. 3 "applications", 45 "minutes"
  completedToday: number,        // reset at midnight
  totalCompleted: number,        // lifetime
}
```
Completing a habit awards **Gold** (`coins`) and **XP to the active Peep**, and raises happiness.

### Peep (`peeps[]`)
Stored data is minimal; **battle stats and evolution form are derived** from `xp` (level) and the
Peep's species profile — so leveling/evolution can be retuned without migrating saves.
```js
// stored
{
  id: string, typeId: string,    // species -> PEEP_TYPES
  name: string,
  xp: number,                    // drives level -> battle stats + evolution
  happiness: number,             // 0-100, decays when neglected
  lastCheckin: number, createdAt: number,
}
// derived (src/game/battle.js)
getLevel(xp)            -> 1..30
getEvolution(peep)      -> { stage, name, emoji }      // grows up at level thresholds
getBattleStats(peep)    -> { level, maxHp, atk, def, spd, element, moves }
```

### Run (the roguelite, `save.run`)
```js
{
  map: { layers, nodes: MapNode[] },   // Slay-the-Spire node graph
  position: nodeId | null,             // current node (null = at start)
  reached: string[],                   // cleared node ids
  team: Combatant[],                   // battle copies carrying current HP between fights
  inventory: string[],                 // temp item ids for this run only
  activeCombat: { state, nodeId } | null,  // a live fight, persisted so it survives reload
  status: 'active' | 'won' | 'lost',
}
```
A run is consumable: items and HP reset when it ends. Beating the boss yields a permanent
`Trophy` (a high-value Peep + Gold).

**Mid-fight persistence.** A live battle is the fully-serializable engine `state` stored in
`run.activeCombat`. The [Battle](peep-companion-src/src/Battle.jsx) view is seeded from it and
lifts every state change back up (`onStateChange`) so each action is written to disk. On reload,
`GameShell` sees `run.activeCombat` and re-renders the fight exactly where it left off — no fight
is ever dropped. The combat `state` also carries a copy of `inventory`, so item use is consumed
and persisted mid-fight; surviving HP + leftover items are reconciled back into the run on resolve.

A `Combatant` additionally carries `status: { type, turns } | null` for burn/poison/paralyze
(see `STATUSES` in `game/battle.js`) — damage-over-time and skipped turns resolve in the engine and
clear when the fight ends.

---

## 3. State machine (view router)

`App.jsx` handles load/onboarding/mini-mode, then hands off to **`GameShell.jsx`**, the foundational
state machine that routes between the four top-level screens via a bottom nav:

```
                 ┌──────────────────────────────────────────────┐
   Onboarding ─▶ │                  GameShell                    │
                 │   view: 'habits' | 'peeps' | 'shop' | 'battle'│
                 └───┬─────────┬──────────┬──────────────┬───────┘
                     ▼         ▼          ▼              ▼
                 Dashboard  TeamSelect   Gacha       Battle flow
                 (Phase A)  (Phase B)   (Phase B)    (Phase C)
                                                        │
                                       team<3 ──▶ "recruit 3 Peeps" gate
                                       no run  ──▶ Start Run ─▶ BattleMap
                                       on node ──▶ Battle / Rest / Treasure
                                       boss win ──▶ Trophy ─▶ run ends
```

`GameShell` owns the cross-cutting mutations (gacha pull, set active companion, set battle team,
start/advance/end run); each screen is a presentational component receiving `save` + callbacks.
Combat is a **pure module** (`src/game/combat.js`) so the UI just renders state and dispatches actions.

### File map
```
src/
  App.jsx              load/save, onboarding, mini-mode, save migration
  GameShell.jsx        ← the state machine (view router + nav)
  Nav.jsx              bottom navigation bar
  Dashboard.jsx        Phase A: habit tracker (+ active Peep growth)
  Gacha.jsx            Phase B: gacha shop
  TeamSelect.jsx       Phase B: collection + pick active + battle team of 3
  BattleMap.jsx        Phase C: node map
  Battle.jsx           Phase C: turn-based combat UI
  gameLogic.js         peep species, gacha, stages, default save (Phase A/B data)
  game/
    battle.js          elements, moves, leveling, evolution, battle stats, enemies, items
    combat.js          pure turn-based combat engine
    mapGen.js          procedural node-map generator
```

---

## 4. Build order / status

- **Phase A — Habits & growth:** ✅ done (`Dashboard`, `gameLogic`, XP/coins/happiness/streak).
- **Phase B — Gacha & team:** ✅ gacha + collection done; team-of-3 selection added (`TeamSelect`).
- **Phase C — Roguelite:** ✅ map gen, pure combat engine, items, boss trophy, Battle/Map UI.
  Now includes **mid-fight persistence/resume**, **status effects** (burn/poison/paralyze) with
  status moves, **item consumption + revive targeting**, and battle juice (damage popups, screen
  shake, hit flashes). Remaining polish: deeper balance tuning, more enemies/moves, and
  per-attacker lunge animations.

Run it: `cd peep-companion-src && npm install && npm run dev`.
