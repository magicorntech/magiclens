import { BrowserWindow, Menu, app, dialog } from 'electron'
import { normalizeAppLocale, type AppLocale } from '@shared/types/locale'
import { getDisplaySettings } from './persistence/appSettings'

type ReloadConfirmCopy = {
  title: string
  message: string
  detail: string
  detailHard: string
  cancel: string
  restart: string
}

const RELOAD_CONFIRM_COPY: Record<AppLocale, ReloadConfirmCopy> = {
  en: {
    title: 'Restart MagicLens?',
    message: 'Do you want to reload the application?',
    detail: 'The window will reload. Temporary UI state may reset.',
    detailHard: 'The window will reload and clear its cache.',
    cancel: 'Cancel',
    restart: 'Restart'
  },
  tr: {
    title: 'MagicLens yenilensin mi?',
    message: 'Uygulamayı yenilemek istiyor musunuz?',
    detail: 'Pencere yeniden yüklenecek. Açık geçici durum sıfırlanabilir.',
    detailHard: 'Pencere önbellek temizlenerek yeniden yüklenecek.',
    cancel: 'İptal',
    restart: 'Yenile'
  },
  de: {
    title: 'MagicLens neu starten?',
    message: 'Möchten Sie die Anwendung neu laden?',
    detail: 'Das Fenster wird neu geladen. Temporärer UI-Zustand kann zurückgesetzt werden.',
    detailHard: 'Das Fenster wird neu geladen und der Cache geleert.',
    cancel: 'Abbrechen',
    restart: 'Neu laden'
  },
  fr: {
    title: 'Redémarrer MagicLens ?',
    message: 'Voulez-vous recharger l’application ?',
    detail: 'La fenêtre sera rechargée. L’état temporaire de l’interface peut être réinitialisé.',
    detailHard: 'La fenêtre sera rechargée et le cache effacé.',
    cancel: 'Annuler',
    restart: 'Recharger'
  },
  ja: {
    title: 'MagicLens を再読み込みしますか？',
    message: 'アプリケーションを再読み込みしますか？',
    detail: 'ウィンドウが再読み込みされます。一時的な UI 状態はリセットされる場合があります。',
    detailHard: 'キャッシュをクリアしてウィンドウを再読み込みします。',
    cancel: 'キャンセル',
    restart: '再読み込み'
  },
  zh: {
    title: '要重启 MagicLens 吗？',
    message: '是否要重新加载应用？',
    detail: '窗口将重新加载。临时界面状态可能会重置。',
    detailHard: '将清除缓存并重新加载窗口。',
    cancel: '取消',
    restart: '重新加载'
  },
  ko: {
    title: 'MagicLens를 다시 시작할까요?',
    message: '애플리케이션을 다시 불러올까요?',
    detail: '창이 다시 로드됩니다. 임시 UI 상태가 초기화될 수 있습니다.',
    detailHard: '캐시를 지우고 창을 다시 로드합니다.',
    cancel: '취소',
    restart: '다시 로드'
  }
}

function reloadConfirmCopy(): ReloadConfirmCopy {
  const locale = normalizeAppLocale(getDisplaySettings().locale)
  return RELOAD_CONFIRM_COPY[locale]
}

export async function confirmAndReloadWindow(
  window: BrowserWindow,
  hard = false
): Promise<void> {
  if (window.isDestroyed()) return
  const copy = reloadConfirmCopy()
  const { response } = await dialog.showMessageBox(window, {
    type: 'question',
    buttons: [copy.cancel, copy.restart],
    defaultId: 1,
    cancelId: 0,
    title: copy.title,
    message: copy.message,
    detail: hard ? copy.detailHard : copy.detail,
    noLink: true
  })
  if (response !== 1 || window.isDestroyed()) return
  if (hard) window.webContents.reloadIgnoringCache()
  else window.webContents.reload()
}

/** Intercept Cmd/Ctrl+R and Cmd/Ctrl+Shift+R before Electron/menu reloads the window. */
export function installReloadConfirm(window: BrowserWindow): void {
  window.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return
    const mod = process.platform === 'darwin' ? input.meta : input.control
    if (!mod || input.alt || input.key.toLowerCase() !== 'r') return
    event.preventDefault()
    void confirmAndReloadWindow(window, Boolean(input.shift))
  })
}

/**
 * Replace default View → Reload / Force Reload so menu accelerators also ask first.
 * Keep a minimal macOS app menu so Cmd+Q / Edit shortcuts still work.
 */
export function installApplicationMenu(): void {
  const isMac = process.platform === 'darwin'
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const }
            ]
          }
        ]
      : []),
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: (_item, browserWindow) => {
            const win =
              browserWindow instanceof BrowserWindow
                ? browserWindow
                : BrowserWindow.getFocusedWindow()
            if (win) void confirmAndReloadWindow(win, false)
          }
        },
        {
          label: 'Force Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: (_item, browserWindow) => {
            const win =
              browserWindow instanceof BrowserWindow
                ? browserWindow
                : BrowserWindow.getFocusedWindow()
            if (win) void confirmAndReloadWindow(win, true)
          }
        },
        { type: 'separator' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'close' }, ...(isMac ? [{ type: 'separator' as const }, { role: 'front' as const }] : [])]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
