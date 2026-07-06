import { join } from 'node:path'
import { app, BrowserWindow } from 'electron'
import { registerIpcHandlers } from './ipc/register'
import { initAutoUpdater } from './update/autoUpdateService'
import { createMainWindow } from './window'

app.whenReady().then(() => {
  if (process.platform === 'darwin' && !app.isPackaged) {
    app.dock?.setIcon(join(__dirname, '../../resources/icon.png'))
  }

  registerIpcHandlers()
  const window = createMainWindow()
  initAutoUpdater(window)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
