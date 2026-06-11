import { SAVE_VERSION } from './saveMigrations.js'

// Peep stages based on XP
export const STAGES = [
  { name: 'Egg',        minXP: 0,    emoji: '🥚', description: 'Just getting started!' },
  { name: 'Hatchling',  minXP: 50,   emoji: '🐣', description: 'Something is stirring...' },
  { name: 'Chick',      minXP: 150,  emoji: '🐥', description: 'Peep is growing fast!' },
  { name: 'Flapper',    minXP: 350,  emoji: '🐤', description: 'Almost there, keep going!' },
  { name: 'Peep Pro',   minXP: 700,  emoji: '🦆', description: 'You\'re unstoppable!' },
]

// Peep types/species with different characteristics
export const PEEP_TYPES = [
  // Common (Gold)
  { id: 'golden', name: 'Golden Peep', emoji: '🐤', rarity: 'common', color: '#f9c846', statMod: { xp: 1.0, happiness: 1.0 } },
  { id: 'mint', name: 'Mint Peep', emoji: '🦗', rarity: 'common', color: '#6edbaf', statMod: { xp: 0.9, happiness: 1.1 } },
  { id: 'sky', name: 'Sky Peep', emoji: '🐦', rarity: 'common', color: '#5fc3e4', statMod: { xp: 1.1, happiness: 0.9 } },
  // Rare (Purple)
  { id: 'cosmic', name: 'Cosmic Peep', emoji: '🌟', rarity: 'rare', color: '#b399ff', statMod: { xp: 1.2, happiness: 1.0 } },
  { id: 'rose', name: 'Rose Peep', emoji: '🌹', rarity: 'rare', color: '#e8768a', statMod: { xp: 0.95, happiness: 1.2 } },
  // Ultra Rare (Legendary)
  { id: 'phoenix', name: 'Phoenix Peep', emoji: '🔥', rarity: 'ultra', color: '#ff6b6b', statMod: { xp: 1.5, happiness: 0.8 } },
  { id: 'lunar', name: 'Lunar Peep', emoji: '🌙', rarity: 'ultra', color: '#e0d5ff', statMod: { xp: 1.1, happiness: 1.3 } },
]

// Gacha box types with pull rates
export const GACHA_BOXES = [
  { 
    id: 'normal',
    name: 'Normal Box',
    cost: 10,
    color: '#f9c846',
    pulls: [
      { type: 'golden', rarity: 'common', rate: 0.4 },
      { type: 'mint', rarity: 'common', rate: 0.3 },
      { type: 'sky', rarity: 'common', rate: 0.3 },
    ]
  },
  { 
    id: 'special',
    name: 'Special Box',
    cost: 30,
    color: '#b399ff',
    pulls: [
      { type: 'golden', rarity: 'common', rate: 0.25 },
      { type: 'mint', rarity: 'common', rate: 0.2 },
      { type: 'sky', rarity: 'common', rate: 0.2 },
      { type: 'cosmic', rarity: 'rare', rate: 0.2 },
      { type: 'rose', rarity: 'rare', rate: 0.15 },
    ]
  },
  { 
    id: 'legendary',
    name: 'Legendary Box',
    cost: 100,
    color: '#ff6b6b',
    pulls: [
      { type: 'cosmic', rarity: 'rare', rate: 0.3 },
      { type: 'rose', rarity: 'rare', rate: 0.3 },
      { type: 'phoenix', rarity: 'ultra', rate: 0.25 },
      { type: 'lunar', rarity: 'ultra', rate: 0.15 },
    ]
  }
]

export function getStage(xp) {
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (xp >= STAGES[i].minXP) return { ...STAGES[i], index: i }
  }
  return { ...STAGES[0], index: 0 }
}

export function getNextStage(xp) {
  const curr = getStage(xp)
  return STAGES[curr.index + 1] || null
}

export function getMoodLevel(happiness) {
  if (happiness >= 80) return 'ecstatic'
  if (happiness >= 60) return 'happy'
  if (happiness >= 40) return 'neutral'
  if (happiness >= 20) return 'sad'
  return 'neglected'
}

