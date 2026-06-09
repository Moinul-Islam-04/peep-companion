import React, { useState } from 'react'
import PeepCharacter from './PeepCharacter.jsx'
import { GACHA_BOXES, PEEP_TYPES, getPeepType, performGachaPull } from './gameLogic.js'

export default function Gacha({ coins, onPull, onClose }) {
  const [selectedBox, setSelectedBox] = useState(null)
  const [pulling, setPulling] = useState(false)
  const [pulledPeep, setPulledPeep] = useState(null)
  const [showResult, setShowResult] = useState(false)

  const handlePull = (boxId) => {
    const box = GACHA_BOXES.find(b => b.id === boxId)
    if (!box || coins < box.cost) return

    setPulling(true)
    
    // Animate the pull
    setTimeout(() => {
      const newPeep = performGachaPull(boxId)
      setPulledPeep(newPeep)
      setShowResult(true)
      onPull(newPeep, box.cost)
      setPulling(false)
    }, 1500)
  }

  const closePullResult = () => {
    setShowResult(false)
    setPulledPeep(null)
    setSelectedBox(null)
  }

  const peepType = pulledPeep ? getPeepType(pulledPeep.typeId) : null

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(180deg, #2d2d44 0%, #1a1a2e 100%)',
      overflow: 'hidden'
    }}>
      <style>{`
        .gacha-header {
          padding: 16px 20px;
          borderBottom: 1px solid rgba(255,255,255,0.1);
          display: flex;
          justifyContent: space-between;
          alignItems: center;
        }
        .gacha-title {
          fontSize: 18px;
          fontWeight: 900;
          color: #f9c846;
        }
        .coin-display {
          display: flex;
          alignItems: center;
          gap: 6px;
          fontSize: 14px;
          fontWeight: 800;
          color: #f9c846;
          background: rgba(249,200,70,0.1);
          padding: 8px 14px;
          borderRadius: 20px;
          border: 1px solid rgba(249,200,70,0.3);
        }
        .gacha-container {
          flex: 1;
          overflowY: auto;
          padding: 20px;
          display: flex;
          flexDirection: column;
          gap: 12px;
        }
        .box-option {
          padding: 16px;
          borderRadius: 12px;
          border: 2px solid;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          justifyContent: space-between;
          alignItems: center;
        }
        .box-option:hover { transform: translateY(-2px); }
        .box-option.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .box-info {
          display: flex;
          flexDirection: column;
          gap: 4px;
        }
        .box-name {
          fontSize: 14px;
          fontWeight: 800;
        }
        .box-rates {
          fontSize: 11px;
          opacity: 0.7;
        }
        .cost-btn {
          padding: 10px 20px;
          borderRadius: 8px;
          fontWeight: 800;
          fontSize: 13px;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
          whiteSpace: nowrap;
        }
        .cost-btn:hover:not(:disabled) { transform: scale(1.05); }
        .cost-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        @keyframes gachaSpin {
          0% { transform: scale(0.3) rotate(0deg); opacity: 0; }
          50% { transform: scale(1) rotate(180deg); }
          100% { transform: scale(1) rotate(360deg) scale(1.1); opacity: 1; }
        }
        .gacha-spinning { animation: gachaSpin 1.5s ease forwards; }
        .result-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.8);
          display: flex;
          flexDirection: column;
          alignItems: center;
          justifyContent: center;
          zIndex: 1000;
        }
        .result-box {
          background: linear-gradient(180deg, #2d2d44 0%, #1a1a2e 100%);
          borderRadius: 20px;
          padding: 40px 30px;
          textAlign: center;
          maxWidth: 400px;
          border: 3px solid;
          animation: resultPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes resultPop {
          0% { transform: scale(0.3); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .rarity-common { borderColor: #f9c846; }
        .rarity-rare { borderColor: #b399ff; }
        .rarity-ultra { borderColor: #ff6b6b; }
        .result-emoji {
          fontSize: 120px;
          marginBottom: 16px;
        }
        .result-name {
          fontSize: 18px;
          fontWeight: 900;
          marginBottom: 4px;
        }
        .result-rarity {
          fontSize: 12px;
          fontWeight: 800;
          textTransform: uppercase;
          letterSpacing: 0.1em;
          marginBottom: 20px;
        }
        .result-btn {
          padding: 12px 28px;
          borderRadius: 8px;
          border: none;
          fontWeight: 800;
          fontSize: 14px;
          cursor: pointer;
          background: #6edbaf;
          color: #1a1a2e;
          transition: all 0.2s;
        }
        .result-btn:hover { transform: translateY(-2px); }
      `}</style>

      {/* Header */}
      <div className="gacha-header">
        <div className="gacha-title">🎲 Gacha Draw</div>
        <button onClick={onClose} style={{
          background: 'transparent',
          border: 'none',
          color: '#ccc',
          fontSize: 20,
          cursor: 'pointer',
          padding: '4px 8px'
        }}>✕</button>
      </div>

      {/* Coin Display */}
      <div style={{ padding: '0 20px 12px' }}>
        <div className="coin-display">
          💰 {coins} coins
        </div>
      </div>

      {/* Gacha Boxes */}
      <div className="gacha-container">
        {GACHA_BOXES.map(box => {
          const canAfford = coins >= box.cost
          const rarityTypes = [...new Set(box.pulls.map(p => p.rarity))]
          return (
            <div
              key={box.id}
              className={`box-option ${!canAfford ? 'disabled' : ''}`}
              style={{
                borderColor: box.color,
                background: `linear-gradient(135deg, ${box.color}15, transparent)`,
              }}
            >
              <div className="box-info">
                <div className="box-name" style={{ color: box.color }}>
                  {box.name}
                </div>
                <div className="box-rates" style={{ color: box.color }}>
                  {rarityTypes.length === 1
                    ? `${rarityTypes[0]}`
                    : `${rarityTypes.join(' / ')}`
                  }
                </div>
              </div>
              <button
                className="cost-btn"
                style={{
                  background: canAfford ? box.color : '#666',
                  color: box.id === 'legendary' ? 'white' : '#1a1a2e',
                }}
                disabled={!canAfford || pulling}
                onClick={() => handlePull(box.id)}
              >
                {box.cost} 💰
              </button>
            </div>
          )
        })}
      </div>

      {/* Result Overlay */}
      {showResult && pulledPeep && peepType && (
        <div className="result-overlay" onClick={closePullResult}>
          <div
            className={`result-box rarity-${peepType.rarity}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="result-emoji">{peepType.emoji}</div>
            <div className="result-name">{peepType.name}</div>
            <div
              className="result-rarity"
              style={{
                color: peepType.color,
              }}
            >
              {peepType.rarity === 'common' ? '⭐ Common' : 
               peepType.rarity === 'rare' ? '⭐⭐⭐ Rare' :
               '⭐⭐⭐⭐ Ultra Rare'}
            </div>
            <button className="result-btn" onClick={closePullResult}>
              Got it! 🎉
            </button>
          </div>
        </div>
      )}

      {pulling && (
        <div className="result-overlay" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="gacha-spinning" style={{ fontSize: 80 }}>🎁</div>
        </div>
      )}
    </div>
  )
}
