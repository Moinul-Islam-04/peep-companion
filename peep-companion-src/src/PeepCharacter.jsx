import React, { useEffect, useRef } from 'react'

// mood: 'ecstatic' | 'happy' | 'neutral' | 'sad' | 'neglected'
// stage index: 0=egg, 1=hatchling, 2=chick, 3=flapper, 4=pro
export default function PeepCharacter({ mood, stageIndex, isAnimating, size = 180 }) {
  const animClass = isAnimating ? 'peep-bounce' : 'peep-idle'

  const colors = {
    ecstatic: { body: '#f9c846', cheek: '#f47c7c', eye: '#1a1a2e' },
    happy:    { body: '#f9c846', cheek: '#f9a5b0', eye: '#1a1a2e' },
    neutral:  { body: '#e8c84a', cheek: '#e8b4b8', eye: '#1a1a2e' },
    sad:      { body: '#c4ae3a', cheek: '#c4a0a4', eye: '#1a1a2e' },
    neglected:{ body: '#a89030', cheek: '#a08090', eye: '#1a1a2e' },
  }

  const c = colors[mood] || colors.happy

  const renderPeep = () => {
    if (stageIndex === 0) return renderEgg(c)
    if (stageIndex === 1) return renderHatchling(c, mood)
    return renderChick(c, mood, stageIndex)
  }

  return (
    <div className={`peep-wrapper ${animClass}`} style={{ width: size, height: size, margin: '0 auto' }}>
      <style>{`
        .peep-wrapper { display: flex; align-items: center; justify-content: center; }
        @keyframes peepIdle {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          25% { transform: translateY(-4px) rotate(-1deg); }
          75% { transform: translateY(-2px) rotate(1deg); }
        }
        @keyframes peepBounce {
          0% { transform: scale(1) translateY(0); }
          20% { transform: scale(1.15, 0.9) translateY(0); }
          40% { transform: scale(0.95, 1.1) translateY(-20px); }
          60% { transform: scale(1.05, 0.95) translateY(0); }
          80% { transform: scale(0.98, 1.02) translateY(-6px); }
          100% { transform: scale(1) translateY(0); }
        }
        .peep-idle svg { animation: peepIdle 3s ease-in-out infinite; }
        .peep-bounce svg { animation: peepBounce 0.6s cubic-bezier(.36,.07,.19,.97); }
        @keyframes starPop {
          0% { opacity:1; transform: scale(0) translateY(0); }
          60% { opacity:1; transform: scale(1.2) translateY(-12px); }
          100% { opacity:0; transform: scale(0.8) translateY(-24px); }
        }
        .star { animation: starPop 0.7s ease forwards; }
      `}</style>
      {renderPeep()}
    </div>
  )

  function renderEgg(c) {
    return (
      <svg width={size} height={size} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="100" cy="110" rx="55" ry="68" fill={c.body} />
        <ellipse cx="100" cy="110" rx="55" ry="68" fill="none" stroke="#c8a820" strokeWidth="3" opacity="0.4"/>
        {/* Crack lines for hinting life */}
        <path d="M90 70 L96 80 L88 88" stroke="#c8a820" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        {/* Speckles */}
        <circle cx="80" cy="100" r="3" fill="#e8b820" opacity="0.5"/>
        <circle cx="120" cy="115" r="2.5" fill="#e8b820" opacity="0.4"/>
        <circle cx="95" cy="130" r="2" fill="#e8b820" opacity="0.4"/>
        {/* Shine */}
        <ellipse cx="80" cy="82" rx="10" ry="7" fill="white" opacity="0.18" transform="rotate(-20 80 82)"/>
      </svg>
    )
  }

  function renderHatchling(c, mood) {
    const eyeShape = mood === 'ecstatic' ? '^^' : mood === 'sad' ? 'sad' : 'normal'
    return (
      <svg width={size} height={size} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        {/* Shell bottom */}
        <ellipse cx="100" cy="148" rx="42" ry="22" fill="#e8c830" opacity="0.9"/>
        {/* Shell top with crack */}
        <path d="M62 148 Q68 100 100 95 Q132 100 138 148 Z" fill="#f0d040" />
        <path d="M88 100 L95 112 L86 120" stroke="#c8a820" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        {/* Head peeking out */}
        <circle cx="100" cy="88" r="36" fill={c.body} />
        {/* Tiny wings */}
        <ellipse cx="67" cy="108" rx="12" ry="8" fill={c.body} transform="rotate(-30 67 108)"/>
        <ellipse cx="133" cy="108" rx="12" ry="8" fill={c.body} transform="rotate(30 133 108)"/>
        {/* Eyes */}
        {renderEyes(eyeShape, 100, 88, c, 7)}
        {/* Beak */}
        <path d="M96 97 L100 103 L104 97 Z" fill="#f47c20" />
        {/* Cheeks */}
        <circle cx="80" cy="96" r="8" fill={c.cheek} opacity="0.55"/>
        <circle cx="120" cy="96" r="8" fill={c.cheek} opacity="0.55"/>
        {/* Head tuft */}
        <ellipse cx="100" cy="55" rx="6" ry="10" fill={c.body} transform="rotate(-10 100 55)"/>
        <ellipse cx="110" cy="57" rx="5" ry="9" fill={c.body} transform="rotate(10 110 57)"/>
      </svg>
    )
  }

  function renderChick(c, mood, si) {
    const eyeShape = mood === 'ecstatic' ? 'star' : mood === 'sad' ? 'sad' : 'normal'
    const wingSpread = si >= 3 ? 20 : 10
    return (
      <svg width={size} height={size} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        {/* Shadow */}
        <ellipse cx="100" cy="178" rx="38" ry="7" fill="#000" opacity="0.15"/>
        {/* Body */}
        <ellipse cx="100" cy="138" rx="44" ry="38" fill={c.body} />
        {/* Wings */}
        <ellipse cx={62 - wingSpread/2} cy="138" rx={22 + wingSpread/3} ry="16"
          fill={c.body} stroke="#e8b820" strokeWidth="1.5" transform={`rotate(-${15+wingSpread/4} ${62-wingSpread/2} 138)`}/>
        <ellipse cx={138 + wingSpread/2} cy="138" rx={22 + wingSpread/3} ry="16"
          fill={c.body} stroke="#e8b820" strokeWidth="1.5" transform={`rotate(${15+wingSpread/4} ${138+wingSpread/2} 138)`}/>
        {/* Wing feather details */}
        <path d={`M ${65-wingSpread/2} 133 Q ${58-wingSpread/2} 145 ${62-wingSpread/2} 153`}
          stroke="#e8b820" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.7"/>
        <path d={`M ${135+wingSpread/2} 133 Q ${142+wingSpread/2} 145 ${138+wingSpread/2} 153`}
          stroke="#e8b820" strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.7"/>
        {/* Feet */}
        <g fill="#f47c20">
          <rect x="84" y="170" width="5" height="10" rx="2"/>
          <rect x="78" y="178" width="12" height="3" rx="1.5"/>
          <rect x="75" y="178" width="5" height="3" rx="1.5" transform="rotate(-20 75 178)"/>
          <rect x="90" y="178" width="5" height="3" rx="1.5" transform="rotate(20 95 178)"/>
          <rect x="111" y="170" width="5" height="10" rx="2"/>
          <rect x="105" y="178" width="12" height="3" rx="1.5"/>
          <rect x="102" y="178" width="5" height="3" rx="1.5" transform="rotate(-20 102 178)"/>
          <rect x="117" y="178" width="5" height="3" rx="1.5" transform="rotate(20 122 178)"/>
        </g>
        {/* Head */}
        <circle cx="100" cy="95" r="40" fill={c.body} />
        {/* Head tuft */}
        <ellipse cx="96" cy="58" rx="7" ry="12" fill={c.body} transform="rotate(-15 96 58)"/>
        <ellipse cx="104" cy="56" rx="7" ry="13" fill={c.body} transform="rotate(5 104 56)"/>
        <ellipse cx="113" cy="60" rx="5" ry="10" fill={c.body} transform="rotate(20 113 60)"/>
        {/* Eyes */}
        {renderEyes(eyeShape, 100, 95, c, si >= 3 ? 9 : 8)}
        {/* Beak */}
        <path d="M94 104 L100 112 L106 104 Z" fill="#f47c20" />
        <line x1="94" y1="104" x2="106" y2="104" stroke="#e06010" strokeWidth="1.5"/>
        {/* Cheeks */}
        <circle cx="77" cy="100" r="10" fill={c.cheek} opacity="0.5"/>
        <circle cx="123" cy="100" r="10" fill={c.cheek} opacity="0.5"/>
        {/* Belly fluff */}
        <ellipse cx="100" cy="140" rx="24" ry="18" fill="white" opacity="0.15"/>
        {/* Stage 4: little bowtie / scarf */}
        {si >= 3 && <g>
          <path d="M88 118 L100 124 L112 118 L100 113 Z" fill="#e8768a" opacity="0.9"/>
          <circle cx="100" cy="118" r="3" fill="#c04060"/>
        </g>}
      </svg>
    )
  }

  function renderEyes(type, cx, cy, c, r) {
    const lx = cx - r * 1.7, rx = cx + r * 1.7, ey = cy - r * 0.3
    if (type === 'star') {
      return <>
        <text x={lx} y={ey+4} textAnchor="middle" fontSize={r*1.8} fill={c.eye}>✦</text>
        <text x={rx} y={ey+4} textAnchor="middle" fontSize={r*1.8} fill={c.eye}>✦</text>
      </>
    }
    if (type === 'sad') {
      return <>
        <circle cx={lx} cy={ey} r={r} fill="white"/>
        <circle cx={rx} cy={ey} r={r} fill="white"/>
        <circle cx={lx+1} cy={ey+2} r={r*0.55} fill={c.eye}/>
        <circle cx={rx-1} cy={ey+2} r={r*0.55} fill={c.eye}/>
        {/* Sad brows */}
        <path d={`M ${lx-r} ${ey-r*1.1} Q ${lx} ${ey-r*1.5} ${lx+r} ${ey-r*1.1}`}
          stroke={c.eye} strokeWidth="2" fill="none" strokeLinecap="round"/>
        <path d={`M ${rx-r} ${ey-r*1.1} Q ${rx} ${ey-r*1.5} ${rx+r} ${ey-r*1.1}`}
          stroke={c.eye} strokeWidth="2" fill="none" strokeLinecap="round"/>
      </>
    }
    // Normal / happy
    return <>
      <circle cx={lx} cy={ey} r={r} fill="white"/>
      <circle cx={rx} cy={ey} r={r} fill="white"/>
      <circle cx={lx+r*0.2} cy={ey+r*0.2} r={r*0.55} fill={c.eye}/>
      <circle cx={rx+r*0.2} cy={ey+r*0.2} r={r*0.55} fill={c.eye}/>
      {/* Shine dots */}
      <circle cx={lx-r*0.1} cy={ey-r*0.3} r={r*0.2} fill="white"/>
      <circle cx={rx-r*0.1} cy={ey-r*0.3} r={r*0.2} fill="white"/>
      {type === 'normal' ? null : <>
        {/* Happy closed eyes */}
        <path d={`M ${lx-r} ${ey} Q ${lx} ${ey-r} ${lx+r} ${ey}`}
          stroke={c.eye} strokeWidth="2" fill="white" />
        <path d={`M ${rx-r} ${ey} Q ${rx} ${ey-r} ${rx+r} ${ey}`}
          stroke={c.eye} strokeWidth="2" fill="white" />
      </>}
    </>
  }
}
