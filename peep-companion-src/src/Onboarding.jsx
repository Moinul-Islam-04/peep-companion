import React, { useState } from 'react'
import { GOAL_TEMPLATES } from './goalTemplates.js'

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [peepName, setPeepName] = useState('')
  const [selectedGoals, setSelectedGoals] = useState([])
  const [goalConfigs, setGoalConfigs] = useState({})

  const toggleGoal = (g) => {
    setSelectedGoals(prev =>
      prev.find(x => x.id === g.id)
        ? prev.filter(x => x.id !== g.id)
        : [...prev, g]
    )
    if (!goalConfigs[g.id]) {
      setGoalConfigs(prev => ({ ...prev, [g.id]: { goal: g.defaultGoal, label: g.label, customUnit: g.unit } }))
    }
  }

  const updateGoalConfig = (id, field, val) => {
    setGoalConfigs(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }))
  }

  const handleFinish = () => {
    const goals = selectedGoals.map(g => ({
      id: g.id + '_' + Date.now(),
      templateId: g.id,
      label: goalConfigs[g.id]?.label || g.label,
      icon: g.icon,
      type: g.type,
      goal: Number(goalConfigs[g.id]?.goal || g.defaultGoal),
      unit: goalConfigs[g.id]?.customUnit || g.unit,
      completedToday: 0,
      totalCompleted: 0,
    }))
    onComplete({ name, peepName: peepName || 'Peep', goals })
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-deep)' }}>
      <style>{`
        .ob-btn {
          padding: 12px 28px; border-radius: 50px; font-weight: 800;
          font-size: 15px; transition: all 0.2s; cursor: pointer;
        }
        .ob-btn-primary {
          background: var(--accent-sun); color: #1a1a2e;
        }
        .ob-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(249,200,70,0.35); }
        .ob-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
        .ob-input {
          width: 100%; padding: 14px 18px; border-radius: 12px;
          background: var(--bg-panel); border: 2px solid var(--border);
          color: var(--text-main); font-size: 16px; font-weight: 600;
          transition: border-color 0.2s; outline: none;
        }
        .ob-input:focus { border-color: var(--accent-sun); }
        .ob-input::placeholder { color: var(--text-muted); }
        .goal-chip {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 16px; border-radius: 12px;
          background: var(--bg-panel); border: 2px solid var(--border);
          cursor: pointer; transition: all 0.18s; font-weight: 700; font-size: 14px;
        }
        .goal-chip:hover { border-color: var(--accent-sky); }
        .goal-chip.selected { border-color: var(--accent-sun); background: rgba(249,200,70,0.1); }
        .goal-config {
          padding: 12px 14px; border-radius: 10px;
          background: rgba(249,200,70,0.07); border: 1px solid rgba(249,200,70,0.2);
          margin-top: 8px;
        }
        .mini-input {
          width: 70px; padding: 6px 10px; border-radius: 8px;
          background: var(--bg-deep); border: 1.5px solid var(--border);
          color: var(--text-main); font-size: 14px; font-weight: 700;
          text-align: center; outline: none;
        }
        .mini-input:focus { border-color: var(--accent-sun); }
        @keyframes fadeUp {
          from { opacity:0; transform: translateY(16px); }
          to   { opacity:1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.4s ease forwards; }
      `}</style>

      {/* Progress dots */}
      <div style={{ display:'flex', justifyContent:'center', gap:8, padding:'20px 0 0' }}>
        {[0,1,2].map(i => (
          <div key={i} style={{
            width: i===step ? 24 : 8, height: 8, borderRadius: 4,
            background: i<=step ? 'var(--accent-sun)' : 'var(--border)',
            transition: 'all 0.3s'
          }}/>
        ))}
      </div>

      {/* Step 0: Welcome + Name */}
      {step === 0 && (
        <div className="fade-up" style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 32px', gap:24 }}>
          <div style={{ fontSize: 80 }}>🐣</div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:26, fontWeight:900, color:'var(--text-main)', marginBottom:8 }}>
              Meet your Peep!
            </div>
            <div style={{ fontSize:14, color:'var(--text-muted)', lineHeight:1.6 }}>
              Your productivity companion that grows as you crush your goals. Feed it by doing the things that matter.
            </div>
          </div>
          <input className="ob-input" placeholder="What's your name?" value={name} onChange={e=>setName(e.target.value)}
            onKeyDown={e=>e.key==='Enter' && name.trim() && setStep(1)}/>
          <button className="ob-btn ob-btn-primary" disabled={!name.trim()} onClick={()=>setStep(1)}>
            Let's go →
          </button>
        </div>
      )}

      {/* Step 1: Name Peep */}
      {step === 1 && (
        <div className="fade-up" style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 32px', gap:24 }}>
          <div style={{ fontSize:72 }}>🐥</div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:22, fontWeight:900 }}>Hi {name}! 👋</div>
            <div style={{ fontSize:14, color:'var(--text-muted)', marginTop:6 }}>
              Give your companion a name.
            </div>
          </div>
          <input className="ob-input" placeholder="Name your Peep (e.g. Sunny)" value={peepName}
            onChange={e=>setPeepName(e.target.value)}
            onKeyDown={e=>e.key==='Enter' && setStep(2)}/>
          <div style={{ display:'flex', gap:12 }}>
            <button className="ob-btn" style={{ background:'var(--bg-panel)', color:'var(--text-muted)' }}
              onClick={()=>setStep(0)}>← Back</button>
            <button className="ob-btn ob-btn-primary" onClick={()=>setStep(2)}>
              {peepName ? `Name it ${peepName}!` : 'Skip'} →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Goals */}
      {step === 2 && (
        <div className="fade-up" style={{ flex:1, display:'flex', flexDirection:'column', padding:'16px 24px 24px' }}>
          <div style={{ textAlign:'center', marginBottom:16 }}>
            <div style={{ fontSize:20, fontWeight:900 }}>What are your goals?</div>
            <div style={{ fontSize:13, color:'var(--text-muted)', marginTop:4 }}>
              Pick what keeps you productive. Set daily targets.
            </div>
          </div>

          <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:8 }}>
            {GOAL_TEMPLATES.map(g => {
              const sel = selectedGoals.find(x => x.id === g.id)
              const cfg = goalConfigs[g.id] || {}
              return (
                <div key={g.id}>
                  <div className={`goal-chip ${sel ? 'selected' : ''}`} onClick={()=>toggleGoal(g)}>
                    <span style={{ fontSize:20 }}>{g.icon}</span>
                    <span style={{ flex:1, color:'var(--text-main)' }}>
                      {g.id === 'custom' && sel ? cfg.label : g.label}
                    </span>
                    <span style={{ fontSize:11, color: sel ? 'var(--accent-sun)' : 'var(--text-muted)', fontWeight:700 }}>
                      {sel ? '✓ ON' : 'OFF'}
                    </span>
                  </div>
                  {sel && (
                    <div className="goal-config">
                      {g.id === 'custom' && (
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                          <span style={{ fontSize:12, color:'var(--text-muted)', fontWeight:700 }}>Name:</span>
                          <input className="mini-input" style={{ width:'100%', textAlign:'left' }}
                            placeholder="e.g. Meditate"
                            value={cfg.label || ''} onChange={e=>updateGoalConfig(g.id, 'label', e.target.value)}/>
                        </div>
                      )}
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:12, color:'var(--text-muted)', fontWeight:700 }}>Daily goal:</span>
                        <input className="mini-input" type="number" min="1" max="999"
                          value={cfg.goal || g.defaultGoal}
                          onChange={e=>updateGoalConfig(g.id, 'goal', e.target.value)}/>
                        <span style={{ fontSize:12, color:'var(--text-muted)' }}>
                          {g.id === 'custom' ? (cfg.customUnit||'tasks') : g.unit}
                        </span>
                        {g.id === 'custom' && (
                          <input className="mini-input" style={{ width:'80px' }}
                            placeholder="unit"
                            value={cfg.customUnit||''} onChange={e=>updateGoalConfig(g.id, 'customUnit', e.target.value)}/>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div style={{ display:'flex', gap:12, marginTop:16 }}>
            <button className="ob-btn" style={{ background:'var(--bg-panel)', color:'var(--text-muted)' }}
              onClick={()=>setStep(1)}>← Back</button>
            <button className="ob-btn ob-btn-primary" style={{ flex:1 }}
              disabled={selectedGoals.length === 0} onClick={handleFinish}>
              Meet {peepName || 'Peep'}! 🐣
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
