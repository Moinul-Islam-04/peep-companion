// Builds realistic save-state "scenes" for screenshots using the real game
// modules (so every shape is valid). Writes ../docs/scenes.json.
// Run: node --experimental-default-type=module scripts/build-scenes.mjs
import fs from 'node:fs'
import { createPeep, getDefaultSave } from '../src/gameLogic.js'
import { combatantFromPeep, combatantFromRunMember, buildEnemyTeam, initBattle, playerMove } from '../src/game/combat.js'
import { generateMap } from '../src/game/mapGen.js'

const peep = (typeId, name, xp, happiness = 92) => {
  const p = createPeep(typeId, name); p.xp = xp; p.happiness = happiness; return p
}

// A roster spanning rarities and evolution stages.
const blaze  = peep('phoenix', 'Blaze', 1850)   // ultra, fully evolved
const selene = peep('lunar', 'Selene', 980)      // ultra, mid evo
const cosmo  = peep('cosmic', 'Cosmo', 540)      // rare
const thorn  = peep('rose', 'Thorn', 240)        // rare
const sunny  = peep('golden', 'Sunny', 110)      // common
const sprout = peep('mint', 'Sprout', 50)        // common, base form
const peeps = [blaze, selene, cosmo, thorn, sunny, sprout]

const today = new Date().toDateString()
const now = Date.now()

const tasks = [
  { id: 't_jobs', templateId: 'jobs', label: 'Job Applications', icon: '📋', type: 'count', goal: 3, unit: 'applications', completedToday: 2, totalCompleted: 14 },
  { id: 't_ex',   templateId: 'exercise', label: 'Exercise',     icon: '🏃', type: 'timer', goal: 30, unit: 'minutes', completedToday: 30, totalCompleted: 210 },
  { id: 't_lc',   templateId: 'leetcode', label: 'LeetCode Problems', icon: '💻', type: 'count', goal: 2, unit: 'problems', completedToday: 1, totalCompleted: 33 },
  { id: 't_read', templateId: 'reading', label: 'Reading',       icon: '📖', type: 'timer', goal: 20, unit: 'minutes', completedToday: 0, totalCompleted: 120 },
]
const log = [
  { timestamp: now - 3.6e6, taskId: 't_ex', label: 'Exercise', icon: '🏃', xpEarned: 40, coinsEarned: 6, note: '🎯 Goal reached!' },
  { timestamp: now - 7.2e6, taskId: 't_jobs', label: 'Job Applications', icon: '📋', xpEarned: 5, coinsEarned: 1, note: null },
  { timestamp: now - 9.0e6, taskId: 't_lc', label: 'LeetCode Problems', icon: '💻', xpEarned: 5, coinsEarned: 1, note: null },
]

const base = {
  ...getDefaultSave(),
  onboarded: true,
  profile: { name: 'Mahi', peepName: 'Blaze' },
  coins: 320,
  peeps,
  activePeepId: blaze.id,
  teamIds: [blaze.id, selene.id, cosmo.id],
  tasks, log,
  streak: 7,
  lastStreakDate: today,
  lastReset: today,
  run: null,
  trophies: [],
}

// Peeps screen mid-selection (2/3 chosen) to show the team-building mechanic.
const peepsSave = { ...base, teamIds: [blaze.id, selene.id] }

// Dungeon map: an active run a couple of nodes in.
const map = generateMap()
const start = map.nodes.find(n => n.type === 'start')
const firstId = start.next[0]
const mapTeam = [blaze, selene, cosmo].map(combatantFromPeep)
mapTeam[2].hp = Math.round(mapTeam[2].maxHp * 0.55)   // show a chipped HP bar
const mapSave = { ...base, run: { map, position: firstId, reached: [start.id, firstId], team: mapTeam, inventory: ['potion', 'atkTonic'], activeCombat: null, status: 'active' } }

// Live combat: init an elite fight and play one turn so it looks mid-battle.
const attackId = s => { const a = s.ally[s.allyActive]; return (a.moves.find(m => m.kind === 'attack') || a.moves[0]).id }
const cmap = generateMap()
const cnode = cmap.nodes.find(n => n.type === 'battle') || cmap.nodes[1]
const runTeam = [blaze, selene, cosmo].map(combatantFromPeep)
const allies = runTeam.map(combatantFromRunMember)
const enemies = buildEnemyTeam('elite', 4)
let cs = initBattle(allies, enemies, { kind: 'elite', inventory: ['potion', 'revive', 'atkTonic'] })
if (!cs.over) cs = playerMove(cs, attackId(cs))
const combatSave = { ...base, run: { map: cmap, position: cnode.id, reached: [cmap.nodes[0].id], team: runTeam, inventory: cs.inventory, activeCombat: { state: cs, nodeId: cnode.id }, status: 'active' } }

const scenes = [
  { name: '1-habit-tracker', save: base, nav: null },
  { name: '2-peeps-team', save: peepsSave, nav: 'Peeps', click: [150, 205] },  // click expands the first card
  { name: '3-gacha-shop', save: base, nav: 'Shop' },
  { name: '4-run-start', save: base, nav: 'Battle' },
  { name: '5-dungeon-map', save: mapSave, nav: 'Battle' },
  { name: '6-combat', save: combatSave, nav: null },
]

fs.mkdirSync(new URL('../../docs', import.meta.url), { recursive: true })
fs.writeFileSync(new URL('../../docs/scenes.json', import.meta.url), JSON.stringify(scenes, null, 2))
console.log(`wrote ${scenes.length} scenes to docs/scenes.json`)
