import { describe, it, expect } from 'vitest'
import { migrateSave, SAVE_VERSION } from '../src/saveMigrations.js'
import { getDefaultSave, getPeepType } from '../src/gameLogic.js'

describe('migrateSave', () => {
  it('returns null for missing/invalid input', () => {
    expect(migrateSave(null)).toBe(null)
    expect(migrateSave(undefined)).toBe(null)
    expect(migrateSave(42)).toBe(null)
  })

  it('stamps the current version', () => {
    expect(migrateSave({ onboarded: true }).version).toBe(SAVE_VERSION)
  })

  it('getDefaultSave is already current (migration is a no-op on it)', () => {
    const def = getDefaultSave()
    expect(def.version).toBe(SAVE_VERSION)
    expect(migrateSave(def)).toEqual(def)
  })

  // This is the exact shape that blanked the Electron app: a peep with no
  // typeId, goals stranded under profile.goals, and a legacy single `peep`.
  it('heals the real legacy save that caused the blank-screen crash', () => {
    const legacy = {
      onboarded: true,
      profile: { name: 'Mo', peepName: 'Omnom', goals: [{ id: 'r1', label: 'Reading', goal: 20 }] },
      peep: { xp: 795, happiness: 100, lastCheckin: 1781033989175 },
      tasks: [],
      peeps: [{ xp: 795, happiness: 89, lastCheckin: 1781033989175, id: 'peep_1781131268894' }],
      activePeepId: 'peep_1781131268894',
      coins: 0,
    }
    const m = migrateSave(legacy)

    // every peep now resolves to a real species (no undefined .rarity)
    for (const p of m.peeps) {
      expect(p.typeId).toBeTruthy()
      expect(getPeepType(p.typeId)).toBeTruthy()
      expect(getPeepType(p.typeId).rarity).toBeTruthy()
      expect(p.name).toBe('Omnom')
    }
    // Phase B/C fields exist
    expect(Array.isArray(m.teamIds)).toBe(true)
    expect(m.run).toBe(null)
    expect(Array.isArray(m.trophies)).toBe(true)
    // stranded goals recovered into tasks
    expect(m.tasks).toHaveLength(1)
    expect(m.tasks[0].label).toBe('Reading')
    expect(m.version).toBe(SAVE_VERSION)
  })

  it('upgrades a v1 save to add the bestTier field (v1 → v2)', () => {
    const v1 = { version: 1, onboarded: true, peeps: [], teamIds: [], run: null, trophies: [] }
    expect(v1.bestTier).toBeUndefined()
    const m = migrateSave(v1)
    expect(m.bestTier).toBe(0)
    expect(m.version).toBe(SAVE_VERSION)
  })

  it('migrates a legacy single-peep save into a peeps array', () => {
    const m = migrateSave({ onboarded: true, peep: { id: 'p1', xp: 10, happiness: 50 } })
    expect(Array.isArray(m.peeps)).toBe(true)
    expect(m.peeps[0].id).toBe('p1')
    expect(m.activePeepId).toBe('p1')
  })

  it('is idempotent', () => {
    const legacy = { onboarded: true, peeps: [{ id: 'p1', xp: 100 }], profile: { peepName: 'X' } }
    const once = migrateSave(legacy)
    const twice = migrateSave(once)
    expect(twice).toEqual(once)
  })

  it('does not clobber a healthy modern save', () => {
    const modern = migrateSave(getDefaultSave())
    const teamed = { ...modern, onboarded: true, teamIds: ['a', 'b', 'c'], coins: 999 }
    const m = migrateSave(teamed)
    expect(m.teamIds).toEqual(['a', 'b', 'c'])
    expect(m.coins).toBe(999)
  })
})
