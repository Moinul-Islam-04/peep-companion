// ─────────────────────────────────────────────────────────────────────────────
// Pure turn-based combat engine (Pokémon-style, team of 3 vs. enemy team).
// No React. Every action returns a NEW state + appended battle log; the UI just
// renders state and dispatches actions. The whole state is JSON-serializable so
// GameShell can persist a fight in `run.activeCombat` and resume it after reload.
//
// The state also carries `inventory` (a copy of the run's items) so item use is
// consumed and persisted mid-fight; HP + remaining inventory are read back out
// when the battle ends.
// ─────────────────────────────────────────────────────────────────────────────
import { getBattleStats, getItem, getStatus, typeMultiplier, ENEMIES, BOSS, MOVES, ELEMENTS } from './battle.js'

let _uid = 0
const uid = () => `c${++_uid}_${Math.floor(Math.random() * 1e6)}`

// ── Combatant construction ────────────────────────────────────────────────────

// Build a battle combatant from an owned Peep. Carries `peepId` so run HP can be
// written back to the run team after the fight.
export function combatantFromPeep(peep) {
  const s = getBattleStats(peep)
  return {
    uid: uid(), peepId: peep.id, side: 'ally',
    name: peep.name || s.name, emoji: s.emoji, element: s.element,
    level: s.level, maxHp: s.maxHp, hp: s.maxHp,
    atk: s.atk, def: s.def, spd: s.spd,
    atkMult: 1, defMult: 1,           // in-battle buff multipliers (reset each battle)
    status: null,                     // { type, turns } | null
    moves: s.moves,
  }
}

// Restore a previously-fought ally to a fresh combatant but keep its current HP
// (HP persists across fights within a run; buffs and status do not).
export function combatantFromRunMember(m) {
  return { ...m, uid: uid(), side: 'ally', atkMult: 1, defMult: 1, status: null, hp: m.hp }
}

function enemyCombatant(def, level, scale = 1) {
  const grow = (b, perLvl, mult) => Math.round((b + perLvl * (level - 1)) * scale * mult)
  return {
    uid: uid(), peepId: null, side: 'enemy',
    name: def.name, emoji: def.emoji, element: def.element, level,
    maxHp: grow(def.base.hp, 5, 1), hp: grow(def.base.hp, 5, 1),
    atk: grow(def.base.atk, 1.6, 1), def: grow(def.base.def, 1.6, 1), spd: grow(def.base.spd, 1.4, 1),
    atkMult: 1, defMult: 1, status: null,
    moves: def.moves.map(id => MOVES[id]).filter(Boolean),
  }
}

// Build an enemy team for a node. kind: 'battle' | 'elite' | 'boss'.
// `tier` is the run's ascension tier (1 = first clear); higher tiers raise enemy
// level and stats so cleared dungeons stay a challenge on repeat runs.
export function buildEnemyTeam(kind, depth, tier = 1, boss = BOSS) {
  const level = Math.max(1, 1 + depth + (tier - 1) * 2)
  const tierScale = 1 + (tier - 1) * 0.12
  if (kind === 'boss') return [enemyCombatant(boss, level + 2, tierScale)]
  const roster = Object.values(ENEMIES)
  const count = kind === 'elite' ? 3 : 1 + (depth > 1 ? 1 : 0)
  const scale = (kind === 'elite' ? 1.25 : 1) * tierScale
  const team = []
  for (let i = 0; i < count; i++) {
    const def = roster[Math.floor(Math.random() * roster.length)]
    team.push(enemyCombatant(def, level, scale))
  }
  return team
}

// ── Battle lifecycle ──────────────────────────────────────────────────────────

export function initBattle(allyCombatants, enemyCombatants, opts = {}) {
  return {
    kind: opts.kind || 'battle',
    inventory: [...(opts.inventory || [])],   // run items copied in; consumed here
    ally: allyCombatants,
    enemy: enemyCombatants,
    allyActive: firstAlive(allyCombatants),
    enemyActive: firstAlive(enemyCombatants),
    log: [{ t: 'info', text: 'Battle start!' }],
    awaitingInput: true,            // true => waiting for the player's action
    over: false,
    result: null,                   // 'win' | 'lose'
  }
}

function firstAlive(team) {
  const i = team.findIndex(c => c.hp > 0)
  return i === -1 ? 0 : i
}
const aliveCount = team => team.filter(c => c.hp > 0).length
const activeIdx = (state, side) => state[side === 'ally' ? 'allyActive' : 'enemyActive']
const activeOf = (state, side) => state[side][activeIdx(state, side)]

