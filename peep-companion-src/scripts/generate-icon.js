// Generate a simple icon.png for the system tray
const fs = require('fs')
const path = require('path')

// This is a 16x16 PNG of a simple peep character (base64 encoded)
// Created using a simple pixel-art generator
const iconBase64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA2ElEQVR4nGNgGAWjYBSMglEwCkbBKBgFo2AUjIJRMApGwSgYBaNgFIyCUTAKRsEoGAWjYBSMglEwCkbBKBgFo2AUjIJRMApGwSgYBaNgFIyCUTAKRsEoGAWjYBSMglEwCkbBKBgFo2AUjIJRMApGwSgYBaNgFIyCUTAKRsEoGAWjYBSMglEwCkbBKBgFo2AUjIJRMApGwSgYBaNgFIyCUTAKRsEoGAWjYBSMglEwCkbBKBgFo2AUjIJRMApGwSgYBaNgFIyCUTAKRsEoGAWjYBSMglEwCkbBKBgFo2AUjILTGAEAY3FGUI9FTfUAAAAASUVORK5CYII='

// Write the icon
const iconPath = path.join(__dirname, '..', 'public', 'icon.png')
const dir = path.dirname(iconPath)

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true })
}

// Only write the tiny fallback if no real icon is present — never clobber the
// committed 256x256 app icon (used by electron-builder for the .exe).
if (fs.existsSync(iconPath) && fs.statSync(iconPath).size > 1024) {
  console.log('Icon already present, keeping it:', iconPath)
} else {
  const buffer = Buffer.from(iconBase64, 'base64')
  fs.writeFileSync(iconPath, buffer)
  console.log('Fallback icon created at:', iconPath)
}
