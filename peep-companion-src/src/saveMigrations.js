// ─────────────────────────────────────────────────────────────────────────────
// Centralized, versioned save migrations.
//
// Every save carries a `version`. On load we run it through the ordered list of
// migration steps until it reaches SAVE_VERSION, so the rest of the app can
// assume a single, current shape. This replaces the ad-hoc `if (data.peep…)`
// checks that used to live in App.jsx — adding a field is now one new step, and
// legacy/corrupt saves are healed in one place instead of crashing a view.
// ─────────────────────────────────────────────────────────────────────────────

// MIGRATIONS[i] upgrades a save from version i to version i+1.
// Append a new function (never mutate old ones) to introduce a new version.
const MIGRATIONS = [
  // v0 → v1: consolidate everything that predates versioning.
  (d) => {
    const m = { ...d }

    // Old single-peep saves stored one `peep` object instead of a `peeps` array.
    if (m.peep && !Array.isArray(m.peeps)) {
      const id = m.peep.id || ('peep_' + Date.now())
      m.peeps = [{ ...m.peep, id }]
      m.activePeepId = m.activePeepId || id
    }

    // Phase B/C fields that newer code assumes exist.
    if (!Array.isArray(m.teamIds)) m.teamIds = []
    if (m.run === undefined) m.run = null
    if (!Array.isArray(m.trophies)) m.trophies = []
    if (typeof m.coins !== 'number') m.coins = 0

    // Heal peeps that predate the gacha: backfill species + required fields so
    // battle stats / collection views resolve instead of dereferencing undefined.
    if (Array.isArray(m.peeps)) {
      m.peeps = m.peeps.map((p, i) => ({
        id: p?.id || ('peep_' + Date.now() + '_' + i),
        typeId: 'golden',
        name: m.profile?.peepName || 'Peep',
        xp: 0,
        happiness: 70,
        lastCheckin: Date.now(),
        createdAt: Date.now(),
        ...p,
      }))
      if (!m.activePeepId && m.peeps[0]) m.activePeepId = m.peeps[0].id
    }

    // Very old saves kept goals under profile.goals instead of tasks.
    if ((!Array.isArray(m.tasks) || m.tasks.length === 0) && Array.isArray(m.profile?.goals)) {
      m.tasks = m.profile.goals
    }
    if (!Array.isArray(m.tasks)) m.tasks = []
    if (!Array.isArray(m.log)) m.log = []

    return m
  },

  // v1 → v2: meta-progression. bestTier = highest dungeon tier whose boss has
  // been beaten (drives ascension difficulty + reward scaling).
  (d) => {
    const m = { ...d }
    if (typeof m.bestTier !== 'number') m.bestTier = 0
    return m
  },
]

export const SAVE_VERSION = MIGRATIONS.length

// Bring any loaded save up to the current version. Returns null for missing or
// non-object input so the caller can fall back to a fresh save.
export function migrateSave(data) {
  if (!data || typeof data !== 'object') return null
  let d = data
  let v = Number.isInteger(d.version) ? d.version : 0
  while (v < SAVE_VERSION && MIGRATIONS[v]) {
    d = MIGRATIONS[v](d)
    v += 1
  }
  return { ...d, version: SAVE_VERSION }
}
