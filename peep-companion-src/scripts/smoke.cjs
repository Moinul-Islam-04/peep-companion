// CI smoke test: launch the PACKAGED app and fail if the renderer is blank.
//
// This catches the whole class of "installed app shows a blank window" bugs that
// unit tests and dev mode miss — wrong load target (dev-server vs file://), assets
// blocked under file://, or a JS crash on boot — by driving the real packaged exe
// and asserting React actually mounted.
//
// Usage: node scripts/smoke.cjs ["path/to/App.exe"]
const { spawn, execSync } = require('child_process')
const path = require('path')
const puppeteer = require('puppeteer-core')

const EXE = process.argv[2] || path.join(__dirname, '..', 'dist-electron', 'win-unpacked', 'Peep Companion.exe')
const PORT = 9222
const MIN_ROOT_LEN = 1000          // loading screen is ~300; real UI is >4000
const sleep = ms => new Promise(r => setTimeout(r, ms))
const killTree = pid => { try { execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' }) } catch (e) {} }

;(async () => {
  console.log('[smoke] launching', EXE)
  const child = spawn(EXE, [`--remote-debugging-port=${PORT}`, '--no-sandbox'], { stdio: 'ignore' })

  // connect to the app's DevTools endpoint (retry while it boots)
  let browser, lastErr
  for (let i = 0; i < 25 && !browser; i++) {
    await sleep(1000)
    try { browser = await puppeteer.connect({ browserURL: `http://localhost:${PORT}`, defaultViewport: null }) }
    catch (e) { lastErr = e }
  }
  if (!browser) { killTree(child.pid); console.error('[smoke] FAIL: could not connect:', lastErr && lastErr.message); process.exit(1) }

  // poll the renderer until it has real content (or give up)
  let info = null
  for (let i = 0; i < 20; i++) {
    await sleep(1000)
    const pages = await browser.pages().catch(() => [])
    const page = pages.find(p => p.url().startsWith('file:')) || pages.find(p => !p.url().includes('devtools')) || pages[0]
    if (!page) continue
    info = await page.evaluate(() => ({
      rootLen: document.getElementById('root')?.innerHTML.length || 0,
      url: location.href,
      bodyText: document.body.innerText.slice(0, 120),
    })).catch(() => null)
    if (info && info.rootLen >= MIN_ROOT_LEN && info.url.startsWith('file:')) break
  }

  await browser.disconnect().catch(() => {})
  killTree(child.pid)

  console.log('[smoke] result:', JSON.stringify(info))
  if (!info) { console.error('[smoke] FAIL: no renderer found'); process.exit(1) }
  if (!info.url.startsWith('file:')) { console.error(`[smoke] FAIL: renderer not on file:// (got ${info.url}) — bad load target`); process.exit(1) }
  if (info.rootLen < MIN_ROOT_LEN) { console.error(`[smoke] FAIL: #root nearly empty (${info.rootLen} chars) — blank window`); process.exit(1) }
  console.log(`[smoke] PASS: renderer mounted (#root ${info.rootLen} chars at ${info.url})`)
  process.exit(0)
})().catch(e => { console.error('[smoke] error', e); process.exit(1) })
