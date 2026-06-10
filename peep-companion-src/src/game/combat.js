// ─────────────────────────────────────────────────────────────────────────────
// Pure turn-based combat engine (Pokémon-style, team of 3 vs. enemy team).
// No React. Every action returns a NEW state + appended battle log; the UI just
// renders state and dispatches actions. Persisted run HP is read back out of the
// surviving ally combatants when a battle ends.
// ─────────────────────────────────────────────────────────────────────────────
import { getBattleStats, getItem, typeMultiplier, ENEMIES, BOSS, MOVES, ELEMENTS } from './battle.js'

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
    moves: s.moves,
  }
}

// Restore a previously-fought ally to a fresh combatant but keep its current HP
// (HP persists across fights within a run; buffs do not).
export function combatantFromRunMember(m) {
  return { ...m, uid: uid(), side: 'ally', atkMult: 1, defMult: 1, hp: m.hp }
}

function enemyCombatant(def, level, scale = 1) {
  const grow = (b, perLvl, mult) => Math.round((b + perLvl * (level - 1)) * scale * mult)
  return {
    uid: uid(), peepId: null, side: 'enemy',
    name: def.name, emoji: def.emoji, element: def.element, level,
    maxHp: grow(def.base.hp, 5, 1), hp: grow(def.base.hp, 5, 1),
    atk: grow(def.base.atk, 2, 1), def: grow(def.base.def, 1.6, 1), spd: grow(def.base.spd, 1.4, 1),
    atkMult: 1, defMult: 1,
    moves: def.moves.map(id => MOVES[id]).filter(Boolean),
  }
}

// Build an enemy team for a node. kind: 'battle' | 'elite' | 'boss'.
export function buildEnemyTeam(kind, depth) {
  const level = Math.max(1, 2 + depth * 2)
  if (kind === 'boss') return [enemyCombatant(BOSS, level + 3, 1.0)]
  const roster = Object.values(ENEMIES)
  const count = kind === 'elite' ? 3 : 1 + (depth > 1 ? 1 : 0)
  const scale = kind === 'elite' ? 1.25 : 1
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
const active = (state, side) => state[side][side === 'ally' ? 'allyActive' : 'enemyActive']

// ── Damage ────────────────────────────────────────────────────────────────────

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

// Apply one move from `attacker` to the opposing active target. Mutates a cloned
// state in place (callers pass an already-cloned state).
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
  // attack
  const defSide = attacker.side === 'ally' ? 'enemy' : 'ally'
  const target = state[defSide][active(state, defSide)]
  const { dmg, typeMult } = computeDamage(attacker, target, move)
  target.hp = Math.max(0, target.hp - dmg)
  state.log.push({
    t: attacker.side,
    text: `${attacker.emoji} ${attacker.name} used ${move.name} — ${dmg} dmg.${effectivenessNote(typeMult)}`,
  })
  if (target.hp === 0) {
    state.log.push({ t: 'info', text: `${target.emoji} ${target.name} fainted!` })
  }
}

// ── Turn resolution ───────────────────────────────────────────────────────────
// Player picks an action; we resolve it together with the enemy's action in
// speed order, then hand control back. Switching forfeits the turn's initiative.

function enemyChooseMove(enemy) {
  // Prefer a super-effective attack; otherwise random.
  const attacks = enemy.moves.filter(m => m.kind === 'attack')
  const pool = attacks.length ? attacks : enemy.moves
  return pool[Math.floor(Math.random() * pool.length)]
}

function checkOver(state) {
  if (aliveCount(state.enemy) === 0) { state.over = true; state.result = 'win'; state.awaitingInput = false
    state.log.push({ t: 'info', text: '🎉 Victory!' }) }
  else if (aliveCount(state.ally) === 0) { state.over = true; state.result = 'lose'; state.awaitingInput = false
    state.log.push({ t: 'info', text: '💀 Your team was defeated…' }) }
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

function clone(state) {
  return {
    ...state,
    ally: state.ally.map(c => ({ ...c })),
    enemy: state.enemy.map(c => ({ ...c })),
    log: [...state.log],
  }
}

// Player chose an attack/buff/heal move (id from the active ally's moveset).
export function playerMove(prev, moveId) {
  if (prev.over || !prev.awaitingInput) return prev
  const state = clone(prev)
  const ally = state.ally[state.allyActive]
  const enemy = state.enemy[state.enemyActive]
  const playerMv = ally.moves.find(m => m.id === moveId) || ally.moves[0]
  const enemyMv = enemyChooseMove(enemy)
  resolveTurn(state, { actor: ally, move: playerMv }, { actor: enemy, move: enemyMv })
  return state
}

// Player switched the active Peep (forfeits initiative: enemy acts, then done).
export function playerSwitch(prev, allyIndex) {
  if (prev.over || !prev.awaitingInput) return prev
  if (allyIndex === prev.allyActive || prev.ally[allyIndex]?.hp <= 0) return prev
  const state = clone(prev)
  state.allyActive = allyIndex
  const inMon = state.ally[allyIndex]
  state.log.push({ t: 'ally', text: `🔄 Go, ${inMon.emoji} ${inMon.name}!` })
  const enemy = state.enemy[state.enemyActive]
  applyMove(state, enemy, enemyChooseMove(enemy))
  ensureActive(state, 'ally')
  checkOver(state)
  return state
}

// Player used a run item on the active (or chosen) ally.
export function playerItem(prev, itemId, allyIndex = prev.allyActive) {
  if (prev.over || !prev.awaitingInput) return prev
  const item = getItem(itemId)
  if (!item) return prev
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
  // Using an item costs the turn: the enemy gets to act.
  const enemy = state.enemy[state.enemyActive]
  applyMove(state, enemy, enemyChooseMove(enemy))
  ensureActive(state, 'ally')
  checkOver(state)
  return state
}

// Resolve both combatants' actions for the turn in speed order.
function resolveTurn(state, playerAction, enemyAction) {
  const order = playerAction.actor.spd >= enemyAction.actor.spd
    ? [playerAction, enemyAction]
    : [enemyAction, playerAction]

  for (const { actor, move } of order) {
    if (actor.hp <= 0) continue                 // fainted before acting
    applyMove(state, actor, move)
    ensureActive(state, 'ally')
    ensureActive(state, 'enemy')
    if (aliveCount(state.enemy) === 0 || aliveCount(state.ally) === 0) break
  }
  checkOver(state)
}

export { ELEMENTS }