export function getPeepType(typeId) {
  // Fall back to the default species so legacy/corrupt peeps (e.g. saves that
  // predate the gacha and have no typeId) never crash a view that reads .rarity.
  return PEEP_TYPES.find(t => t.id === typeId) || PEEP_TYPES[0]
}

export function createPeep(typeId, name = null) {
  const type = getPeepType(typeId)
  if (!type) return null
  
  return {
    id: typeId + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    typeId,
    name: name || type.name,
    xp: 0,
    happiness: 70,
    lastCheckin: Date.now(),
    createdAt: Date.now(),
  }
}

export function performGachaPull(boxId) {
  const box = GACHA_BOXES.find(b => b.id === boxId)
  if (!box) return null
  
  const rand = Math.random()
  let cumulative = 0
  
  for (const pull of box.pulls) {
    cumulative += pull.rate
    if (rand <= cumulative) {
      return createPeep(pull.type)
    }
  }
  
  return createPeep(box.pulls[0].type)
}

export function getDefaultSave() {
  const starterPeep = createPeep('golden', 'Your First Peep')
  return {
    version: SAVE_VERSION,
    onboarded: false,
    profile: { name: '', peepName: 'Peep' },
    coins: 0,
    activePeepId: starterPeep.id,
    peeps: [starterPeep],  // Array of owned peeps
    teamIds: [],     // up to 3 peep ids chosen for the battle team (Phase C)
    tasks: [],       // { id, label, type, goal, unit, completedToday, totalCompleted }
    log: [],         // { timestamp, taskId, label, xpEarned, coinsEarned }
    streak: 0,
    lastStreakDate: null,
    run: null,       // active roguelite run (Phase C), else null
    trophies: [],    // permanent boss rewards
    bestTier: 0,     // highest dungeon tier cleared (ascension progress)
  }
}

// Fraction of habit XP that flows to (non-active) battle-team members, so doing
// real-life habits levels your whole dungeon squad — not just the companion.
export const TEAM_XP_SHARE = 0.5

// Apply a habit reward to a save: the active companion gets full XP + a happiness
// bump, every other battle-team member gets a share of the XP, and coins are
// added. Returns a new save (peeps + coins only — callers handle tasks/log/streak).
export function applyHabitReward(save, { xp = 0, coins = 0, happiness = 0 }) {
  const now = Date.now()
  const teamSet = new Set(save.teamIds || [])
  const teamShare = Math.round(xp * TEAM_XP_SHARE)

  const peeps = (save.peeps || []).map(p => {
    if (p.id === save.activePeepId) {
      return { ...p, xp: p.xp + xp, happiness: Math.min(100, p.happiness + happiness), lastCheckin: now }
    }
    if (teamSet.has(p.id) && teamShare > 0) {
      return { ...p, xp: p.xp + teamShare }
    }
    return p
  })

  return { ...save, peeps, coins: (save.coins || 0) + coins }
}

// Advance the daily streak when every task for the day is complete. Counts once
// per day; continues the streak if yesterday qualified, otherwise restarts at 1.
// Call after updating tasks (pass the save that already holds the new task state).
export function applyStreak(save) {
  const today = new Date().toDateString()
  if (save.lastStreakDate === today) return save        // already counted today
  const tasks = save.tasks || []
  const allDone = tasks.length > 0 && tasks.every(t => t.completedToday >= t.goal)
  if (!allDone) return save

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const continues = save.lastStreakDate && isSameDay(save.lastStreakDate, yesterday.getTime())
  return { ...save, streak: continues ? (save.streak || 0) + 1 : 1, lastStreakDate: today }
}

export function decayHappiness(save) {
  const now = Date.now()
  const activePeep = save.peeps?.find(p => p.id === save.activePeepId) || save.peep
  const hoursSince = (now - activePeep.lastCheckin) / 3600000
  // Lose ~5 happiness per 24h of inactivity
  const decay = Math.floor(hoursSince / 24 * 5)
  return Math.max(0, activePeep.happiness - decay)
}

export function isSameDay(ts1, ts2) {
  const d1 = new Date(ts1), d2 = new Date(ts2)
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
}
