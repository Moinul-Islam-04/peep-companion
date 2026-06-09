import React, { useState } from 'react'
import PeepCharacter from './PeepCharacter.jsx'
import { getStage, getPeepType, getMoodLevel } from './gameLogic.js'

export default function PeepCollection({ peeps, activePeepId, onSwitchPeep, onClose }) {
  const activePeep = peeps.find(p => p.id === activePeepId)
  const activePeepType = activePeep ? getPeepType(activePeep.typeId) : null

  const handleSwitch = (peepId) => {
    onSwitchPeep(peepId)
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(180deg, #2d2d44 0%, #1a1a2e 100%)',
      overflow: 'hidden'
    }}>
      <style>{`
        .collection-header {
          padding: 16px 20px;
          borderBottom: 1px solid rgba(255,255,255,0.1);
          display: flex;
          justifyContent: space-between;
          alignItems: center;
        }
        .collection-title {
          fontSize: 18px;
          fontWeight: 900;
          color: #f9c846;
        }
        .collection-container {
          flex: 1;
          overflowY: auto;
          padding: 16px;
          display: flex;
          flexDirection: column;
          gap: 12px;
        }
        .peep-card {
          padding: 14px;
          borderRadius: 12px;
          border: 2px solid var(--border);
          background: var(--bg-card);
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          justifyContent: space-between;
          alignItems: center;
        }
        .peep-card:hover {
          borderColor: var(--accent-sun);
          transform: translateY(-2px);
        }
        .peep-card.active {
          borderColor: var(--accent-sun);
          background: rgba(249,200,70,0.1);
          box-shadow: 0 0 20px rgba(249,200,70,0.2);
        }
        .peep-card-info {
          display: flex;
          alignItems: center;
          gap: 12px;
          flex: 1;
        }
        .peep-emoji {
          fontSize: 28px;
        }
        .peep-details {
          display: flex;
          flexDirection: column;
          gap: 2px;
        }
        .peep-name {
          fontSize: 13px;
          fontWeight: 800;
          color: var(--text-main);
        }
        .peep-type {
          fontSize: 11px;
          fontWeight: 700;
          opacity: 0.7;
        }
        .peep-stats {
          display: flex;
          gap: 12px;
          fontSize: 11px;
          fontWeight: 700;
        }
        .stat {
          display: flex;
          alignItems: center;
          gap: 4px;
        }
        .switch-btn {
          padding: 8px 14px;
          borderRadius: 8px;
          background: rgba(110,219,176,0.2);
          border: 1px solid var(--accent-mint);
          color: var(--accent-mint);
          fontWeight: 800;
          fontSize: 12px;
          cursor: pointer;
          transition: all 0.2s;
          whiteSpace: nowrap;
        }
        .switch-btn:hover {
          background: var(--accent-mint);
          color: #1a1a2e;
        }
        .active .switch-btn {
          background: var(--accent-sun);
          borderColor: var(--accent-sun);
          color: #1a1a2e;
          cursor: default;
        }
        .active .switch-btn:hover {
          background: var(--accent-sun);
        }
      `}</style>

      {/* Header */}
      <div className="collection-header">
        <div className="collection-title">🐣 My Peeps</div>
        <button onClick={onClose} style={{
          background: 'transparent',
          border: 'none',
          color: '#ccc',
          fontSize: 20,
          cursor: 'pointer',
          padding: '4px 8px'
        }}>✕</button>
      </div>

      {/* Peep List */}
      <div className="collection-container">
        {peeps.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            color: 'var(--text-muted)'
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
            <div style={{ fontWeight: 700 }}>No peeps yet!</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Use the gacha to get your first peep</div>
          </div>
        ) : (
          peeps.map(peep => {
            const peepType = getPeepType(peep.typeId)
            const stage = getStage(peep.xp)
            const mood = getMoodLevel(peep.happiness)
            const isActive = peep.id === activePeepId

            return (
              <div
                key={peep.id}
                className={`peep-card ${isActive ? 'active' : ''}`}
                onClick={() => handleSwitch(peep.id)}
              >
                <div className="peep-card-info">
                  <div className="peep-emoji">{peepType.emoji}</div>
                  <div className="peep-details">
                    <div className="peep-name">{peep.name}</div>
                    <div className="peep-type">{stage.name} • {peepType.name}</div>
                  </div>
                </div>
                <div className="peep-stats">
                  <div className="stat">
                    <span>⚡</span>
                    <span>{peep.xp} XP</span>
                  </div>
                  <div className="stat" style={{ color: '#e8768a' }}>
                    <span>♥</span>
                    <span>{peep.happiness}%</span>
                  </div>
                </div>
                <button
                  className="switch-btn"
                  onClick={e => {
                    e.stopPropagation()
                    handleSwitch(peep.id)
                  }}
                >
                  {isActive ? '✓ Active' : 'Switch'}
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