// ── Damage & status ───────────────────────────────────────────────────────────

function computeDamage(attacker, defender, move) {
  const atk = attacker.atk * attacker.atkMult
  const def = defender.def * defender.defMult
  const typeMult = typeMultiplier(move.element, defender.element)
  const variance = 0.85 + Math.random() * 0.3            // ±15%
  const raw = (move.power * (atk / (def + 12))) * typeMult * variance
  return { dmg: Math.max(1, Math.round(raw)), typeMult }
}

function effectivenessNote(mult) {
  if (mult > 1) return ' It\'s super effective!'
  if (mult < 1) return ' It\'s not very effective…'
  return ''
}

// Try to inflict a status on a target (no stacking; existing status blocks it).
function inflictStatus(state, target, statusId, chance) {
  if (target.hp <= 0 || target.status) return
  if (Math.random() > (chance ?? 1)) return
  const st = getStatus(statusId)
  target.status = { type: statusId, turns: st.turns }
  state.log.push({ t: 'info', text: `${target.emoji} ${target.name} was afflicted with ${st.emoji} ${st.name}!` })
}

// Apply one move from `attacker` to the opposing active target.
function applyMove(state, attacker, move) {
  if (move.kind === 'heal') {
    const heal = Math.round(attacker.maxHp * move.amount)
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal)
    state.log.push({ t: attacker.side, text: `${attacker.emoji} ${attacker.name} used ${move.name} and recovered ${heal} HP.` })
    return
  }
  if (move.kind === 'buff') {
    if (move.stat === 'atk') attacker.atkMult += move.amount
    if (move.stat === 'def') attacker.defMult += move.amount
    state.log.push({ t: attacker.side, text: `${attacker.emoji} ${attacker.name} used ${move.name}! ${move.stat.toUpperCase()} rose.` })
    return
  }
  const defSide = attacker.side === 'ally' ? 'enemy' : 'ally'
  const target = activeOf(state, defSide)
  if (move.kind === 'status') {
    state.log.push({ t: attacker.side, text: `${attacker.emoji} ${attacker.name} used ${move.name}.` })
    inflictStatus(state, target, move.inflict.status, move.inflict.chance)
    return
  }
  // attack
  const { dmg, typeMult } = computeDamage(attacker, target, move)
  target.hp = Math.max(0, target.hp - dmg)
  state.log.push({ t: attacker.side, text: `${attacker.emoji} ${attacker.name} used ${move.name} — ${dmg} dmg.${effectivenessNote(typeMult)}` })
  if (target.hp === 0) state.log.push({ t: 'info', text: `${target.emoji} ${target.name} fainted!` })
  else if (move.inflict) inflictStatus(state, target, move.inflict.status, move.inflict.chance)
}

// One combatant's action, gated by paralysis. Auto-advances faints afterward.
function tryAct(state, actor, move) {
  if (actor.hp <= 0) return
  if (actor.status?.type === 'paralyze' && Math.random() < getStatus('paralyze').skipChance) {
    state.log.push({ t: actor.side, text: `⚡ ${actor.emoji} ${actor.name} is paralyzed and can't move!` })
    return
  }
  applyMove(state, actor, move)
  ensureActive(state, 'ally')
  ensureActive(state, 'enemy')
}

// End-of-turn: tick status (damage-over-time + duration) on both actives.
function tickStatus(state, side) {
  const c = activeOf(state, side)
  if (c.hp <= 0 || !c.status) return
  const st = getStatus(c.status.type)
  if (st.dot) {
    const dmg = Math.max(2, Math.round(c.maxHp * st.dot))
    c.hp = Math.max(0, c.hp - dmg)
    state.log.push({ t: 'info', text: `${st.emoji} ${c.emoji} ${c.name} took ${dmg} ${st.name} damage.` })
    if (c.hp === 0) state.log.push({ t: 'info', text: `${c.emoji} ${c.name} fainted!` })
  }
  c.status.turns -= 1
  if (c.status.turns <= 0) {
    state.log.push({ t: 'info', text: `${c.emoji} ${c.name}'s ${st.name} faded.` })
    c.status = null
  }
}

function endOfTurn(state) {
  tickStatus(state, 'ally')
  tickStatus(state, 'enemy')
  ensureActive(state, 'ally')
  ensureActive(state, 'enemy')
  checkOver(state)
}

function checkOver(state) {
  if (aliveCount(state.enemy) === 0) {
    state.over = true; state.result = 'win'; state.awaitingInput = false
    state.log.push({ t: 'info', text: '🎉 Victory!' })
  } else if (aliveCount(state.ally) === 0) {
    state.over = true; state.result = 'lose'; state.awaitingInput = false
    state.log.push({ t: 'info', text: '💀 Your team was defeated…' })
  }
}

