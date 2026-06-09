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

const buffer = Buffer.from(iconBase64, 'base64')
fs.writeFileSync(iconPath, buffer)
console.log('Icon created at:', iconPath)
