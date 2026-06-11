import { describe, it, expect } from 'vitest'
import { createPeep } from '../src/gameLogic.js'
import { getBattleStats, getLevel } from '../src/game/battle.js'
import {
  combatantFromPeep, buildEnemyTeam, initBattle,
  playerMove, playerItem, playerSwitch,
} from '../src/game/combat.js'

const peep = (typeId, name, xp) => ({ ...createPeep(typeId, name), xp })
const team = () => [peep('phoenix', 'Blaze', 1800), peep('lunar', 'Selene', 700), peep('rose', 'Thorn', 60)]
const attackId = s => { const a = s.ally[s.allyActive]; return (a.moves.find(m => m.kind === 'attack') || a.moves[0]).id }
const aliveCount = arr => arr.filter(c => c.hp > 0).length

describe('derived stats', () => {
  it('higher level yields more HP', () => {
    expect(getLevel(1800)).toBeGreaterThan(getLevel(60))
    expect(getBattleStats(peep('phoenix', 'A', 1800)).maxHp)
      .toBeGreaterThan(getBattleStats(peep('phoenix', 'A', 60)).maxHp)
  })
})

describe('combat engine', () => {
  it('battles always terminate with consistent invariants — surviving a JSON round-trip each turn', () => {
    for (let b = 0; b < 30; b++) {
      const allies = team().map(combatantFromPeep)
      const kind = b % 7 === 6 ? 'boss' : b % 3 === 0 ? 'elite' : 'battle'
      let s = initBattle(allies, buildEnemyTeam(kind, 1 + (b % 5)), { kind, inventory: ['potion'] })

      let guard = 0
      while (!s.over && guard++ < 300) {
        s = JSON.parse(JSON.stringify(s))          // simulate persist + reload every turn
        s = playerMove(s, attackId(s))
      }
      expect(s.over).toBe(true)
      expect(['win', 'lose']).toContain(s.result)
      expect((s.result === 'win')).toBe(s.enemy.every(c => c.hp <= 0))
      for (const c of [...s.ally, ...s.enemy]) {
        expect(c.hp).toBeGreaterThanOrEqual(0)
        expect(c.hp).toBeLessThanOrEqual(c.maxHp)
      }
    }
  })

  it('consumes an item from the inventory when used', () => {
    const allies = team().map(combatantFromPeep)
    let s = initBattle(allies, buildEnemyTeam('battle', 1), { kind: 'battle', inventory: ['atkTonic', 'potion'] })
    const before = s.inventory.length
    s = playerItem(s, 'atkTonic')
    expect(s.inventory.length).toBe(before - 1)
    expect(s.inventory).not.toContain('atkTonic')
  })

  it('revives a fainted ally and consumes the revive', () => {
    const allies = team().map(combatantFromPeep)
    allies[1].hp = 0
    let s = initBattle(allies, buildEnemyTeam('battle', 1), { kind: 'battle', inventory: ['revive'] })
    s = playerItem(s, 'revive', 1)
    expect(s.ally[1].hp).toBeGreaterThan(0)
    expect(s.inventory).not.toContain('revive')
  })

  it('a guaranteed-status move inflicts a status that deals damage over time', () => {
    // Thorn (rose) knows Toxic (poison, 100% chance). Force it to act first.
    const allies = team().map(combatantFromPeep)
    let s = initBattle(allies, buildEnemyTeam('battle', 1), { kind: 'battle' })
    // make Thorn active and fast so the status lands before anything faints
    s.allyActive = 2
    s.ally[2].spd = 999
    const toxic = s.ally[2].moves.find(m => m.id === 'toxic')
    expect(toxic).toBeTruthy()
    const enemyMaxBefore = s.enemy[0].maxHp
    s = playerMove(s, 'toxic')
    const target = s.enemy[0]
    // either still poisoned, or it already ticked; either way HP dropped from status
    expect(target.hp).toBeLessThan(enemyMaxBefore)
  })

  it('switching keeps the same team members alive (no slot loss)', () => {
    const allies = team().map(combatantFromPeep)
    let s = initBattle(allies, buildEnemyTeam('battle', 1), { kind: 'battle' })
    const before = aliveCount(s.ally)
    s = playerSwitch(s, 1)
    expect(s.allyActive === 1 || s.over).toBe(true)
    expect(aliveCount(s.ally)).toBeLessThanOrEqual(before)  // can only drop via enemy hit, never grow
  })
})
