// Peep stages based on XP
export const STAGES = [
  { name: 'Egg',        minXP: 0,    emoji: '🥚', description: 'Just getting started!' },
  { name: 'Hatchling',  minXP: 50,   emoji: '🐣', description: 'Something is stirring...' },
  { name: 'Chick',      minXP: 150,  emoji: '🐥', description: 'Peep is growing fast!' },
  { name: 'Flapper',    minXP: 350,  emoji: '🐤', description: 'Almost there, keep going!' },
  { name: 'Peep Pro',   minXP: 700,  emoji: '🦆', description: 'You\'re unstoppable!' },
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

export function getDefaultSave() {
  return {
    onboarded: false,
    profile: { name: '', goals: [] },
    peep: {
      xp: 0,
      happiness: 70,
      lastCheckin: Date.now(),
    },
    tasks: [],       // { id, label, type, goal, unit, completedToday, totalCompleted }
    log: [],         // { timestamp, taskId, label, xpEarned }
    streak: 0,
    lastStreakDate: null,
  }
}

export function decayHappiness(save) {
  const now = Date.now()
  const hoursSince = (now - save.peep.lastCheckin) / 3600000
  // Lose ~5 happiness per 24h of inactivity
  const decay = Math.floor(hoursSince / 24 * 5)
  return Math.max(0, save.peep.happiness - decay)
}

export function isSameDay(ts1, ts2) {
  const d1 = new Date(ts1), d2 = new Date(ts2)
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
}
