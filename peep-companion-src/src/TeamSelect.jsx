import React, { useState } from 'react'
import { getPeepType } from './gameLogic.js'
import { getBattleStats, getEvolution, getNextEvolution, getLevel, xpIntoLevel, xpForNextLevel, ELEMENTS } from './game/battle.js'

// Phase B screen: view owned Peeps, set the active companion, and pick the
// battle team of exactly 3 (the gate into Phase C).
export default function TeamSelect({ peeps, activePeepId, teamIds, onSetActive, onSetTeam }) {
  const [expandedId, setExpandedId] = useState(null)

  const toggleTeam = (peepId) => {
    if (teamIds.includes(peepId)) {
      onSetTeam(teamIds.filter(id => id !== peepId))
    } else if (teamIds.length < 3) {
      onSetTeam([...teamIds, peepId])
    }
  }

  const rarityColor = { common: '#f9c846', rare: '#b399ff', ultra: '#ff6b6b' }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-deep)' }}>
      {/* Header */}
      <div style={{ padding: '14px 18px 10px', background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--accent-sun)' }}>🐣 My Peeps</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginTop: 2 }}>
          Tap a Peep for details · ⭐ sets your companion · pick a Battle Team of 3
        </div>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)' }}>BATTLE TEAM</span>
          <div style={{ display: 'flex', gap: 5 }}>
            {[0, 1, 2].map(i => {
              const pid = teamIds[i]
              const p = pid && peeps.find(x => x.id === pid)
              const stats = p && getBattleStats(p)
              return (
                <div key={i} style={{
                  width: 34, height: 34, borderRadius: 9, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 18,
                  background: p ? 'rgba(110,219,176,0.12)' : 'var(--bg-card)',
                  border: `1.5px ${p ? 'solid var(--accent-mint)' : 'dashed var(--border)'}`,
                }}>{stats ? stats.emoji : '·'}</div>
              )
            })}
          </div>
          <span style={{ fontSize: 11, fontWeight: 900, marginLeft: 'auto',
            color: teamIds.length === 3 ? 'var(--accent-mint)' : 'var(--text-muted)' }}>
            {teamIds.length}/3 {teamIds.length === 3 ? '✓ ready' : ''}
          </span>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {peeps.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 40, fontWeight: 700 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📭</div>
            No Peeps yet — earn Gold from habits and pull in the Shop!
          </div>
        )}
        {peeps.map(peep => {
          const type = getPeepType(peep.typeId)
          const stats = getBattleStats(peep)
          const evo = getEvolution(peep)
          const nextEvo = getNextEvolution(peep)
          const level = getLevel(peep.xp)
          const isActive = peep.id === activePeepId
          const inTeam = teamIds.includes(peep.id)
          const expanded = expandedId === peep.id
          const el = ELEMENTS[stats.element]
          const levelPct = (xpIntoLevel(peep.xp) / xpForNextLevel()) * 100

          return (
            <div key={peep.id} style={{
              background: 'var(--bg-card)', borderRadius: 14, overflow: 'hidden',
              border: `1.5px solid ${inTeam ? 'var(--accent-mint)' : 'var(--border)'}`,
              boxShadow: inTeam ? '0 0 14px rgba(110,219,176,0.15)' : 'none',
            }}>
              {/* Row */}
              <div onClick={() => setExpandedId(expanded ? null : peep.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', cursor: 'pointer' }}>
                <div style={{ fontSize: 30, position: 'relative' }}>
                  {stats.emoji}
                  {isActive && <span style={{ position: 'absolute', top: -4, right: -8, fontSize: 13 }}>⭐</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-main)' }}>{peep.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 5,
                      background: `${rarityColor[type.rarity]}22`, color: rarityColor[type.rarity], textTransform: 'uppercase' }}>
                      {type.rarity}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginTop: 2 }}>
                    Lv.{level} · {evo.name} · {el.emoji} {el.name}
                  </div>
                  {/* level progress */}
                  <div style={{ height: 4, borderRadius: 3, background: 'var(--bg-panel)', marginTop: 5, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${levelPct}%`, borderRadius: 3,
                      background: 'linear-gradient(90deg,var(--accent-sun),var(--accent-rose))' }} />
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); toggleTeam(peep.id) }}
                  disabled={!inTeam && teamIds.length >= 3}
                  style={{
                    padding: '8px 12px', borderRadius: 9, fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap',
                    cursor: (!inTeam && teamIds.length >= 3) ? 'not-allowed' : 'pointer',
                    background: inTeam ? 'var(--accent-mint)' : 'rgba(110,219,176,0.12)',
                    color: inTeam ? '#1a1a2e' : 'var(--accent-mint)',
                    opacity: (!inTeam && teamIds.length >= 3) ? 0.4 : 1,
                    border: '1px solid var(--accent-mint)',
                  }}>
                  {inTeam ? '✓ Team' : '+ Team'}
                </button>
              </div>

              {/* Expanded detail */}
              {expanded && (
                <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, margin: '12px 0' }}>
                    {[['❤️ HP', stats.maxHp], ['⚔️ ATK', stats.atk], ['🛡️ DEF', stats.def], ['💨 SPD', stats.spd]].map(([k, v]) => (
                      <div key={k} style={{ background: 'var(--bg-panel)', borderRadius: 8, padding: '7px 4px', textAlign: 'center' }}>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 800 }}>{k}</div>
                        <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--text-main)' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 5 }}>MOVES</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {stats.moves.map(m => (
                      <span key={m.id} style={{ fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 7,
                        background: 'var(--bg-panel)', color: 'var(--text-main)' }}>
                        {m.emoji} {m.name}{m.kind === 'attack' ? ` (${m.power})` : ''}
                      </span>
                    ))}
                  </div>
                  {nextEvo && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-sky)', marginBottom: 10 }}>
                      ✨ Grows into {nextEvo.emoji} {nextEvo.name} at Lv.{nextEvo.minLevel}
                    </div>
                  )}
                  <button onClick={() => onSetActive(peep.id)} disabled={isActive}
                    style={{ width: '100%', padding: '9px', borderRadius: 9, fontSize: 12, fontWeight: 800,
                      cursor: isActive ? 'default' : 'pointer',
                      background: isActive ? 'rgba(249,200,70,0.12)' : 'var(--accent-sun)',
                      color: isActive ? 'var(--accent-sun)' : '#1a1a2e' }}>
                    {isActive ? '⭐ Active Companion' : 'Set as Active Companion'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
        <div style={{ height: 8 }} />
      </div>
    </div>
  )
}
