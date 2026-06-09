const { app, BrowserWindow, ipcMain, Tray, Menu, screen } = require('electron')
const path = require('path')
const fs = require('fs')

const isDev = process.env.NODE_ENV !== 'production'

const DATA_PATH = path.join(app.getPath('userData'), 'peep-save.json')

let mainWindow
let miniWindow
let tray

function loadData() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'))
    }
  } catch (e) {}
  return null
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2))
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

app.whenReady().then(() => {
  createWindow()
  createTray()
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
