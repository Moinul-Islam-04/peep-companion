// Balance probe: simulates full dungeon runs (HP carries between fights, rests
// heal, treasures give potions) with a simple auto-battler, and reports clear
// rates by ascension tier and team strength. A dev tool, not a CI test.
// Run: node --experimental-default-type=module scripts/balance.mjs
import { createPeep } from '../src/gameLogic.js'
import { typeMultiplier, getBoss, randomBossId } from '../src/game/battle.js'
import {
  combatantFromPeep, combatantFromRunMember, buildEnemyTeam,
  initBattle, playerMove, playerItem,
} from '../src/game/combat.js'
import { generateMap, availableNodes } from '../src/game/mapGen.js'

const peep = (typeId, xp) => ({ ...createPeep(typeId, typeId), xp })

// Greedy auto-battler: heal when the active is low, else swing the most
// effective attack against the current foe.
function autoBattle(state) {
  let guard = 0
  while (!state.over && guard++ < 400) {
    const me = state.ally[state.allyActive]
    const foe = state.enemy[state.enemyActive]
    if (me.hp < me.maxHp * 0.3 && state.inventory.includes('potion')) { state = playerItem(state, 'potion'); continue }
    const attacks = me.moves.filter(m => m.kind === 'attack')
    let best = (attacks[0] || me.moves[0]).id, score = -1
    for (const m of attacks) {
      const s = m.power * typeMultiplier(m.element, foe.element)
      if (s > score) { score = s; best = m.id }
    }
    state = playerMove(state, best)
  }
  return state
}

// Walk a generated map on a random path until the boss is cleared or we wipe.
function simulateRun(teamPeeps, tier) {
  const map = generateMap()
  const start = map.nodes.find(n => n.type === 'start')
  let pos = start.id
  const reached = new Set([start.id])
  let team = teamPeeps.map(combatantFromPeep)
  let inventory = []
  const boss = getBoss(randomBossId())

  while (true) {
    const avail = availableNodes(map, pos).filter(n => !reached.has(n.id))
    if (!avail.length) return false
    const node = avail[Math.floor(Math.random() * avail.length)]
    pos = node.id; reached.add(node.id)

    if (node.type === 'rest') {
      team = team.map(c => ({ ...c, hp: Math.min(c.maxHp, c.hp + Math.round(c.maxHp * 0.5)) }))
    } else if (node.type === 'treasure') {
      inventory = [...inventory, 'potion']
    } else {
      const kind = node.type === 'boss' ? 'boss' : node.type === 'elite' ? 'elite' : 'battle'
      const allies = team.map(combatantFromRunMember)
      let s = initBattle(allies, buildEnemyTeam(kind, node.layer, tier, boss), { kind, inventory })
      s = autoBattle(s)
      if (s.result !== 'win') return false
      team = team.map(m => { const fa = s.ally.find(a => a.peepId === m.peepId); return fa ? { ...m, hp: fa.hp } : m })
      inventory = s.inventory
      if (node.type === 'boss') return true
    }
  }
}

function clearRate(teamPeeps, tier, runs = 300) {
  let wins = 0
  for (let i = 0; i < runs; i++) if (simulateRun(teamPeeps, tier)) wins++
  return Math.round((wins / runs) * 100)
}

const teams = {
  'starter  L3  (commons)': () => [peep('golden', 300), peep('mint', 300), peep('sky', 300)],
  'early    L5  (commons)': () => [peep('golden', 540), peep('mint', 540), peep('sky', 540)],
  'mid      L8  (rares)': () => [peep('cosmic', 900), peep('rose', 900), peep('sky', 900)],
  'built    L12 (rares)': () => [peep('cosmic', 1380), peep('rose', 1380), peep('lunar', 1380)],
  'strong   L16 (ultras)': () => [peep('phoenix', 1800), peep('lunar', 1800), peep('cosmic', 1800)],
}

console.log('clear rate (%) by tier:\n')
console.log('team'.padEnd(34), [1, 2, 3, 4, 5].map(t => 'T' + t).join('   '))
for (const [label, mk] of Object.entries(teams)) {
  const row = [1, 2, 3, 4, 5].map(t => String(clearRate(mk(), t)).padStart(2))
  console.log(label.padEnd(34), row.join('   '))
}
