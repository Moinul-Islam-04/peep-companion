import React, { useState, useEffect, useRef } from 'react'
import PeepCharacter from './PeepCharacter.jsx'
import { getStage, getNextStage, getMoodLevel, isSameDay, getPeepType } from './gameLogic.js'
import { GOAL_TEMPLATES } from './goalTemplates.js'

export default function Dashboard({ save, onSave, onNavigate }) {
  const [animating, setAnimating] = useState(false)
  const [celebrateMsg, setCelebrateMsg] = useState(null)
  const [activeTimer, setActiveTimer] = useState(null)
  const [timerInterval, setTimerInterval] = useState(null)
  const [activeTab, setActiveTab] = useState('tasks') // 'tasks' | 'log'
  const [particles, setParticles] = useState([])
  const [showAddTask, setShowAddTask] = useState(false)
  const [addTaskConfig, setAddTaskConfig] = useState({})
  const timerRef = useRef(null)

  const { coins = 0, peeps = [], activePeepId, profile, tasks, log, streak } = save
  const activePeep = peeps.find(p => p.id === activePeepId) || peeps[0]
  const activePeepType = activePeep ? getPeepType(activePeep.typeId) : null
  
  const stage = getStage(activePeep?.xp || 0)
  const nextStage = getNextStage(activePeep?.xp || 0)
  const mood = getMoodLevel(activePeep?.happiness || 70)
  const xpToNext = nextStage ? nextStage.minXP - (activePeep?.xp || 0) : 0
  const xpProgress = nextStage
    ? (((activePeep?.xp || 0) - stage.minXP) / (nextStage.minXP - stage.minXP)) * 100
    : 100

  // Reset daily counts at midnight
  useEffect(() => {
    const today = new Date().toDateString()
    const lastReset = save.lastReset
    if (lastReset !== today) {
      const updatedTasks = tasks.map(t => ({ ...t, completedToday: 0 }))
      onSave({ ...save, tasks: updatedTasks, lastReset: today })
    }
  }, [])

  const triggerCelebration = (msg, xpGained, coinsEarned = 0) => {
    setAnimating(true)
    setCelebrateMsg(msg)
    setParticles(Array.from({ length: 8 }, (_, i) => ({
      id: Date.now() + i,
      x: 30 + Math.random() * 40,
      emoji: ['⭐','✨','💫','🌟','🎉'][Math.floor(Math.random()*5)]
    })))
    setTimeout(() => setAnimating(false), 700)
    setTimeout(() => { setCelebrateMsg(null); setParticles([]) }, 2200)
  }

  const completeCount = (task) => {
    const newCompleted = task.completedToday + 1
    const justCompleted = newCompleted === task.goal
    const xpGained = justCompleted ? 25 : 5
    const coinsEarned = justCompleted ? 5 : 1

    const newHappiness = Math.min(100, activePeep.happiness + (justCompleted ? 15 : 5))
    const newXP = activePeep.xp + xpGained
    const newCoins = coins + coinsEarned

    const updatedPeeps = peeps.map(p =>
      p.id === activePeepId
        ? { ...p, xp: newXP, happiness: newHappiness, lastCheckin: Date.now() }
        : p
    )

    const newTasks = tasks.map(t =>
      t.id === task.id ? { ...t, completedToday: newCompleted, totalCompleted: t.totalCompleted + 1 } : t
    )
    const newLog = [
      { timestamp: Date.now(), taskId: task.id, label: task.label, icon: task.icon, xpEarned: xpGained, coinsEarned, note: justCompleted ? '🎯 Goal reached!' : null },
      ...log.slice(0, 49)
    ]

    onSave({ ...save, peeps: updatedPeeps, tasks: newTasks, log: newLog, coins: newCoins })
    triggerCelebration(justCompleted ? `🎯 ${task.label} done!` : `+${xpGained} XP • +${coinsEarned} 💰`, xpGained, coinsEarned)
  }

  const startTimer = (task) => {
    if (timerInterval) { clearInterval(timerInterval); setTimerInterval(null) }
    const start = Date.now()
    setActiveTimer({ taskId: task.id, elapsed: 0, start })
    const iv = setInterval(() => {
      setActiveTimer(prev => prev ? { ...prev, elapsed: Math.floor((Date.now() - prev.start) / 1000) } : null)
    }, 1000)
    setTimerInterval(iv)
    timerRef.current = iv
  }

  const stopTimer = (task) => {
    if (timerInterval) { clearInterval(timerInterval); setTimerInterval(null) }
    const elapsed = activeTimer?.elapsed || 0
    const minutesCompleted = Math.floor(elapsed / 60)
    setActiveTimer(null)

    if (minutesCompleted < 1) return // too short

    const prevMinutes = task.completedToday
    const newMinutes = prevMinutes + minutesCompleted
    const wasComplete = prevMinutes >= task.goal
    const nowComplete = newMinutes >= task.goal
    const justCompleted = !wasComplete && nowComplete

    const xpGained = Math.min(40, Math.floor(minutesCompleted / 5) * 5 + (justCompleted ? 25 : 0))
    const coinsEarned = Math.floor(minutesCompleted / 10) + (justCompleted ? 3 : 0)
    const newHappiness = Math.min(100, activePeep.happiness + (justCompleted ? 15 : Math.min(8, Math.floor(minutesCompleted/5)*2)))
    const newXP = activePeep.xp + xpGained
    const newCoins = coins + coinsEarned

    const updatedPeeps = peeps.map(p =>
      p.id === activePeepId
        ? { ...p, xp: newXP, happiness: newHappiness, lastCheckin: Date.now() }
        : p
    )

    const newTasks = tasks.map(t =>
      t.id === task.id ? { ...t, completedToday: newMinutes, totalCompleted: t.totalCompleted + minutesCompleted } : t
    )
    const newLog = [
      { timestamp: Date.now(), taskId: task.id, label: task.label, icon: task.icon, xpEarned: xpGained, coinsEarned, note: justCompleted ? '🎯 Goal reached!' : `${minutesCompleted}min session` },
      ...log.slice(0, 49)
    ]

    onSave({ ...save, peeps: updatedPeeps, tasks: newTasks, log: newLog, coins: newCoins })
    if (xpGained > 0) triggerCelebration(justCompleted ? `🎯 ${task.label} done!` : `+${minutesCompleted}min logged!`, xpGained, coinsEarned)
  }

  const formatElapsed = (s) => {
    const m = Math.floor(s/60), sec = s%60
    return `${m}:${sec.toString().padStart(2,'0')}`
  }

  const removeTask = (taskId) => {
    const newTasks = tasks.filter(t => t.id !== taskId)
    onSave({ ...save, tasks: newTasks })
  }

  const addNewTask = (templateId) => {
    const template = GOAL_TEMPLATES.find(t => t.id === templateId)
    if (!template) return

    const cfg = addTaskConfig[templateId] || {}
    const newTask = {
      id: template.id + '_' + Date.now(),
      templateId: template.id,
      label: cfg.label || template.label,
      icon: template.icon,
      type: template.type,
      goal: Number(cfg.goal || template.defaultGoal),
      unit: cfg.customUnit || template.unit,
      completedToday: 0,
      totalCompleted: 0,
    }

    const newTasks = [...tasks, newTask]
    onSave({ ...save, tasks: newTasks })
    
    // Reset and close
    setAddTaskConfig({})
    setShowAddTask(false)
    triggerCelebration(`Added ${newTask.label}!`, 0)
  }

  const updateAddTaskConfig = (id, field, val) => {
    setAddTaskConfig(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }))
  }

  const moodColors = {
    ecstatic: 'var(--accent-sun)', happy: 'var(--accent-mint)',
    neutral: 'var(--accent-sky)', sad: 'var(--accent-rose)', neglected: 'var(--text-muted)'
  }
  const moodLabels = {
    ecstatic: '🤩 Ecstatic!', happy: '😊 Happy', neutral: '😐 Okay',
    sad: '😢 Sad', neglected: '💤 Neglected'
  }

  const allTasksDone = tasks.every(t => t.completedToday >= t.goal)

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', background:'var(--bg-deep)', position:'relative', overflow:'hidden' }}>
      <style>{`
        .tab-btn {
          flex:1; padding:8px; border-radius:8px; font-size:13px; font-weight:800;
          background:transparent; color:var(--text-muted); transition:all 0.2s; cursor:pointer;
        }
        .tab-btn.active { background:var(--accent-sun); color:#1a1a2e; }
        .task-card {
          background:var(--bg-card); border-radius:14px; padding:14px 16px;
          border:1.5px solid var(--border); transition:border-color 0.2s;
        }
        .task-card.done { border-color:rgba(110,219,176,0.4); background:rgba(110,219,176,0.05); }
        .action-btn {
          padding:8px 16px; border-radius:50px; font-size:12px; font-weight:800;
          transition:all 0.18s; cursor:pointer;
        }
        .action-btn:hover { transform:translateY(-1px); }
        .action-btn:active { transform:scale(0.96); }
        .progress-bar-bg {
          height:6px; border-radius:3px; background:var(--bg-panel); overflow:hidden;
        }
        .progress-bar-fill {
          height:100%; border-radius:3px; transition:width 0.5s ease;
        }
        @keyframes particleFly {
          0% { opacity:1; transform: translateY(0) scale(1); }
          100% { opacity:0; transform: translateY(-60px) scale(0.5); }
        }
        .particle { position:absolute; animation: particleFly 1.5s ease forwards; font-size:20px; pointer-events:none; }
        @keyframes msgPop {
          0% { opacity:0; transform:translateY(10px) scale(0.8); }
          20% { opacity:1; transform:translateY(-4px) scale(1.05); }
          80% { opacity:1; transform:translateY(-4px) scale(1); }
          100% { opacity:0; transform:translateY(-20px) scale(0.9); }
        }
        .celebrate-msg {
          position:absolute; top:48%; left:50%; transform:translateX(-50%);
          background:var(--accent-sun); color:#1a1a2e; padding:8px 20px;
          border-radius:50px; font-weight:900; font-size:14px; z-index:20;
          animation: msgPop 2.2s ease forwards; white-space:nowrap;
          box-shadow: 0 4px 20px rgba(249,200,70,0.4);
        }
        .log-entry {
          display:flex; align-items:center; gap:10px; padding:10px 12px;
          background:var(--bg-card); border-radius:10px; border:1px solid var(--border);
        }
      `}</style>

      {/* Particles */}
      {particles.map(p => (
        <div key={p.id} className="particle" style={{ left:`${p.x}%`, top:'38%', animationDelay:`${Math.random()*0.3}s` }}>
          {p.emoji}
        </div>
      ))}
      {celebrateMsg && <div className="celebrate-msg">{celebrateMsg}</div>}

      {/* Peep Section */}
      <div style={{ padding:'16px 24px 8px', background:`linear-gradient(180deg, var(--bg-panel) 0%, var(--bg-deep) 100%)` }}>
        {/* Stage + mood + coins row */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8, gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize:11, fontWeight:800, color:'var(--text-muted)', letterSpacing:'0.1em', textTransform:'uppercase' }}>
              {activePeep?.name || profile.peepName}
            </div>
            <div style={{ fontSize:16, fontWeight:900, color:'var(--accent-sun)' }}>
              {stage.emoji} {stage.name}
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap: 4 }}>
            <div style={{ fontSize:11, fontWeight:800, color: moodColors[mood], textTransform:'uppercase', letterSpacing:'0.05em' }}>
              {moodLabels[mood]}
            </div>
            <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700 }}>
              {streak > 0 ? `🔥 ${streak} day streak` : 'No streak yet'}
            </div>
            <button onClick={() => onNavigate?.('peeps')} style={{
              padding: '4px 10px',
              background: 'rgba(110,219,176,0.15)',
              border: '1px solid var(--accent-mint)',
              color: 'var(--accent-mint)',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              marginTop: 2
            }}>
              🐣 {peeps.length}
            </button>
          </div>
          <button onClick={() => onNavigate?.('shop')} style={{
            padding: '6px 12px',
            background: 'rgba(249,200,70,0.2)',
            border: '1px solid var(--accent-sun)',
            color: 'var(--accent-sun)',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            💰 {coins}
          </button>
        </div>

        {/* Peep character */}
        <div style={{ position:'relative', margin:'0 auto', width:'fit-content' }}>
          <PeepCharacter mood={mood} stageIndex={stage.index} isAnimating={animating} size={150} />
        </div>

        {/* XP bar */}
        <div style={{ marginTop:6 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
            <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700 }}>XP {activePeep?.xp || 0}</span>
            <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700 }}>
              {nextStage ? `${xpToNext} to ${nextStage.name}` : '✨ Max level!'}
            </span>
          </div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width:`${Math.min(100,xpProgress)}%`, background:`linear-gradient(90deg, var(--accent-sun), var(--accent-rose))` }}/>
          </div>
        </div>

        {/* Happiness bar */}
        <div style={{ marginTop:6 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
            <span style={{ fontSize:11, color:'var(--text-muted)', fontWeight:700 }}>Happiness</span>
            <span style={{ fontSize:11, color: moodColors[mood], fontWeight:800 }}>{activePeep?.happiness || 70}%</span>
          </div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width:`${activePeep?.happiness || 70}%`, background: moodColors[mood] }}/>
          </div>
        </div>

        {allTasksDone && (
          <div style={{ marginTop:8, textAlign:'center', fontSize:12, fontWeight:800, color:'var(--accent-mint)',
            background:'rgba(110,219,176,0.1)', borderRadius:8, padding:'6px 12px' }}>
            🎉 All tasks done today! {profile.peepName} is thriving!
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:6, padding:'0 16px 8px', background:'var(--bg-panel)' }}>
        <button className={`tab-btn ${activeTab==='tasks'?'active':''}`} onClick={()=>setActiveTab('tasks')}>Tasks</button>
        <button className={`tab-btn ${activeTab==='log'?'active':''}`} onClick={()=>setActiveTab('log')}>Activity Log</button>
      </div>

      {/* Tasks */}
      {activeTab === 'tasks' && (
        <div style={{ flex:1, overflowY:'auto', padding:'12px 16px', display:'flex', flexDirection:'column', gap:10 }}>
          {tasks.map(task => {
            const done = task.completedToday >= task.goal
            const progress = Math.min(1, task.completedToday / task.goal)
            const isRunning = activeTimer?.taskId === task.id

            return (
              <div key={task.id} className={`task-card ${done?'done':''}`}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, flex:1 }}>
                    <span style={{ fontSize:20 }}>{task.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:800, color:'var(--text-main)' }}>{task.label}</div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', fontWeight:600 }}>
                        {task.type === 'timer'
                          ? `${task.completedToday} / ${task.goal} ${task.unit}`
                          : `${task.completedToday} / ${task.goal} ${task.unit}`
                        }
                        {done && ' ✓'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                    {task.type === 'count' ? (
                      <button className="action-btn"
                        style={{ background: done ? 'rgba(110,219,176,0.15)' : 'var(--accent-sun)', color: done ? 'var(--accent-mint)' : '#1a1a2e' }}
                        onClick={()=>completeCount(task)}>
                        {done ? '✓ Done' : `+1`}
                      </button>
                    ) : (
                      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                        {isRunning && (
                          <span style={{ fontSize:13, fontWeight:900, color:'var(--accent-sky)', fontFamily:'Space Mono, monospace' }}>
                            {formatElapsed(activeTimer.elapsed)}
                          </span>
                        )}
                        <button className="action-btn"
                          style={{ background: isRunning ? 'var(--accent-rose)' : done ? 'rgba(110,219,176,0.15)' : 'var(--accent-sky)', color: isRunning ? 'white' : done ? 'var(--accent-mint)' : '#1a1a2e' }}
                          onClick={()=> isRunning ? stopTimer(task) : startTimer(task)}>
                          {isRunning ? '⏹ Stop' : done ? '✓ Done' : '▶ Start'}
                        </button>
                      </div>
                    )}
                    <button className="action-btn"
                      style={{ background:'rgba(232,118,138,0.2)', color:'var(--accent-rose)', padding:'8px 10px', lineHeight:'1' }}
                      onClick={()=>removeTask(task.id)}
                      title="Remove task">
                      ✕
                    </button>
                  </div>
                </div>

                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{
                    width:`${progress*100}%`,
                    background: done ? 'var(--accent-mint)' : 'linear-gradient(90deg, var(--accent-sky), var(--accent-sun))'
                  }}/>
                </div>
              </div>
            )
          })}

          <button style={{
            padding:'12px 16px', borderRadius:'12px', background:'rgba(249,200,70,0.1)',
            border:'2px dashed var(--accent-sun)', color:'var(--accent-sun)', fontWeight:800,
            cursor:'pointer', fontSize:14, transition:'all 0.2s', marginBottom:8
          }} onClick={()=>setShowAddTask(!showAddTask)}>
            {showAddTask ? '✕ Cancel' : '+ Add Task'}
          </button>

          {showAddTask && (
            <div style={{
              background:'rgba(249,200,70,0.08)', borderRadius:'12px',
              padding:'14px', border:'1px solid rgba(249,200,70,0.2)', marginBottom:8
            }}>
              <div style={{ fontSize:12, fontWeight:800, color:'var(--text-muted)', marginBottom:10, textTransform:'uppercase' }}>
                Select a goal to add
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {GOAL_TEMPLATES.map(g => {
                  const cfg = addTaskConfig[g.id] || {}
                  return (
                    <div key={g.id}>
                      <div style={{
                        display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
                        background:'var(--bg-card)', borderRadius:'10px', cursor:'pointer',
                        border:'1.5px solid var(--border)', transition:'all 0.18s',
                        hover: { borderColor:'var(--accent-sun)' }
                      }} onClick={() => {
                        if (!addTaskConfig[g.id]) {
                          setAddTaskConfig(prev => ({ ...prev, [g.id]: { goal: g.defaultGoal, label: g.label, customUnit: g.unit } }))
                        } else {
                          const newCfg = { ...addTaskConfig }
                          delete newCfg[g.id]
                          setAddTaskConfig(newCfg)
                        }
                      }}>
                        <span style={{ fontSize:18 }}>{g.icon}</span>
                        <span style={{ flex:1, color:'var(--text-main)', fontWeight:700 }}>
                          {g.id === 'custom' && addTaskConfig[g.id] ? cfg.label : g.label}
                        </span>
                        <span style={{ fontSize:11, fontWeight:700, color: addTaskConfig[g.id] ? 'var(--accent-sun)' : 'var(--text-muted)' }}>
                          {addTaskConfig[g.id] ? '✓' : '○'}
                        </span>
                      </div>
                      {addTaskConfig[g.id] && (
                        <div style={{
                          padding:'10px 12px', marginTop:6, borderRadius:'8px',
                          background:'rgba(110,219,176,0.05)', border:'1px solid rgba(110,219,176,0.2)'
                        }}>
                          {g.id === 'custom' && (
                            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                              <span style={{ fontSize:12, color:'var(--text-muted)', fontWeight:700, minWidth:'50px' }}>Name:</span>
                              <input style={{
                                flex:1, padding:'6px 10px', borderRadius:'8px',
                                background:'var(--bg-deep)', border:'1.5px solid var(--border)',
                                color:'var(--text-main)', fontSize:14, fontWeight:700,
                                outline:'none'
                              }} placeholder="e.g. Meditate"
                                value={cfg.label || ''} onChange={e=>updateAddTaskConfig(g.id, 'label', e.target.value)}/>
                            </div>
                          )}
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ fontSize:12, color:'var(--text-muted)', fontWeight:700, minWidth:'50px' }}>Goal:</span>
                            <input type="number" min="1" max="999" style={{
                              width:'60px', padding:'6px 10px', borderRadius:'8px',
                              background:'var(--bg-deep)', border:'1.5px solid var(--border)',
                              color:'var(--text-main)', fontSize:14, fontWeight:700,
                              textAlign:'center', outline:'none'
                            }}
                              value={cfg.goal || g.defaultGoal}
                              onChange={e=>updateAddTaskConfig(g.id, 'goal', e.target.value)}/>
                            <span style={{ fontSize:12, color:'var(--text-muted)' }}>
                              {g.id === 'custom' ? (cfg.customUnit || 'tasks') : g.unit}
                            </span>
                          </div>
                          <button style={{
                            width:'100%', marginTop:8, padding:'6px 12px', borderRadius:'8px',
                            background:'var(--accent-mint)', color:'#1a1a2e', fontWeight:800,
                            cursor:'pointer', fontSize:12, transition:'all 0.2s', border:'none'
                          }} onClick={() => addNewTask(g.id)}>
                            Add {cfg.label || g.label}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div style={{ height:8 }}/>
        </div>
      )}

      {/* Log */}
      {activeTab === 'log' && (
        <div style={{ flex:1, overflowY:'auto', padding:'12px 16px', display:'flex', flexDirection:'column', gap:8 }}>
          {log.length === 0 && (
            <div style={{ textAlign:'center', color:'var(--text-muted)', marginTop:40, fontSize:14, fontWeight:700 }}>
              <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
              No activity yet. Start a task!
            </div>
          )}
          {log.map((entry, i) => {
            const d = new Date(entry.timestamp)
            return (
              <div key={i} className="log-entry">
                <span style={{ fontSize:18 }}>{entry.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:800, color:'var(--text-main)' }}>{entry.label}</div>
                  {entry.note && <div style={{ fontSize:11, color:'var(--accent-mint)', fontWeight:700 }}>{entry.note}</div>}
                  <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                    {d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} · {d.toLocaleDateString()}
                  </div>
                </div>
                <div style={{ fontSize:12, fontWeight:900, color:'var(--accent-sun)' }}>+{entry.xpEarned} XP</div>
              </div>
            )
          })}
          <div style={{ height:8 }}/>
        </div>
      )}
    </div>
  )
}
