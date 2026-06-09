import React, { useState, useEffect } from 'react'
import Onboarding from './Onboarding.jsx'
import Dashboard from './Dashboard.jsx'
import { getDefaultSave, decayHappiness, isSameDay } from './gameLogic.js'

const isMock = !window.electronAPI

// Mock API for dev without Electron
const api = isMock ? {
  loadData: async () => JSON.parse(localStorage.getItem('peep-save') || 'null'),
  saveData: async (d) => { localStorage.setItem('peep-save', JSON.stringify(d)); return true },
  closeApp: () => {},
  minimizeApp: () => {},
} : window.electronAPI

export default function App() {
  const [save, setSave] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.loadData().then(data => {
      if (data && data.onboarded) {
        // Apply happiness decay
        const happiness = decayHappiness(data)
        // Check streak
        const today = new Date().toDateString()
        let streak = data.streak || 0
        const lastDate = data.lastStreakDate
        if (lastDate) {
          const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1)
          if (isSameDay(lastDate, yesterday.getTime())) {
            // streak continues
          } else if (!isSameDay(lastDate, Date.now())) {
            streak = 0 // broke streak
          }
        }
        setSave({ ...data, peep: { ...data.peep, happiness }, streak })
      } else {
        setSave(getDefaultSave())
      }
      setLoading(false)
    })
  }, [])

  const handleSave = async (newSave) => {
    setSave(newSave)
    await api.saveData(newSave)
  }

  const handleOnboardingComplete = async ({ name, peepName, goals }) => {
    const fresh = getDefaultSave()
    const newSave = {
      ...fresh,
      onboarded: true,
      profile: { name, peepName, goals },
      tasks: goals,
      peep: { xp: 0, happiness: 80, lastCheckin: Date.now() },
      lastReset: new Date().toDateString(),
    }
    await handleSave(newSave)
  }

  if (loading) {
    return (
      <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'var(--bg-deep)', gap:16 }}>
        <div style={{ fontSize:60 }}>🥚</div>
        <div style={{ fontSize:14, color:'var(--text-muted)', fontWeight:700, letterSpacing:'0.1em' }}>LOADING...</div>
      </div>
    )
  }

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column' }}>
      {/* Title bar */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'8px 14px', background:'var(--bg-panel)',
        borderBottom:'1px solid var(--border)', WebkitAppRegion:'drag',
        flexShrink: 0,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:16 }}>🐣</span>
          <span style={{ fontSize:13, fontWeight:900, color:'var(--text-main)', letterSpacing:'0.05em' }}>
            PEEP COMPANION
          </span>
        </div>
        <div style={{ display:'flex', gap:6, WebkitAppRegion:'no-drag' }}>
          <button onClick={() => api.minimizeApp()} style={{
            width:14, height:14, borderRadius:'50%', background:'#f9c846',
            cursor:'pointer', border:'none', transition:'opacity 0.2s'
          }} title="Minimize"/>
          <button onClick={() => api.closeApp()} style={{
            width:14, height:14, borderRadius:'50%', background:'#e8768a',
            cursor:'pointer', border:'none', transition:'opacity 0.2s'
          }} title="Close"/>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
        {!save?.onboarded
          ? <Onboarding onComplete={handleOnboardingComplete} />
          : <Dashboard save={save} onSave={handleSave} />
        }
      </div>
    </div>
  )
}
