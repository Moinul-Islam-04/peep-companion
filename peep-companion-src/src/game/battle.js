// ─────────────────────────────────────────────────────────────────────────────
// Phase C data layer: leveling, evolution, battle stats, elements, moves,
// enemies, and run items. Pure data + pure helpers (no React, no I/O).
// Builds on the species defined in ../gameLogic.js.
// ─────────────────────────────────────────────────────────────────────────────
import { PEEP_TYPES, getPeepType } from '../gameLogic.js'

export const MAX_LEVEL = 30

// ── Leveling ────────────────────────────────────────────────────────────────
// Flat-ish curve: ~120 XP per level. Stored Peeps only keep `xp`; level and all
// battle stats are derived so we can retune balance without migrating saves.
const XP_PER_LEVEL = 120

export function getLevel(xp) {
  return Math.min(MAX_LEVEL, Math.floor((xp || 0) / XP_PER_LEVEL) + 1)
}
export function xpIntoLevel(xp) {
  return (xp || 0) % XP_PER_LEVEL
}
export function xpForNextLevel() {
  return XP_PER_LEVEL
}

// ── Elements & type chart ─────────────────────────────────────────────────────
export const ELEMENTS = {
  fire:     { name: 'Fire',     emoji: '🔥', color: '#ff6b6b' },
  water:    { name: 'Water',    emoji: '💧', color: '#5fc3e4' },
  grass:    { name: 'Grass',    emoji: '🌿', color: '#6edbb0' },
  electric: { name: 'Electric', emoji: '⚡', color: '#f9c846' },
  normal:   { name: 'Normal',   emoji: '⭐', color: '#cfc9e0' },
}

// ── Status effects ────────────────────────────────────────────────────────────
// dot = fraction of maxHp lost at end of each turn. skipChance = chance the
// afflicted Peep can't act. Statuses last `turns` turns, then fade. They are
// battle-only (cleared when the fight ends — never carried into the run HP).
export const STATUSES = {
  burn:     { id: 'burn',     name: 'Burn',     emoji: '🔥', dot: 0.07, turns: 3 },
  poison:   { id: 'poison',   name: 'Poison',   emoji: '☠️', dot: 0.10, turns: 3 },
  paralyze: { id: 'paralyze', name: 'Paralyze', emoji: '⚡', skipChance: 0.30, turns: 3 },
}
export function getStatus(id) { return STATUSES[id] }

// attacker -> { defender: multiplier }. Unlisted matchups are neutral (1).
const TYPE_CHART = {
  fire:     { grass: 1.5, water: 0.75 },
  water:    { fire: 1.5, grass: 0.75 },
  grass:    { water: 1.5, fire: 0.75 },
  electric: { water: 1.5, grass: 0.75 },
  normal:   {},
}

export function typeMultiplier(attackElement, defendElement) {
  return TYPE_CHART[attackElement]?.[defendElement] ?? 1
}

// ── Moves ─────────────────────────────────────────────────────────────────────
// kind: 'attack' (damage) | 'buff' (raise a stat) | 'heal' | 'status' (inflict only)
// Attack moves may carry an `inflict: { status, chance }` rider.
export const MOVES = {
  tackle:  { id: 'tackle',  name: 'Tackle',   element: 'normal',   kind: 'attack', power: 35, emoji: '💥' },
  peck:    { id: 'peck',    name: 'Peck',     element: 'normal',   kind: 'attack', power: 42, emoji: '🐦' },
  ember:   { id: 'ember',   name: 'Ember',    element: 'fire',     kind: 'attack', power: 45, emoji: '🔥', inflict: { status: 'burn', chance: 0.25 } },
  splash:  { id: 'splash',  name: 'Aqua Jet', element: 'water',    kind: 'attack', power: 45, emoji: '💧' },
  vine:    { id: 'vine',    name: 'Vine Whip',element: 'grass',    kind: 'attack', power: 45, emoji: '🌿' },
  spark:   { id: 'spark',   name: 'Spark',    element: 'electric', kind: 'attack', power: 45, emoji: '⚡', inflict: { status: 'paralyze', chance: 0.25 } },
  gust:    { id: 'gust',    name: 'Gust',     element: 'electric', kind: 'attack', power: 50, emoji: '🌪️' },
  inferno: { id: 'inferno', name: 'Inferno',  element: 'fire',     kind: 'attack', power: 60, emoji: '☄️', inflict: { status: 'burn', chance: 0.35 } },
  sludge:  { id: 'sludge',  name: 'Sludge',   element: 'grass',    kind: 'attack', power: 40, emoji: '🟣', inflict: { status: 'poison', chance: 0.4 } },
  focus:   { id: 'focus',   name: 'Focus',    element: 'normal',   kind: 'buff',   stat: 'atk', amount: 0.35, emoji: '💪' },
  guard:   { id: 'guard',   name: 'Guard',    element: 'normal',   kind: 'buff',   stat: 'def', amount: 0.4,  emoji: '🛡️' },
  preen:   { id: 'preen',   name: 'Preen',    element: 'normal',   kind: 'heal',   amount: 0.3, emoji: '✨' },
  toxic:   { id: 'toxic',   name: 'Toxic',    element: 'grass',    kind: 'status', inflict: { status: 'poison',   chance: 1 }, emoji: '☠️' },
  thunderwave: { id: 'thunderwave', name: 'Thunder Wave', element: 'electric', kind: 'status', inflict: { status: 'paralyze', chance: 1 }, emoji: '⚡' },
}

