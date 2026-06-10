import React from 'react'

// Bottom navigation for GameShell's view state machine.
const TABS = [
  { id: 'habits', label: 'Habits', emoji: '✅' },
  { id: 'peeps',  label: 'Peeps',  emoji: '🐣' },
  { id: 'shop',   label: 'Shop',   emoji: '🎲' },
  { id: 'battle', label: 'Battle', emoji: '⚔️' },
]

export default function Nav({ view, onNavigate, teamCount = 0, inRun = false, disabled = false }) {
  return (
    <div style={{
      display: 'flex', flexShrink: 0, borderTop: '1px solid var(--border)',
      background: 'var(--bg-panel)', padding: '4px 6px', gap: 4,
      opacity: disabled ? 0.4 : 1, pointerEvents: disabled ? 'none' : 'auto',
    }}>
      {TABS.map(tab => {
        const isActive = view === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 2, padding: '7px 4px', borderRadius: 10, background: 'transparent',
              cursor: 'pointer', transition: 'all 0.18s', position: 'relative',
              color: isActive ? 'var(--accent-sun)' : 'var(--text-muted)',
            }}
          >
            <span style={{ fontSize: 18, filter: isActive ? 'none' : 'grayscale(0.4)' }}>{tab.emoji}</span>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.03em' }}>{tab.label}</span>
            {/* badges */}
            {tab.id === 'battle' && inRun && (
              <span style={{ position: 'absolute', top: 2, right: '50%', marginRight: -20,
                width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-rose)' }} />
            )}
            {tab.id === 'peeps' && (
              <span style={{ position: 'absolute', top: 2, right: '50%', marginRight: -20,
                fontSize: 9, fontWeight: 900, color: teamCount === 3 ? 'var(--accent-mint)' : 'var(--text-muted)' }}>
                {teamCount}/3
              </span>
            )}
            {isActive && <span style={{ position: 'absolute', bottom: 0, width: 24, height: 3,
              borderRadius: 3, background: 'var(--accent-sun)' }} />}
          </button>
        )
      })}
    </div>
  )
}
