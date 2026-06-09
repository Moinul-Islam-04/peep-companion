import React, { useState, useEffect } from 'react'
import Onboarding from './Onboarding.jsx'
import Dashboard from './Dashboard.jsx'
import MiniPeep from './MiniPeep.jsx'
import { getDefaultSave, decayHappiness, isSameDay } from './gameLogic.js'

const isMock = !window.electronAPI

// Mock API for dev without Electron
const api = isMock ? {
  loadData: async () => JSON.parse(localStorage.getItem('peep-save') || 'null'),
  saveData: async (d) => { localStorage.setItem('peep-save', JSON.stringify(d)); return true },
  closeApp: () => {},
  minimizeApp: () => {},
  toggleMini: () => {},
} : window.electronAPI

export default function App() {
  const [save, setSave] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isMiniMode, setIsMiniMode] = useState(false)

  useEffect(() => {
    // Check if mini mode
    const params = new URLSearchParams(window.location.search)
    setIsMiniMode(params.get('mini') === 'true')

    api.loadData().then(data => {
      if (data && data.onboarded) {
        // Migrate old save format if needed
        let migratedData = data
        if (data.peep && !data.peeps) {
          // Migrate from single peep to peeps array
          migratedData = {
            ...data,
            peeps: [{ ...data.peep, id: data.peep.id || ('peep_' + Date.now()) }],
            activePeepId: data.peep.id || ('peep_' + Date.now()),
            coins: data.coins || 0
          }
        }
        
        // Apply happiness decay to active peep
        const activePeep = migratedData.peeps?.find(p => p.id === migratedData.activePeepId) || migratedData.peeps?.[0]
        if (activePeep) {
          const now = Date.now()
          const hoursSince = (now - activePeep.lastCheckin) / 3600000
          const decay = Math.floor(hoursSince / 24 * 5)
          activePeep.happiness = Math.max(0, activePeep.happiness - decay)
        }
        
        // Check streak
        const today = new Date().toDateString()
        let streak = migratedData.streak || 0
        const lastDate = migratedData.lastStreakDate
        if (lastDate) {
          const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1)
          if (isSameDay(lastDate, yesterday.getTime())) {
            // streak continues
          } else if (!isSameDay(lastDate, Date.now())) {
            streak = 0 // broke streak
          }
        }
        setSave({ ...migratedData, streak })
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
      profile: { name, peepName },
      tasks: goals,
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

  // Mini mode (floating window)
  if (isMiniMode && save?.onboarded) {
    return <MiniPeep save={save} onSave={handleSave} />
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
        <div style={{ display:'flex', gap:6, WebkitAppRegion:'no-drag', alignItems:'center' }}>
          <button onClick={() => api.toggleMini()} style={{
            width:28, height:28, borderRadius:'6px', background:'rgba(249,200,70,0.2)',
            color:'#f9c846', cursor:'pointer', border:'none', transition:'all 0.2s',
            fontSize:14, fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center'
          }} title="Toggle Mini View">
            ▶
          </button>
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