// ── Species battle profiles ───────────────────────────────────────────────────
// Keyed by the typeId in PEEP_TYPES. base = level-1 stats; evolutions grow the
// Peep up at level thresholds (form name + emoji + a flat stat multiplier).
const PROFILES = {
  golden:  { element: 'fire',     base: { hp: 46, atk: 12, def: 10, spd: 11 }, moves: ['tackle', 'ember', 'focus'],
             evolutions: [ { stage: 0, name: 'Golden Peep',  emoji: '🐤', minLevel: 1,  mult: 1.0  },
                           { stage: 1, name: 'Solar Chick',   emoji: '🐔', minLevel: 6,  mult: 1.15 },
                           { stage: 2, name: 'Blaze Phoenix', emoji: '🦅', minLevel: 15, mult: 1.35 } ] },
  mint:    { element: 'grass',    base: { hp: 52, atk: 10, def: 13, spd: 9  }, moves: ['tackle', 'vine', 'guard'],
             evolutions: [ { stage: 0, name: 'Mint Peep',    emoji: '🦗', minLevel: 1,  mult: 1.0  },
                           { stage: 1, name: 'Leaf Sprout',  emoji: '🌱', minLevel: 6,  mult: 1.15 },
                           { stage: 2, name: 'Forest Guard', emoji: '🌳', minLevel: 15, mult: 1.35 } ] },
  sky:     { element: 'water',    base: { hp: 44, atk: 11, def: 9,  spd: 14 }, moves: ['peck', 'splash', 'preen'],
             evolutions: [ { stage: 0, name: 'Sky Peep',     emoji: '🐦', minLevel: 1,  mult: 1.0  },
                           { stage: 1, name: 'Tide Diver',   emoji: '🦆', minLevel: 6,  mult: 1.15 },
                           { stage: 2, name: 'Storm Albatross', emoji: '🦢', minLevel: 15, mult: 1.35 } ] },
  cosmic:  { element: 'electric', base: { hp: 50, atk: 14, def: 11, spd: 13 }, moves: ['peck', 'spark', 'focus'],
             evolutions: [ { stage: 0, name: 'Cosmic Peep',  emoji: '🌟', minLevel: 1,  mult: 1.0  },
                           { stage: 1, name: 'Nebula Chick', emoji: '💫', minLevel: 6,  mult: 1.2  },
                           { stage: 2, name: 'Galaxy Sovereign', emoji: '🌌', minLevel: 15, mult: 1.45 } ] },
  rose:    { element: 'grass',    base: { hp: 56, atk: 12, def: 14, spd: 10 }, moves: ['vine', 'toxic', 'preen'],
             evolutions: [ { stage: 0, name: 'Rose Peep',    emoji: '🌹', minLevel: 1,  mult: 1.0  },
                           { stage: 1, name: 'Thorn Bloom',  emoji: '🌷', minLevel: 6,  mult: 1.2  },
                           { stage: 2, name: 'Briar Empress', emoji: '🏵️', minLevel: 15, mult: 1.45 } ] },
  phoenix: { element: 'fire',     base: { hp: 58, atk: 17, def: 12, spd: 15 }, moves: ['ember', 'inferno', 'focus'],
             evolutions: [ { stage: 0, name: 'Phoenix Peep', emoji: '🔥', minLevel: 1,  mult: 1.0  },
                           { stage: 1, name: 'Flare Raptor', emoji: '🦅', minLevel: 6,  mult: 1.25 },
                           { stage: 2, name: 'Eternal Phoenix', emoji: '☄️', minLevel: 15, mult: 1.6 } ] },
  lunar:   { element: 'electric', base: { hp: 60, atk: 15, def: 15, spd: 13 }, moves: ['gust', 'thunderwave', 'preen'],
             evolutions: [ { stage: 0, name: 'Lunar Peep',   emoji: '🌙', minLevel: 1,  mult: 1.0  },
                           { stage: 1, name: 'Eclipse Owl',  emoji: '🦉', minLevel: 6,  mult: 1.25 },
                           { stage: 2, name: 'Astral Deity', emoji: '🌝', minLevel: 15, mult: 1.6 } ] },
}

