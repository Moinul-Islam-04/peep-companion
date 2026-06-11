import { describe, it, expect } from 'vitest'
import { applyHabitReward, createPeep, TEAM_XP_SHARE } from '../src/gameLogic.js'

const mk = (name) => createPeep('golden', name)

describe('applyHabitReward', () => {
  const a = mk('A'), b = mk('B'), c = mk('C')
  const base = { peeps: [a, b, c], activePeepId: a.id, teamIds: [a.id, b.id], coins: 10 }

  it('gives the active companion full XP, happiness, and updates lastCheckin', () => {
    const before = a.happiness
    const out = applyHabitReward(base, { xp: 20, coins: 5, happiness: 10 })
    const active = out.peeps.find(p => p.id === a.id)
    expect(active.xp).toBe(a.xp + 20)
    expect(active.happiness).toBe(Math.min(100, before + 10))
    expect(active.lastCheckin).toBeGreaterThanOrEqual(a.lastCheckin)
  })

  it('shares XP with other battle-team members', () => {
    const out = applyHabitReward(base, { xp: 20 })
    expect(out.peeps.find(p => p.id === b.id).xp).toBe(b.xp + Math.round(20 * TEAM_XP_SHARE))
  })

  it('leaves non-team peeps untouched and adds coins', () => {
    const out = applyHabitReward(base, { xp: 20, coins: 5 })
    expect(out.peeps.find(p => p.id === c.id).xp).toBe(c.xp)
    expect(out.coins).toBe(15)
  })

  it('clamps active happiness at 100', () => {
    const hi = { ...base, peeps: [{ ...a, happiness: 95 }, b, c] }
    const out = applyHabitReward(hi, { happiness: 20 })
    expect(out.peeps.find(p => p.id === a.id).happiness).toBe(100)
  })
})
