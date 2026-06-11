import React from 'react'

// Catches render-time crashes and shows a recovery screen instead of a blank
// window. Offers a non-destructive reload first; resetting the save is a clearly
// labeled last resort (and the Electron layer keeps a .bak of the prior save).
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null, copied: false }
  }

  static getDerivedStateFromError(error) {
    return { error, copied: false }
  }

  componentDidCatch(error, info) {
    console.error('Peep Companion render error:', error, info)
  }

  reload = () => window.location.reload()

  resetSave = async () => {
    if (!window.confirm('Reset your save? This erases progress. A backup (.bak) is kept by the app.')) return
    try {
      if (window.electronAPI) await window.electronAPI.saveData(null)
      else window.localStorage.removeItem('peep-save')
    } catch (e) { /* fall through to reload regardless */ }
    window.location.reload()
  }

  copyDetails = async () => {
    const details = `${this.state.error?.stack || this.state.error}`
    try { await navigator.clipboard.writeText(details); this.setState({ copied: true }) } catch (e) { /* ignore */ }
  }

  render() {
    if (!this.state.error) return this.props.children

    const btn = (bg, color) => ({
      padding: '11px 18px', borderRadius: 10, fontWeight: 800, fontSize: 13,
      cursor: 'pointer', border: 'none', background: bg, color, width: '100%',
    })

    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center',
        alignItems: 'center', padding: 28, gap: 12, background: 'var(--bg-deep)', textAlign: 'center',
      }}>
        <div style={{ fontSize: 52 }}>🐣💥</div>
        <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--accent-rose)' }}>Something broke</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, maxWidth: 300 }}>
          The app hit an error while rendering. Reloading usually fixes it — your save is intact.
        </div>
        <div style={{
          maxWidth: 320, maxHeight: 90, overflow: 'auto', fontSize: 11, fontFamily: 'Space Mono, monospace',
          color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '8px 10px', textAlign: 'left', whiteSpace: 'pre-wrap',
        }}>
          {String(this.state.error?.message || this.state.error)}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 260, marginTop: 4 }}>
          <button onClick={this.reload} style={btn('var(--accent-sun)', '#1a1a2e')}>↻ Reload app</button>
          <button onClick={this.copyDetails} style={btn('var(--bg-card)', 'var(--text-main)')}>
            {this.state.copied ? '✓ Copied' : '📋 Copy error details'}
          </button>
          <button onClick={this.resetSave} style={btn('rgba(232,118,138,0.15)', 'var(--accent-rose)')}>
            ⚠ Reset save (erases progress)
          </button>
        </div>
      </div>
    )
  }
}
