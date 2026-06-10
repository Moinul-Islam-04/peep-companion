import React, { useState, useEffect, useRef } from 'react'
import { playerMove, playerSwitch, playerItem } from './game/combat.js'
import { ELEMENTS, getItem } from './game/battle.js'

// Phase C combat screen. Renders a battle state from the combat engine and
// dispatches player actions; calls onResolve(result, finalAllyTeam) when over.
export default function Battle({ initialState, inventory, onResolve }) {
  const [state, setState] = useState(initialState)
  const [menu, setMenu] = useState('main')      // 'main' | 'moves' | 'switch' | 'items'
  const [hitFlash, setHitFlash] = useState(null) // 'ally' | 'enemy'
  const logRef = useRef(null)

  const ally = state.ally[state.allyActive]
  const enemy = state.enemy[state.enemyActive]

  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight }, [state.log])

  // Dispatch an action, then animate / detect end-of-battle.
  const dispatch = (next, struckSide) => {
    setState(next)
    setMenu('main')
    if (struckSide) { setHitFlash(struckSide); setTimeout(() => setHitFlash(null), 250) }
  }

  const onMove = (id) => dispatch(playerMove(state, id), 'enemy')
  const onSwitch = (i) => dispatch(playerSwitch(state, i), null)
  const onUseItem = (id) => dispatch(playerItem(state, id), null)

  const hpBar = (c, big) => {
    const pct = (c.hp / c.maxHp) * 100
    return (
      <div style={{ background: 'var(--bg-card)', borderRadius: 10, padding: '8px 12px',
        border: '1px solid var(--border)', minWidth: big ? 150 : 130 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-main)' }}>{c.name}</span>
          <span style={{ fontSize: 10, fontWeight: 800, color: ELEMENTS[c.element].color }}>
            {ELEMENTS[c.element].emoji} Lv{c.level}
          </span>
        </div>
        <div style={{ height: 7, borderRadius: 4, background: 'var(--bg-deep)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, borderRadius: 4, transition: 'width 0.4s',
            background: pct > 50 ? 'var(--accent-mint)' : pct > 25 ? 'var(--accent-sun)' : 'var(--accent-rose)' }} />
        </div>
        <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-muted)', marginTop: 2, textAlign: 'right' }}>
          {c.hp}/{c.maxHp}
          {c.atkMult > 1 && <span style={{ color: 'var(--accent-rose)' }}> ⚔️↑</span>}
          {c.defMult > 1 && <span style={{ color: 'var(--accent-sky)' }}> 🛡️↑</span>}
        </div>
      </div>
    )
  }

  const sprite = (c, side) => {
    const flash = hitFlash === side
    return (
      <div style={{ fontSize: 64, transition: 'all 0.15s', transform: flash ? 'scale(0.85) rotate(-6deg)' : 'scale(1)',
        filter: flash ? 'brightness(2) sepia(1) hue-rotate(-40deg)' : c.hp <= 0 ? 'grayscale(1) opacity(0.4)' : 'none',
        animation: side === 'enemy' ? 'floatA 3s ease-in-out infinite' : 'floatB 3.2s ease-in-out infinite' }}>
        {c.hp <= 0 ? '💫' : c.emoji}
      </div>
    )
  }

  const usableItems = (inventory || []).reduce((acc, id) => {
    acc[id] = (acc[id] || 0) + 1; return acc
  }, {})

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(180deg,#241f3a 0%,#0f0e17 100%)' }}>
      <style>{`
        @keyframes floatA { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes floatB { 0%,100%{transform:translateY(0)} 50%{transform:translateY(6px)} }
        .battle-btn { padding:11px; border-radius:11px; font-size:13px; font-weight:800;
          cursor:pointer; transition:all 0.15s; border:1.5px solid var(--border); background:var(--bg-card); color:var(--text-main); }
        .battle-btn:hover:not(:disabled){ transform:translateY(-1px); border-color:var(--accent-sun); }
        .battle-btn:disabled{ opacity:0.4; cursor:not-allowed; }
      `}</style>

      {/* Arena */}
      <div style={{ flex: 1, position: 'relative', padding: '14px 16px', minHeight: 0 }}>
        {/* Enemy (top-right) */}
        <div style={{ position: 'absolute', top: 14, right: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          {hpBar(enemy, false)}
        </div>
        <div style={{ position: 'absolute', top: 70, right: 40 }}>{sprite(enemy, 'enemy')}</div>

        {/* Enemy bench dots */}
        <div style={{ position: 'absolute', top: 18, left: 16, display: 'flex', gap: 4 }}>
          {state.enemy.map(c => (
            <span key={c.uid} style={{ fontSize: 10, opacity: c.hp > 0 ? 1 : 0.3 }}>
              {c.uid === enemy.uid ? '🔴' : c.hp > 0 ? '⚪' : '⚫'}
            </span>
          ))}
        </div>

        {/* Ally (bottom-left) */}
        <div style={{ position: 'absolute', bottom: 74, left: 36 }}>{sprite(ally, 'ally')}</div>
        <div style={{ position: 'absolute', bottom: 14, left: 16 }}>{hpBar(ally, true)}</div>
      </div>

      {/* Log */}
      <div ref={logRef} style={{ flexShrink: 0, height: 64, overflowY: 'auto', padding: '6px 14px',
        background: 'rgba(0,0,0,0.25)', borderTop: '1px solid var(--border)' }}>
        {state.log.slice(-6).map((l, i) => (
          <div key={i} style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.5,
            color: l.t === 'ally' ? 'var(--accent-mint)' : l.t === 'enemy' ? 'var(--accent-rose)' : 'var(--text-muted)' }}>
            {l.text}
          </div>
        ))}
      </div>

      {/* Action panel */}
      <div style={{ flexShrink: 0, padding: 12, background: 'var(--bg-panel)', borderTop: '1px solid var(--border)' }}>
        {state.over ? (
          <button className="battle-btn" style={{ width: '100%', background: 'var(--accent-sun)', color: '#1a1a2e' }}
            onClick={() => onResolve(state.result, state.ally)}>
            {state.result === 'win' ? '🎉 Claim Victory' : '☠️ Continue'}
          </button>
        ) : menu === 'main' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button className="battle-btn" style={{ background: 'var(--accent-rose)', color: 'white' }} onClick={() => setMenu('moves')}>⚔️ Attack</button>
            <button className="battle-btn" onClick={() => setMenu('switch')}>🔄 Switch</button>
            <button className="battle-btn" style={{ gridColumn: '1 / -1' }} onClick={() => setMenu('items')}
              disabled={!inventory?.length}>🎒 Items {inventory?.length ? `(${inventory.length})` : ''}</button>
          </div>
        ) : menu === 'moves' ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {ally.moves.map(m => (
              <button key={m.id} className="battle-btn" onClick={() => onMove(m.id)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                <span>{m.emoji} {m.name}</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: ELEMENTS[m.element].color }}>
                  {ELEMENTS[m.element].emoji} {m.kind === 'attack' ? `PWR ${m.power}` : m.kind === 'heal' ? 'HEAL' : 'BUFF'}
                </span>
              </button>
            ))}
            <button className="battle-btn" style={{ gridColumn: '1 / -1', fontSize: 11 }} onClick={() => setMenu('main')}>↩ Back</button>
          </div>
        ) : menu === 'switch' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {state.ally.map((c, i) => (
              <button key={c.uid} className="battle-btn" disabled={i === state.allyActive || c.hp <= 0}
                onClick={() => onSwitch(i)} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{c.hp <= 0 ? '💀' : c.emoji} {c.name} {i === state.allyActive ? '(active)' : ''}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.hp}/{c.maxHp}</span>
              </button>
            ))}
            <button className="battle-btn" style={{ fontSize: 11 }} onClick={() => setMenu('main')}>↩ Back</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Object.keys(usableItems).length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 8 }}>No items.</div>
            )}
            {Object.entries(usableItems).map(([id, count]) => {
              const item = getItem(id)
              return (
                <button key={id} className="battle-btn" onClick={() => onUseItem(id)}
                  style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{item.emoji} {item.name} ×{count}</span>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.desc}</span>
                </button>
              )
            })}
            <button className="battle-btn" style={{ fontSize: 11 }} onClick={() => setMenu('main')}>↩ Back</button>
          </div>
        )}
      </div>
    </div>
  )
}