// Auto-advance a side's active slot to the next living member after a faint.
function ensureActive(state, side) {
  const key = side === 'ally' ? 'allyActive' : 'enemyActive'
  if (state[side][state[key]].hp > 0) return
  const next = state[side].findIndex(c => c.hp > 0)
  if (next !== -1) {
    state[key] = next
    state.log.push({ t: 'info', text: `${state[side][next].emoji} ${state[side][next].name} steps in!` })
  }
}

function enemyChooseMove(enemy) {
  // Prefer an offensive option; status/buff moves stay in the pool for variety.
  const attacks = enemy.moves.filter(m => m.kind === 'attack')
  const pool = (attacks.length && Math.random() < 0.75) ? attacks : enemy.moves
  return pool[Math.floor(Math.random() * pool.length)]
}

function clone(state) {
  return {
    ...state,
    inventory: [...state.inventory],
    ally: state.ally.map(c => ({ ...c, status: c.status ? { ...c.status } : null })),
    enemy: state.enemy.map(c => ({ ...c, status: c.status ? { ...c.status } : null })),
    log: [...state.log],
  }
}

// ── Player actions ────────────────────────────────────────────────────────────

// Player chose an attack/buff/heal/status move (id from the active ally's moveset).
export function playerMove(prev, moveId) {
  if (prev.over || !prev.awaitingInput) return prev
  const state = clone(prev)
  const ally = activeOf(state, 'ally')
  const enemy = activeOf(state, 'enemy')
  const playerMv = ally.moves.find(m => m.id === moveId) || ally.moves[0]
  const enemyMv = enemyChooseMove(enemy)

  // Resolve both actions in speed order.
  const order = ally.spd >= enemy.spd
    ? [[ally, playerMv], [enemy, enemyMv]]
    : [[enemy, enemyMv], [ally, playerMv]]
  for (const [actor, move] of order) {
    tryAct(state, actor, move)
    if (aliveCount(state.enemy) === 0 || aliveCount(state.ally) === 0) break
  }
  endOfTurn(state)
  return state
}

// Player switched the active Peep (forfeits initiative: only the enemy acts).
export function playerSwitch(prev, allyIndex) {
  if (prev.over || !prev.awaitingInput) return prev
  if (allyIndex === prev.allyActive || prev.ally[allyIndex]?.hp <= 0) return prev
  const state = clone(prev)
  state.allyActive = allyIndex
  const inMon = state.ally[allyIndex]
  state.log.push({ t: 'ally', text: `🔄 Go, ${inMon.emoji} ${inMon.name}!` })
  tryAct(state, activeOf(state, 'enemy'), enemyChooseMove(activeOf(state, 'enemy')))
  endOfTurn(state)
  return state
}

// Player used a run item on the active (or chosen) ally. Consumes one from the
// in-battle inventory; using an item costs the turn (the enemy acts).
export function playerItem(prev, itemId, allyIndex = prev.allyActive) {
  if (prev.over || !prev.awaitingInput) return prev
  const item = getItem(itemId)
  if (!item || !prev.inventory.includes(itemId)) return prev
  const state = clone(prev)
  const target = state.ally[allyIndex]

  if (item.kind === 'heal' && target.hp > 0) {
    const heal = item.amount >= 1 ? target.maxHp : Math.round(target.maxHp * item.amount)
    target.hp = Math.min(target.maxHp, target.hp + heal)
    state.log.push({ t: 'ally', text: `${item.emoji} ${target.name} used ${item.name} (+${heal} HP).` })
  } else if (item.kind === 'revive' && target.hp === 0) {
    target.hp = Math.round(target.maxHp * item.amount)
    state.log.push({ t: 'ally', text: `${item.emoji} ${target.name} was revived!` })
  } else if (item.kind === 'buff') {
    if (item.stat === 'atk') target.atkMult += item.amount
    if (item.stat === 'def') target.defMult += item.amount
    state.log.push({ t: 'ally', text: `${item.emoji} ${target.name} used ${item.name}!` })
  } else {
    return prev   // invalid use (e.g. revive on a living Peep)
  }

  // consume one of that item
  const idx = state.inventory.indexOf(itemId)
  if (idx !== -1) state.inventory.splice(idx, 1)

  tryAct(state, activeOf(state, 'enemy'), enemyChooseMove(activeOf(state, 'enemy')))
  endOfTurn(state)
  return state
}

export { ELEMENTS }
