import React, { useState } from 'react'
import Nav from './Nav.jsx'
import Dashboard from './Dashboard.jsx'
import Gacha from './Gacha.jsx'
import TeamSelect from './TeamSelect.jsx'
import BattleMap from './BattleMap.jsx'
import Battle from './Battle.jsx'
import { getPeepType, createPeep } from './gameLogic.js'
import { getBattleStats, rollTreasure, getItem, BOSS_REWARD, getBoss, randomBossId } from './game/battle.js'
import { generateMap, getNode } from './game/mapGen.js'
import { combatantFromPeep, combatantFromRunMember, buildEnemyTeam, initBattle } from './game/combat.js'

// ─────────────────────────────────────────────────────────────────────────────
// The foundational state machine. Routes between the four top-level screens
// (Habits / Peeps / Shop / Battle) and owns every cross-cutting mutation:
// gacha pulls, companion/team selection, and the roguelite run lifecycle.
// ─────────────────────────────────────────────────────────────────────────────
export default function GameShell({ save, onSave }) {
  const [view, setView] = useState('habits')
  const [toast, setToast] = useState(null)          // transient reward/info message
  // A live fight lives in save.run.activeCombat = { state, nodeId } so it survives
  // an app reload; the Battle view reads/writes it through the handlers below.

  const { coins = 0, peeps = [], activePeepId, teamIds = [], run } = save
  const teamPeeps = teamIds.map(id => peeps.find(p => p.id === id)).filter(Boolean)

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200) }

  // ── Phase B mutations ───────────────────────────────────────────────────────
  const handleGachaPull = (newPeep, costPaid) => {
    onSave({
      ...save,
      peeps: [...peeps, newPeep],
      activePeepId: peeps.length === 0 ? newPeep.id : activePeepId,
      coins: coins - costPaid,
    })
    flash(`Got ${getPeepType(newPeep.typeId).name}! 🎉`)
  }
  const setActive = (peepId) => { onSave({ ...save, activePeepId: peepId }); flash('Companion set ⭐') }
  const setTeam = (ids) => onSave({ ...save, teamIds: ids })

  // ── Phase C: run lifecycle ──────────────────────────────────────────────────
  const startRun = () => {
    const map = generateMap()
    const start = map.nodes.find(n => n.type === 'start')
    const team = teamPeeps.map(combatantFromPeep)
    const tier = (save.bestTier || 0) + 1   // always push one tier past your best
    const bossId = randomBossId()           // this run's Final Boss
    onSave({ ...save, run: { map, position: start.id, reached: [start.id], team, inventory: [], activeCombat: null, status: 'active', tier, bossId } })
    flash(`Tier ${tier} run started! Pick your path ⚔️`)
  }
  const abandonRun = () => { onSave({ ...save, run: null }); flash('Run abandoned') }

  // Persist updated run team HP + advance to a node.
  const advanceRun = (patch) => onSave({ ...save, run: { ...run, ...patch } })

  const handleSelectNode = (node) => {
    if (node.type === 'rest') {
      const team = run.team.map(c => ({ ...c, hp: Math.min(c.maxHp, c.hp + Math.round(c.maxHp * 0.5)) }))
      advanceRun({ team, position: node.id, reached: [...run.reached, node.id] })
      flash('🏕️ Rested — team healed 50%')
    } else if (node.type === 'treasure') {
      const itemId = rollTreasure()
      advanceRun({ inventory: [...run.inventory, itemId], position: node.id, reached: [...run.reached, node.id] })
      flash(`💎 Found ${getItem(itemId).emoji} ${getItem(itemId).name}!`)
    } else {
      // battle / elite / boss — open a persisted fight
      const depth = node.layer
      const allies = run.team.map(combatantFromRunMember)
      const kind = node.type === 'boss' ? 'boss' : node.type === 'elite' ? 'elite' : 'battle'
      const enemies = buildEnemyTeam(kind, depth, run.tier || 1, getBoss(run.bossId))
      const state = initBattle(allies, enemies, { kind: node.type, inventory: run.inventory })
      onSave({ ...save, run: { ...run, activeCombat: { state, nodeId: node.id } } })
    }
  }

  // Persist every in-fight state change so a reload resumes mid-battle.
  const handleCombatStateChange = (state) => {
    if (!run?.activeCombat) return
    onSave({ ...save, run: { ...run, activeCombat: { ...run.activeCombat, state } } })
  }

  // Combat finished → write HP + leftover items back, grant rewards, advance/end.
  const handleCombatResolve = (finalState) => {
    const node = getNode(run.map, run.activeCombat.nodeId)
    const result = finalState.result
    const finalAllies = finalState.ally
    const inventory = finalState.inventory

    if (result === 'lose') {
      onSave({ ...save, run: { ...run, activeCombat: null, status: 'lost' } })
      flash('💀 Your team fell in the dungeon…')
      return
    }

    // carry HP back into the run team (match by peepId)
    const team = run.team.map(m => {
      const fa = finalAllies.find(a => a.peepId === m.peepId)
      return fa ? { ...m, hp: fa.hp } : m
    })

    // rewards scale with node type and ascension tier
    const tier = run.tier || 1
    const tierCoin = 1 + (tier - 1) * 0.5
    const tierXp = 1 + (tier - 1) * 0.35
    const base = node.type === 'boss' ? { coins: 200, xp: 220 }
      : node.type === 'elite' ? { coins: 40, xp: 80 }
      : { coins: 18, xp: 45 }
    const reward = { coins: Math.round(base.coins * tierCoin), xp: Math.round(base.xp * tierXp) }

    // grant XP to every team peep (feeds Phase A growth) + Gold
    const grownPeeps = peeps.map(p =>
      teamIds.includes(p.id) ? { ...p, xp: p.xp + reward.xp } : p)

    if (node.type === 'boss') {
      // permanent, high-value reward; bank the cleared tier for ascension.
      // The Slayer Peep is themed to the boss and arrives pre-leveled (scales with tier).
      const boss = getBoss(run.bossId)
      const trophyPeep = createPeep(boss.rewardTypeId, `${boss.name.split(' ')[0]} Slayer`)
      trophyPeep.xp = 200 + tier * 150
      const bossCoins = reward.coins + Math.round(BOSS_REWARD.coins * tierCoin)
      onSave({
        ...save,
        peeps: [...grownPeeps, trophyPeep],
        coins: coins + bossCoins,
        bestTier: Math.max(save.bestTier || 0, tier),
        trophies: [...(save.trophies || []), { name: boss.name, tier, peepId: trophyPeep.id, at: Date.now() }],
        run: { ...run, team, inventory, activeCombat: null, status: 'won' },
      })
      flash(`🏆 TIER ${tier} — ${boss.name} DOWN! +${bossCoins}💰 & a ${getPeepType(boss.rewardTypeId).name}!`)
    } else {
      onSave({
        ...save,
        peeps: grownPeeps,
        coins: coins + reward.coins,
        run: { ...run, team, inventory, activeCombat: null, position: node.id, reached: [...run.reached, node.id] },
      })
      flash(`Victory! +${reward.coins}💰  +${reward.xp} XP to team`)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  // Live combat takes over the whole screen (no nav). Resumed automatically after
  // a reload because it's persisted in save.run.activeCombat.
  if (run?.activeCombat) {
    return (
      <Battle
        key={run.activeCombat.nodeId}
        state={run.activeCombat.state}
        onStateChange={handleCombatStateChange}
        onResolve={handleCombatResolve}
      />
    )
  }

  const screen = (() => {
    if (view === 'habits') return <Dashboard save={save} onSave={onSave} onNavigate={setView} />
    if (view === 'shop') return <Gacha coins={coins} onPull={handleGachaPull} onClose={() => setView('habits')} />
    if (view === 'peeps') return (
      <TeamSelect peeps={peeps} activePeepId={activePeepId} teamIds={teamIds}
        onSetActive={setActive} onSetTeam={setTeam} />
    )
    return <BattleView save={save} run={run} teamPeeps={teamPeeps}
      onStart={startRun} onAbandon={abandonRun} onSelectNode={handleSelectNode}
      onEndRun={() => onSave({ ...save, run: null })} onGoto={setView} />
  })()

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {toast && <div style={{
        position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 50,
        background: 'var(--accent-sun)', color: '#1a1a2e', padding: '8px 16px', borderRadius: 50,
        fontSize: 12, fontWeight: 900, boxShadow: '0 4px 20px rgba(249,200,70,0.4)', whiteSpace: 'nowrap',
        maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{toast}</div>}
      <div style={{ flex: 1, minHeight: 0 }}>{screen}</div>
      <Nav view={view} onNavigate={setView} teamCount={teamIds.length} inRun={run?.status === 'active'} />
    </div>
  )
}

// ── Battle tab: gate → intro → map → end screens ───────────────────────────────
function BattleView({ save, run, teamPeeps, onStart, onAbandon, onSelectNode, onEndRun, onGoto }) {
  const bestTier = save.bestTier || 0
  const nextTier = bestTier + 1

  // Gate: need a full team of 3.
  if (teamPeeps.length < 3) {
    return (
      <CenterCard emoji="⚔️" title="Assemble Your Squad"
        body={`The dungeon demands a team of exactly 3 Peeps. You have ${teamPeeps.length}/3 selected.`}
        action={teamPeeps.length < 3 ? { label: '🐣 Go to Peeps', onClick: () => onGoto('peeps') } : null} />
    )
  }

  // End screens.
  if (run?.status === 'won') {
    return <CenterCard emoji="🏆" title={`Tier ${run.tier || 1} Cleared!`}
      body="You beat the boss and claimed a permanent reward. The next run unlocks a tougher tier with richer loot — keep your Peeps growing!"
      action={{ label: 'Return Home', onClick: onEndRun }} />
  }
  if (run?.status === 'lost') {
    return <CenterCard emoji="💀" title="Run Failed"
      body="Your team was defeated. Level up your Peeps with habits and try again."
      action={{ label: 'Leave Dungeon', onClick: onEndRun }} />
  }

  // No active run → intro with team preview.
  if (!run) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center',
        alignItems: 'center', padding: 24, gap: 16, background: 'var(--bg-deep)', textAlign: 'center' }}>
        <div style={{ fontSize: 54 }}>🗺️</div>
        <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--accent-rose)' }}>Enter the Dungeon</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--accent-sun)', background: 'rgba(249,200,70,0.12)',
            border: '1px solid var(--accent-sun)', borderRadius: 50, padding: '4px 12px' }}>
            ⚔️ Tier {nextTier}
          </span>
          {bestTier > 0 && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>best cleared: {bestTier}</span>}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, maxWidth: 280 }}>
          A procedurally-generated path of battles, treasures, and rest stops leads to the Final Boss.
          {bestTier > 0 && ' Each tier is tougher — and pays out more.'}
        </div>
        <div style={{ display: 'flex', gap: 14, margin: '8px 0' }}>
          {teamPeeps.map(p => {
            const s = getBattleStats(p)
            return (
              <div key={p.id} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 40 }}>{s.emoji}</div>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-main)' }}>{p.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>Lv.{s.level} · ❤️{s.maxHp}</div>
              </div>
            )
          })}
        </div>
        <button onClick={onStart} style={{ padding: '13px 30px', borderRadius: 50, fontSize: 15, fontWeight: 900,
          background: 'var(--accent-rose)', color: 'white', cursor: 'pointer', boxShadow: '0 4px 18px rgba(232,118,138,0.4)' }}>
          ⚔️ Start Run
        </button>
      </div>
    )
  }

  // Active run → the map.
  return <BattleMap run={run} onSelectNode={onSelectNode} onAbandon={onAbandon} />
}

function CenterCard({ emoji, title, body, action }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center',
      alignItems: 'center', padding: 28, gap: 14, background: 'var(--bg-deep)', textAlign: 'center' }}>
      <div style={{ fontSize: 56 }}>{emoji}</div>
      <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--accent-sun)' }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, maxWidth: 300 }}>{body}</div>
      {action && (
        <button onClick={action.onClick} style={{ marginTop: 6, padding: '12px 26px', borderRadius: 50,
          fontSize: 14, fontWeight: 900, background: 'var(--accent-sun)', color: '#1a1a2e', cursor: 'pointer' }}>
          {action.label}
        </button>
      )}
    </div>
  )
}
