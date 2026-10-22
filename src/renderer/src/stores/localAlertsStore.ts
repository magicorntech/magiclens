import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  DEFAULT_LOCAL_ALERT_PREFS,
  defaultAlertTypes,
  isAlertSnoozed,
  mergeAlertHistory,
  type AlertHistoryEntry,
  type AlertSnooze,
  type AlertSoundId,
  type LocalAlert,
  type LocalAlertPrefs,
  type LocalAlertType
} from '@shared/localAlerts'
import { playAlertSound } from '../alerts/alertSound'
import { useNotesStore } from './notesStore'

interface LocalAlertsState {
  enabled: boolean
  osNotify: boolean
  alerts: LocalAlert[]
  history: AlertHistoryEntry[]
  snoozes: AlertSnooze[]
  notifiedIds: string[]
  permissionAsked: boolean
  prefs: LocalAlertPrefs
  setEnabled: (enabled: boolean) => void
  setOsNotify: (osNotify: boolean) => void
  setPermissionAsked: (asked: boolean) => void
  setSound: (sound: AlertSoundId) => void
  setSoundFor: (soundFor: LocalAlertPrefs['soundFor']) => void
  setRestartThreshold: (restartThreshold: number) => void
  setPendingMinutes: (pendingMinutes: number) => void
  setTypeEnabled: (type: LocalAlertType, enabled: boolean) => void
  snooze: (alert: { id: string; clusterId: string }, untilIso: string) => void
  unsnooze: (id: string, clusterId: string) => void
  ingest: (alerts: LocalAlert[], opts: { osNotify: boolean; recordHistory: boolean }) => void
}

const MAX_NOTIFIED = 400

export const useLocalAlertsStore = create<LocalAlertsState>()(
  persist(
    (set, get) => ({
      enabled: true,
      osNotify: true,
      alerts: [],
      history: [],
      snoozes: [],
      notifiedIds: [],
      permissionAsked: false,
      prefs: DEFAULT_LOCAL_ALERT_PREFS,
      setEnabled: (enabled) => set({ enabled, alerts: enabled ? get().alerts : [] }),
      setOsNotify: (osNotify) => {
        set({ osNotify })
        if (osNotify) void window.api.alerts.requestPermission()
      },
      setPermissionAsked: (permissionAsked) => set({ permissionAsked }),
      setSound: (sound) => set((state) => ({ prefs: { ...state.prefs, sound } })),
      setSoundFor: (soundFor) => set((state) => ({ prefs: { ...state.prefs, soundFor } })),
      setRestartThreshold: (restartThreshold) =>
        set((state) => ({ prefs: { ...state.prefs, restartThreshold } })),
      setPendingMinutes: (pendingMinutes) =>
        set((state) => ({ prefs: { ...state.prefs, pendingMinutes } })),
      setTypeEnabled: (type, enabled) =>
        set((state) => ({
          prefs: { ...state.prefs, types: { ...state.prefs.types, [type]: enabled } }
        })),
      snooze: (alert, untilIso) =>
        set((state) => ({
          snoozes: [
            ...state.snoozes.filter(
              (snooze) => snooze.id !== alert.id || snooze.clusterId !== alert.clusterId
            ),
            { id: alert.id, clusterId: alert.clusterId, until: untilIso }
          ]
        })),
      unsnooze: (id, clusterId) =>
        set((state) => ({
          snoozes: state.snoozes.filter((snooze) => snooze.id !== id || snooze.clusterId !== clusterId)
        })),
      ingest: (alerts, opts) => {
        const nowMs = Date.now()
        const snoozes = get().snoozes
        const notified = new Set(get().notifiedIds)
        const snoozedIds = new Set(
          alerts.filter((alert) => isAlertSnoozed(snoozes, alert, nowMs)).map((alert) => alert.id)
        )
        for (const id of snoozedIds) notified.delete(id)
        const notifyable = alerts.filter((alert) => !snoozedIds.has(alert.id))
        const fresh = notifyable.filter((alert) => !notified.has(alert.id))
        const prefs = get().prefs
        useNotesStore.getState().pushClusterAlerts(fresh)
        const audible = fresh.filter((alert) => prefs.soundFor === 'all' || alert.severity === 'error')
        if (prefs.sound !== 'off' && audible.length > 0) playAlertSound(prefs.sound)
        if (opts.osNotify) {
          for (const alert of fresh.slice(0, 5)) {
            void window.api.alerts.notify({
              title: alert.title,
              body: `${alert.clusterName} · ${alert.body}`,
              silent: prefs.sound !== 'off',
              target: {
                type: 'resource',
                clusterId: alert.clusterId,
                kind: alert.kind,
                namespace: alert.namespace,
                name: alert.name
              }
            })
          }
        }
        const notifiedIds = [...notified, ...notifyable.map((alert) => alert.id)].slice(-MAX_NOTIFIED)
        const history =
          opts.recordHistory === false
            ? get().history
            : mergeAlertHistory(get().history, alerts, new Date(nowMs).toISOString())
        set({ alerts, notifiedIds, history })
      }
    }),
    {
      name: 'magiclens-local-alerts',
      partialize: (state) => ({
        enabled: state.enabled,
        osNotify: state.osNotify,
        notifiedIds: state.notifiedIds,
        permissionAsked: state.permissionAsked,
        prefs: state.prefs,
        history: state.history,
        snoozes: state.snoozes
      }),
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<LocalAlertsState>
        return {
          ...current,
          ...saved,
          history: Array.isArray(saved.history) ? saved.history : [],
          snoozes: Array.isArray(saved.snoozes) ? saved.snoozes : [],
          prefs: {
            ...DEFAULT_LOCAL_ALERT_PREFS,
            ...saved.prefs,
            types: { ...defaultAlertTypes(), ...saved.prefs?.types }
          }
        }
      }
    }
  )
)
