import { describe, it, expect } from 'vitest'
import { applyStreak } from '../src/gameLogic.js'

const dayStr = offsetDays => {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toDateString()
}
const tasks = (done) => [
  { id: 'a', goal: 3, completedToday: done ? 3 : 1 },
  { id: 'b', goal: 1, completedToday: done ? 1 : 0 },
]

describe('applyStreak', () => {
  it('does not advance until all tasks are done', () => {
    const out = applyStreak({ tasks: tasks(false), streak: 0, lastStreakDate: null })
    expect(out.streak).toBe(0)
    expect(out.lastStreakDate).toBe(null)
  })

  it('starts a streak at 1 on the first complete day', () => {
    const out = applyStreak({ tasks: tasks(true), streak: 0, lastStreakDate: null })
    expect(out.streak).toBe(1)
    expect(out.lastStreakDate).toBe(dayStr(0))
  })

  it('continues the streak when yesterday qualified', () => {
    const out = applyStreak({ tasks: tasks(true), streak: 4, lastStreakDate: dayStr(-1) })
    expect(out.streak).toBe(5)
  })

  it('restarts at 1 when a day was missed', () => {
    const out = applyStreak({ tasks: tasks(true), streak: 9, lastStreakDate: dayStr(-3) })
    expect(out.streak).toBe(1)
  })

  it('only counts once per day (idempotent within a day)', () => {
    const first = applyStreak({ tasks: tasks(true), streak: 2, lastStreakDate: dayStr(-1) })
    const second = applyStreak(first)
    expect(first.streak).toBe(3)
    expect(second.streak).toBe(3)
  })

  it('does not count with an empty task list', () => {
    const out = applyStreak({ tasks: [], streak: 0, lastStreakDate: null })
    expect(out.streak).toBe(0)
  })
})
