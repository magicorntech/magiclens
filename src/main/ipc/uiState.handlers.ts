import { ipcMain } from 'electron'
import { IPC } from '@shared/ipc-contract'
import type { PersistedUiState } from '@shared/types/cluster'
import { getUiState, setUiState } from '../persistence/uiState'

export function registerUiStateHandlers(): void {
  ipcMain.handle(IPC.UI_STATE_GET, async () => getUiState())

  ipcMain.handle(IPC.UI_STATE_SET, async (_e, state: PersistedUiState) => {
    setUiState(state)
    return { ok: true as const }
  })
}
