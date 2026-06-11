const { app, BrowserWindow, ipcMain, Tray, Menu, screen, Notification } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const fs = require('fs')

// Use Electron's own packaged flag — NOT NODE_ENV, which is unset in a packaged
// build and would make it try to load the (non-running) Vite dev server → blank.
const isDev = !app.isPackaged

const DATA_PATH = path.join(app.getPath('userData'), 'peep-save.json')

let mainWindow
let miniWindow
let tray

const BACKUP_PATH = DATA_PATH + '.bak'

function loadData() {
  // Try the main file, then fall back to the backup if it's missing/corrupt so a
  // half-written or damaged save can't permanently brick the app.
  for (const p of [DATA_PATH, BACKUP_PATH]) {
    try {
      if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'))
    } catch (e) {
      // corrupt file — try the next candidate
    }
  }
  return null
}

function saveData(data) {
  // Write to a temp file, snapshot the last good save to .bak, then atomically
  // rename into place. A crash mid-write leaves either the old file or the .bak
  // intact — never a truncated DATA_PATH.
  try {
    const json = JSON.stringify(data, null, 2)
    const tmpPath = DATA_PATH + '.tmp'
    fs.writeFileSync(tmpPath, json)
    if (fs.existsSync(DATA_PATH)) {
      try { fs.copyFileSync(DATA_PATH, BACKUP_PATH) } catch (e) {}
    }
    fs.renameSync(tmpPath, DATA_PATH)
    return true
  } catch (e) {
    return false
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 680,
    resizable: false,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#1a1a2e',
    icon: path.join(__dirname, '../public/icon.png')
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('minimize', () => {
    mainWindow.hide()
  })

  mainWindow.on('close', (event) => {
    if (tray) {
      event.preventDefault()
      mainWindow.hide()
    }
  })
}

function createMiniWindow() {
  if (miniWindow) {
    miniWindow.show()
    miniWindow.focus()
    return
  }

  const { bottom } = screen.getPrimaryDisplay().workAreaSize
  
  miniWindow = new BrowserWindow({
    width: 200,
    height: 280,
    x: screen.getPrimaryDisplay().workArea.width - 220,
    y: bottom - 300,
    frame: false,
    transparent: false,
    resizable: false,
    focusable: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#1a1a2e',
  })

  const url = isDev ? 'http://localhost:5173' : path.join(__dirname, '../dist/index.html')
  if (isDev) {
    miniWindow.loadURL(url + '?mini=true')
  } else {
    miniWindow.loadFile(url, { query: { mini: 'true' } })
  }

  miniWindow.on('closed', () => {
    miniWindow = null
  })

  miniWindow.on('blur', () => {
    if (miniWindow && !mainWindow?.isFocused()) {
      miniWindow.hide()
    }
  })
}

function createTray() {
  const { nativeImage } = require('electron')
  
  // Create a simple icon programmatically
  let icon
  try {
    const iconPath = path.join(__dirname, '../public/icon.png')
    if (fs.existsSync(iconPath)) {
      icon = nativeImage.createFromPath(iconPath)
    } else {
      // Fallback: create a simple colored square
      icon = nativeImage.createEmpty()
      // Add to manifest or use a different size
      if (process.platform === 'win32') {
        // On Windows, create a minimal but visible icon
        icon = nativeImage.createFromBuffer(
          Buffer.from([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
            0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x10,
            0x00, 0x00, 0x00, 0x10, 0x08, 0x02, 0x00, 0x00, 0x00, 0x90,
            0x91, 0x68, 0x36, 0x00, 0x00, 0x00, 0x19, 0x74, 0x45, 0x58,
            0x74, 0x53, 0x6f, 0x66, 0x74, 0x77, 0x61, 0x72, 0x65, 0x00,
            0x41, 0x64, 0x6f, 0x62, 0x65, 0x20, 0x49, 0x6d, 0x61, 0x67,
            0x65, 0x52, 0x65, 0x61, 0x64, 0x79, 0x71, 0xc9, 0x65, 0x3c,
            0x00, 0x00, 0x00, 0x2b, 0x49, 0x44, 0x41, 0x54, 0x78, 0xda,
            0xec, 0xc3, 0xb1, 0x0d, 0x00, 0x00, 0x00, 0xc2, 0xa0, 0xf5,
            0x4f, 0xed, 0x61, 0x0d, 0xa0, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x2c, 0xb3, 0x60, 0x01, 0x00, 0x00, 0x05,
            0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00,
            0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
          ]),
          { width: 16, height: 16 }
        )
      }
    }
  } catch (err) {
    console.error('Icon creation error:', err)
    icon = nativeImage.createEmpty()
  }
  
  try {
    tray = new Tray(icon)
    
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show Peep', click: () => { mainWindow?.show(); mainWindow?.focus() } },
      { label: 'Mini View', click: createMiniWindow },
      { label: 'Test Reminder', click: () => {
        if (!Notification.isSupported()) return
        const n = new Notification({ title: '🐣 Peep Companion', body: "Reminders are on — you'll be nudged at 7 PM if tasks remain." })
        n.on('click', () => { mainWindow?.show(); mainWindow?.focus() })
        n.show()
      } },
      { type: 'separator' },
      { label: 'Exit', click: () => { app.quit() } }
    ])
    
    tray.setContextMenu(contextMenu)
    tray.setToolTip('Peep Companion 🐣')
    tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus() })
    console.log('Tray created successfully')
  } catch (e) {
    console.error('Tray setup error:', e)
  }
}

