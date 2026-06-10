// ─────────────────────────────────────────────────────────────────────────────
// Procedural node-map generator (Slay-the-Spire style). A run is a layered DAG:
// a single start, several middle layers of typed nodes, and a single boss.
// Each node knows which next-layer nodes it connects to; the UI draws the edges.
// ─────────────────────────────────────────────────────────────────────────────

export const NODE_TYPES = {
  start:    { id: 'start',    label: 'Start',    emoji: '🚩', color: '#8b87a8' },
  battle:   { id: 'battle',   label: 'Battle',   emoji: '⚔️', color: '#7ec8e3' },
  elite:    { id: 'elite',    label: 'Elite',    emoji: '💀', color: '#e8768a' },
  treasure: { id: 'treasure', label: 'Treasure', emoji: '💎', color: '#f9c846' },
  rest:     { id: 'rest',     label: 'Rest',     emoji: '🏕️', color: '#6edbb0' },
  boss:     { id: 'boss',     label: 'Boss',     emoji: '🐉', color: '#ff6b6b' },
}

const LAYERS = 7                                  // 0 = start, last = boss
const pick = arr => arr[Math.floor(Math.random() * arr.length)]

// Weighted node type for a middle layer. The layer just before the boss is
// always a Rest so players can heal before the finale.
function rollType(layer) {
  if (layer === LAYERS - 2) return 'rest'
  const bag = ['battle', 'battle', 'battle', 'elite', 'treasure', 'rest']
  return pick(bag)
}

export function generateMap() {
  const nodes = []
  const layerNodes = []          // node id arrays per layer

  for (let layer = 0; layer < LAYERS; layer++) {
    const ids = []
    let count
    if (layer === 0 || layer === LAYERS - 1) count = 1            // start / boss
    else count = 2 + Math.floor(Math.random() * 2)                // 2–3 wide

    for (let col = 0; col < count; col++) {
      const type = layer === 0 ? 'start' : layer === LAYERS - 1 ? 'boss' : rollType(layer)
      const id = `n_${layer}_${col}`
      nodes.push({
        id, layer, col, type,
        // normalized layout coords (0–1); UI scales to pixels
        x: count === 1 ? 0.5 : 0.15 + (col / (count - 1)) * 0.7,
        y: layer / (LAYERS - 1),
        next: [],
      })
      ids.push(id)
    }
    layerNodes.push(ids)
  }

  // Connect every node to 1–2 nodes in the next layer (nearest by column),
  // guaranteeing each next-layer node has at least one incoming edge.
  for (let layer = 0; layer < LAYERS - 1; layer++) {
    const cur = layerNodes[layer].map(id => nodes.find(n => n.id === id))
    const nxt = layerNodes[layer + 1].map(id => nodes.find(n => n.id === id))
    const incoming = new Set()

    for (const node of cur) {
      const sorted = [...nxt].sort((a, b) => Math.abs(a.x - node.x) - Math.abs(b.x - node.x))
      const links = sorted.slice(0, 1 + Math.floor(Math.random() * 2))
      for (const l of links) { node.next.push(l.id); incoming.add(l.id) }
    }
    // Ensure connectivity: wire any orphan next-layer node to the nearest current node.
    for (const n of nxt) {
      if (!incoming.has(n.id)) {
        const nearest = [...cur].sort((a, b) => Math.abs(a.x - n.x) - Math.abs(b.x - n.x))[0]
        nearest.next.push(n.id)
      }
    }
  }

  return { layers: LAYERS, nodes }
}

// The nodes the player may move to right now, given the current position.
export function availableNodes(map, position) {
  if (!position) return map.nodes.filter(n => n.type === 'start')
  const cur = map.nodes.find(n => n.id === position)
  return cur ? cur.next.map(id => map.nodes.find(n => n.id === id)) : []
}

export function getNode(map, id) {
  return map.nodes.find(n => n.id === id) || null
}
