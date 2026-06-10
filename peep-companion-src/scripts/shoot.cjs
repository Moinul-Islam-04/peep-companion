// Screenshots each scene by seeding localStorage and driving headless Edge.
// Requires the Vite dev server running on :5173 and docs/scenes.json built.
// Run: node scripts/shoot.cjs
const puppeteer = require('puppeteer-core')
const fs = require('fs')
const path = require('path')

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const DOCS = path.join(__dirname, '..', '..', 'docs')
const OUT = path.join(DOCS, 'screenshots')
const URL = 'http://localhost:5173'

const sleep = ms => new Promise(r => setTimeout(r, ms))

;(async () => {
  const scenes = JSON.parse(fs.readFileSync(path.join(DOCS, 'scenes.json'), 'utf8'))
  fs.mkdirSync(OUT, { recursive: true })

  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: 'new',
    args: ['--hide-scrollbars', '--force-color-profile=srgb'],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 420, height: 680, deviceScaleFactor: 2 })

  for (const sc of scenes) {
    await page.goto(URL, { waitUntil: 'networkidle2' })
    await page.evaluate(save => localStorage.setItem('peep-save', JSON.stringify(save)), sc.save)
    await page.reload({ waitUntil: 'networkidle2' })
    await sleep(900)  // let fonts + idle animations settle

    if (sc.nav) {
      await page.evaluate(label => {
        const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes(label))
        if (b) b.click()
      }, sc.nav)
      await sleep(650)
    }
    if (sc.click) { await page.mouse.click(sc.click[0], sc.click[1]); await sleep(450) }

    const file = path.join(OUT, sc.name + '.png')
    await page.screenshot({ path: file })
    console.log('shot', sc.name)
  }

  await browser.close()
  console.log('done →', OUT)
})().catch(e => { console.error(e); process.exit(1) })
