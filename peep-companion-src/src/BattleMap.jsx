import React from 'react'
import { NODE_TYPES, availableNodes } from './game/mapGen.js'

// Phase C overworld: a node-based, procedurally-generated map leading to the boss.
// Renders the layered DAG, highlights reachable nodes, and shows team status.
export default function BattleMap({ run, onSelectNode, onAbandon }) {
  const { map, position, reached, team } = run
  const available = availableNodes(map, position).map(n => n.id)
  const reachedSet = new Set(reached)

  // Layout: SVG viewBox 0..1000 (x) by layer rows.
  const W = 1000
  const rowH = 110
  const H = (map.layers - 1) * rowH + 80
  const px = n => 60 + n.x * (W - 120)
  const py = n => 40 + n.layer * rowH

  const aliveCount = team.filter(c => c.hp > 0).length

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-deep)' }}>
      {/* Header */}
      <div style={{ padding: '12px 16px', background: 'var(--bg-panel)', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--accent-rose)' }}>⚔️ The Dungeon</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>
            Choose your path to the 🐉 Boss
          </div>
        </div>
        <button onClick={onAbandon} style={{ fontSize: 11, fontWeight: 800, padding: '6px 10px', borderRadius: 8,
          background: 'rgba(232,118,138,0.15)', color: 'var(--accent-rose)', border: '1px solid var(--accent-rose)' }}>
          Abandon Run
        </button>
      </div>

      {/* Map (scrollable) */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H * 0.42, display: 'block' }}
          preserveAspectRatio="xMidYMin meet">
          {/* edges */}
          {map.nodes.map(n => n.next.map(nextId => {
            const m = map.nodes.find(x => x.id === nextId)
            const isPath = reachedSet.has(n.id) && (reachedSet.has(m.id) || available.includes(m.id))
            return (
              <line key={`${n.id}-${nextId}`} x1={px(n)} y1={py(n)} x2={px(m)} y2={py(m)}
                stroke={isPath ? '#f9c846' : '#2e2b44'} strokeWidth={isPath ? 3 : 2}
                strokeDasharray={isPath ? '0' : '5,5'} opacity={isPath ? 0.9 : 0.5} />
            )
          }))}
          {/* nodes */}
          {map.nodes.map(n => {
            const meta = NODE_TYPES[n.type]
            const isAvailable = available.includes(n.id)
            const isReached = reachedSet.has(n.id)
            const isCurrent = n.id === position
            const dim = !isAvailable && !isReached && !isCurrent
            return (
              <g key={n.id} style={{ cursor: isAvailable ? 'pointer' : 'default' }}
                onClick={() => isAvailable && onSelectNode(n)}>
                {isAvailable && <circle cx={px(n)} cy={py(n)} r={34} fill="none"
                  stroke={meta.color} strokeWidth={2.5} opacity={0.5}>
                  <animate attributeName="r" values="30;38;30" dur="1.6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.6;0.15;0.6" dur="1.6s" repeatCount="indefinite" />
                </circle>}
                <circle cx={px(n)} cy={py(n)} r={26}
                  fill={isCurrent ? meta.color : 'var(--bg-card)'}
                  stroke={meta.color} strokeWidth={isCurrent ? 4 : 2.5}
                  opacity={dim ? 0.35 : 1} />
                <text x={px(n)} y={py(n) + 9} textAnchor="middle" fontSize={26} opacity={dim ? 0.4 : 1}>
                  {isReached && !isCurrent ? '✓' : meta.emoji}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', padding: '6px 16px' }}>
          {['battle', 'elite', 'treasure', 'rest', 'boss'].map(t => (
            <span key={t} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>
              {NODE_TYPES[t].emoji} {NODE_TYPES[t].label}
            </span>
          ))}
        </div>
      </div>

      {/* Team status bar */}
      <div style={{ flexShrink: 0, padding: '10px 14px', background: 'var(--bg-panel)', borderTop: '1px solid var(--border)' }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 6 }}>
          TEAM · {aliveCount}/{team.length} standing
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {team.map(c => {
            const pct = (c.hp / c.maxHp) * 100
            const fainted = c.hp <= 0
            return (
              <div key={c.uid} style={{ flex: 1, opacity: fainted ? 0.4 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                  <span style={{ fontSize: 16 }}>{fainted ? '💀' : c.emoji}</span>
                  <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-main)' }}>{c.hp}/{c.maxHp}</span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: 'var(--bg-deep)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3,
                    background: pct > 50 ? 'var(--accent-mint)' : pct > 25 ? 'var(--accent-sun)' : 'var(--accent-rose)' }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