// ── Daily habit reminder ──────────────────────────────────────────────────────
// Fires a native notification at REMINDER_HOUR if the day's tasks aren't done, so
// the companion pulls you back before the streak breaks. The app stays alive in
// the tray, so the timer keeps running. Reminder hour can be overridden via
// save.settings.reminderHour.
const DEFAULT_REMINDER_HOUR = 19  // 7 PM local
let reminderTimer = null

function pendingTaskCount(data) {
  if (!data || !data.onboarded || !Array.isArray(data.tasks)) return 0
  return data.tasks.filter(t => (t.completedToday || 0) < t.goal).length
}

function showReminder() {
  if (!Notification.isSupported()) return
  const data = loadData()
  const remaining = pendingTaskCount(data)
  if (remaining <= 0) return   // all done (or no tasks) — don't nag
  const peepName = data?.profile?.peepName || 'Your Peep'
  const n = new Notification({
    title: `🐣 ${peepName} misses you!`,
    body: `You have ${remaining} task${remaining === 1 ? '' : 's'} left today. Keep your streak alive!`,
  })
  n.on('click', () => { mainWindow?.show(); mainWindow?.focus() })
  n.show()
}

function scheduleDailyReminder() {
  if (reminderTimer) clearTimeout(reminderTimer)
  const data = loadData()
  const hour = Number.isInteger(data?.settings?.reminderHour) ? data.settings.reminderHour : DEFAULT_REMINDER_HOUR
  const now = new Date()
  const next = new Date()
  next.setHours(hour, 0, 0, 0)
  if (next <= now) next.setDate(next.getDate() + 1)   // already past today → tomorrow
  reminderTimer = setTimeout(() => {
    showReminder()
    scheduleDailyReminder()   // re-arm for the next day
  }, next - now)
}

// ── Auto-update ───────────────────────────────────────────────────────────────
// Checks GitHub Releases on launch; if a newer version is published, it downloads
// in the background and notifies the user, installing on next quit. Only meaningful
// for the installed (NSIS) build, so it's a no-op in dev and degrades quietly.
function setupAutoUpdates() {
  if (!app.isPackaged) return
  autoUpdater.autoDownload = true
  autoUpdater.on('error', err => console.error('Auto-update error:', err?.message || err))
  autoUpdater.on('update-downloaded', () => {
    if (!Notification.isSupported()) return
    const n = new Notification({ title: '🐣 Update ready', body: 'A new version downloaded — restart Peep Companion to apply.' })
    n.on('click', () => autoUpdater.quitAndInstall())
    n.show()
  })
  try { autoUpdater.checkForUpdates() } catch (e) { console.error('Update check failed:', e) }
}

app.whenReady().then(() => {
  app.setAppUserModelId('com.peep.companion')   // required for Windows notifications
  createWindow()
  createTray()
  scheduleDailyReminder()
  setupAutoUpdates()
})

app.on('window-all-closed', () => { 
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => { 
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
  } else {
    createWindow()
  }
})

ipcMain.handle('load-data', () => loadData())
ipcMain.handle('save-data', (_, data) => saveData(data))
ipcMain.handle('close-app', () => { if (tray) mainWindow?.hide(); else app.quit() })
ipcMain.handle('minimize-app', () => mainWindow?.minimize())
ipcMain.handle('toggle-mini', () => {
  if (miniWindow) {
    miniWindow.close()
    miniWindow = null
  } else {
    createMiniWindow()
  }
})