function profileFor(typeId) {
  return PROFILES[typeId] || PROFILES.golden
}

// Current evolution form for a Peep, based on its level.
export function getEvolution(peep) {
  const prof = profileFor(peep?.typeId)
  const level = getLevel(peep?.xp || 0)
  let form = prof.evolutions[0]
  for (const e of prof.evolutions) if (level >= e.minLevel) form = e
  return { ...form, level }
}

// Returns the evolution the Peep will unlock next, or null if fully evolved.
export function getNextEvolution(peep) {
  const prof = profileFor(peep?.typeId)
  const level = getLevel(peep?.xp || 0)
  return prof.evolutions.find(e => e.minLevel > level) || null
}

// Derived battle stats for a Peep at its current level + evolution.
export function getBattleStats(peep) {
  const prof = profileFor(peep?.typeId)
  const level = getLevel(peep?.xp || 0)
  const evo = getEvolution(peep)
  const grow = (b, perLvl) => Math.round((b + perLvl * (level - 1)) * evo.mult)
  return {
    level,
    element: prof.element,
    moves: prof.moves.map(id => MOVES[id]).filter(Boolean),
    maxHp: grow(prof.base.hp, 5),
    atk:   grow(prof.base.atk, 2),
    def:   grow(prof.base.def, 1.6),
    spd:   grow(prof.base.spd, 1.4),
    name:  evo.name,
    emoji: evo.emoji,
  }
}

// ── Enemies ───────────────────────────────────────────────────────────────────
// scale: stat growth applied at higher dungeon depth; elite/boss multiply this.
export const ENEMIES = {
  slime:   { id: 'slime',   name: 'Drip Slime',  emoji: '🫧', element: 'water',    base: { hp: 40, atk: 9,  def: 8,  spd: 7  }, moves: ['splash', 'tackle'] },
  bramble: { id: 'bramble', name: 'Bramble',     emoji: '🌵', element: 'grass',    base: { hp: 48, atk: 10, def: 11, spd: 6  }, moves: ['vine', 'guard'] },
  bat:     { id: 'bat',     name: 'Spark Bat',   emoji: '🦇', element: 'electric', base: { hp: 36, atk: 12, def: 6,  spd: 13 }, moves: ['spark', 'thunderwave', 'peck'] },
  pup:     { id: 'pup',     name: 'Ember Pup',   emoji: '🐕', element: 'fire',     base: { hp: 44, atk: 11, def: 9,  spd: 10 }, moves: ['ember', 'tackle'] },
  goon:    { id: 'goon',    name: 'Husk Goon',   emoji: '👹', element: 'normal',   base: { hp: 60, atk: 13, def: 12, spd: 5  }, moves: ['tackle', 'focus'] },
  toad:    { id: 'toad',    name: 'Toxifrog',    emoji: '🐸', element: 'grass',    base: { hp: 52, atk: 10, def: 10, spd: 8  }, moves: ['sludge', 'toxic', 'tackle'] },
}
export const BOSS = {
  id: 'hydra', name: 'Chaos Hydra', emoji: '🐉', element: 'fire',
  base: { hp: 140, atk: 18, def: 14, spd: 11 }, moves: ['inferno', 'ember', 'guard'],
}

export function enemyRoster() { return Object.values(ENEMIES) }

// ── Run items (temporary, this-run-only) ──────────────────────────────────────
export const ITEMS = {
  potion:    { id: 'potion',    name: 'Potion',      emoji: '🧪', desc: 'Heal active Peep 40% HP',  kind: 'heal',  amount: 0.4 },
  elixir:    { id: 'elixir',    name: 'Elixir',      emoji: '⚗️', desc: 'Fully heal active Peep',    kind: 'heal',  amount: 1.0 },
  atkTonic:  { id: 'atkTonic',  name: 'Power Tonic', emoji: '🍯', desc: '+30% ATK for this battle',  kind: 'buff',  stat: 'atk', amount: 0.3 },
  defTonic:  { id: 'defTonic',  name: 'Iron Tonic',  emoji: '🧴', desc: '+35% DEF for this battle',  kind: 'buff',  stat: 'def', amount: 0.35 },
  revive:    { id: 'revive',    name: 'Revive',      emoji: '💖', desc: 'Revive a fainted Peep at 50%', kind: 'revive', amount: 0.5 },
}
export function getItem(id) { return ITEMS[id] }

// Treasure-node loot table.
export function rollTreasure() {
  const pool = ['potion', 'potion', 'atkTonic', 'defTonic', 'elixir', 'revive']
  return pool[Math.floor(Math.random() * pool.length)]
}

// ── Boss reward: a permanent, high-value Peep ─────────────────────────────────
export const BOSS_REWARD = { coins: 150, peepTypeId: 'phoenix' }

export { PEEP_TYPES, getPeepType }
