import React, { useState } from 'react'
import PeepCharacter from './PeepCharacter.jsx'
import { getStage, getMoodLevel, getPeepType } from './gameLogic.js'

const isMock = !window.electronAPI
const api = isMock ? {
  loadData: async () => JSON.parse(localStorage.getItem('peep-save') || 'null'),
  saveData: async (d) => { localStorage.setItem('peep-save', JSON.stringify(d)); return true },
  closeApp: () => {},
  minimizeApp: () => {},
} : window.electronAPI

export default function MiniPeep({ save, onSave }) {
  const [celebrateMsg, setCelebrateMsg] = useState(null)
  const [animating, setAnimating] = useState(false)
  const [particles, setParticles] = useState([])

  const { peeps = [], activePeepId, profile, tasks = [] } = save
  const activePeep = peeps.find(p => p.id === activePeepId) || peeps[0]
  const activePeepType = activePeep ? getPeepType(activePeep.typeId) : null
  
  const stage = getStage(activePeep?.xp || 0)
  const mood = getMoodLevel(activePeep?.happiness || 70)

  const triggerCelebration = (msg) => {
    setAnimating(true)
    setCelebrateMsg(msg)
    setParticles(Array.from({ length: 5 }, (_, i) => ({
      id: Date.now() + i,
      x: 30 + Math.random() * 40,
      emoji: ['⭐','✨','💫'][Math.floor(Math.random()*3)]
    })))
    setTimeout(() => setAnimating(false), 700)
    setTimeout(() => { setCelebrateMsg(null); setParticles([]) }, 1500)
  }

  const quickIncrement = (task) => {
    const newCompleted = task.completedToday + 1
    const justCompleted = newCompleted === task.goal
    const xpGained = justCompleted ? 25 : 5
    const coinsEarned = justCompleted ? 5 : 1

    const newHappiness = Math.min(100, activePeep.happiness + (justCompleted ? 15 : 5))
    const newXP = activePeep.xp + xpGained

    const updatedPeeps = peeps.map(p =>
      p.id === activePeepId
        ? { ...p, xp: newXP, happiness: newHappiness, lastCheckin: Date.now() }
        : p
    )

    const newTasks = tasks.map(t =>
      t.id === task.id ? { ...t, completedToday: newCompleted, totalCompleted: t.totalCompleted + 1 } : t
    )

    onSave({ 
      ...save, 
      tasks: newTasks, 
      peeps: updatedPeeps,
      coins: (save.coins || 0) + coinsEarned
    })

    triggerCelebration(justCompleted ? `🎯 ${task.label}!` : `+${xpGained}`)
  }

  const moodColors = {
    ecstatic: '#6edbaf', happy: '#6edbaf', neutral: '#5fc3e4', 
    sad: '#e8768a', neglected: '#666'
  }

  return (
    <div style={{
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      background: 'linear-gradient(180deg, #2d2d44 0%, #1a1a2e 100%)',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <style>{`
        .mini-task-btn {
          padding: 6px 8px; border-radius: 6px; font-size: 11px; 
          fontWeight: 700; cursor: pointer; transition: all 0.15s;
          border: none; white-space: nowrap;
        }
        .mini-task-btn:active { transform: scale(0.95); }
        @keyframes miniParticleFly {
          0% { opacity:1; transform: translateY(0) scale(1); }
          100% { opacity:0; transform: translateY(-40px) scale(0.3); }
        }
        .mini-particle { position:absolute; animation: miniParticleFly 1s ease forwards; font-size:14px; pointer-events:none; }
        @keyframes miniMsgPop {
          0% { opacity:0; transform:translateY(5px) scale(0.8); }
          50% { opacity:1; transform:translateY(-2px) scale(1); }
          100% { opacity:0; transform:translateY(-15px) scale(0.8); }
        }
        .mini-celebrate-msg {
          position:absolute; top:25%; left:50%; transform:translateX(-50%);
          background: #f9c846; color: #1a1a2e; padding: 4px 12px;
          border-radius: 20px; font-weight: 900; font-size: 11px;
          animation: miniMsgPop 1.5s ease forwards; white-space: nowrap;
        }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '8px 12px', 
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(0,0,0,0.2)'
      }}>
        <div>
          <div style={{ fontSize: 10, color: '#999', fontWeight: 700 }}>
            {activePeep?.name || profile?.peepName || 'Peep'}
          </div>
          <div style={{ fontSize: 13, fontWeight: 900, color: '#f9c846' }}>
            {stage.emoji} {stage.name}
          </div>
        </div>
        <button
          onClick={() => api.minimizeApp()}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#f9c846',
            fontSize: 16,
            cursor: 'pointer',
            padding: '2px 4px'
          }}
          title="Minimize"
        >
          −
        </button>
      </div>

      {/* Peep Display */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '8px',
        position: 'relative',
        height: 120
      }}>
        {particles.map(p => (
          <div key={p.id} className="mini-particle" style={{ left: `${p.x}%`, top: '30%' }}>
            {p.emoji}
          </div>
        ))}
        {celebrateMsg && <div className="mini-celebrate-msg">{celebrateMsg}</div>}
        
        <PeepCharacter 
          mood={mood} 
          stageIndex={stage.index} 
          isAnimating={animating} 
          size={80} 
        />
      </div>

      {/* Quick Tasks */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        fontSize: 11
      }}>
        {tasks.slice(0, 5).map(task => {
          const done = task.completedToday >= task.goal
          return (
            <button
              key={task.id}
              onClick={() => quickIncrement(task)}
              className="mini-task-btn"
              style={{
                background: done ? 'rgba(110,219,176,0.2)' : 'rgba(249,200,70,0.8)',
                color: done ? '#6edbaf' : '#1a1a2e',
                width: '100%',
                textAlign: 'center'
              }}
              title={`${task.label}: ${task.completedToday}/${task.goal}`}
            >
              {task.icon} {task.completedToday}/{task.goal}
            </button>
          )
        })}
        {tasks.length > 5 && (
          <div style={{ 
            fontSize: 9, 
            color: '#999', 
            textAlign: 'center',
            padding: '4px'
          }}>
            +{tasks.length - 5} more
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div style={{
        padding: '8px 10px',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(0,0,0,0.2)',
        fontSize: 10,
        color: '#aaa'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>XP: {activePeep?.xp ?? 0}</span>
          <span style={{ color: moodColors[mood] }}>♥ {activePeep?.happiness ?? 0}%</span>
        </div>
      </div>
    </div>
  )
}
