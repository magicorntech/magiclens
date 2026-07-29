import { AlertTriangle, Box, CheckCircle2, Server, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ClusterMetricsSummary } from '@shared/types/metrics'
import { Icon } from '../ui/Icon'
import { clusterHealthStatus } from './nodesOverviewUtils'
import { MotionDiv, fadeIn } from '../ui/Motion'

interface NodesHealthBannerProps {
  data: ClusterMetricsSummary
}

function HealthToneIcon({ tone }: { tone: 'success' | 'warning' | 'danger' }): React.JSX.Element {
  if (tone === 'warning') return <Icon icon={AlertTriangle} variant="detail" />
  if (tone === 'danger') return <Icon icon={XCircle} variant="detail" />
  return <Icon icon={CheckCircle2} variant="detail" />
}

export function NodesHealthBanner({ data }: NodesHealthBannerProps): React.JSX.Element {
  const { t } = useTranslation()
  const health = clusterHealthStatus(data)
  const totalPods = data.runningPods + data.pendingPods + data.failedPods
  const readyRatio = data.totalNodes > 0 ? (data.readyNodes / data.totalNodes) * 100 : 0
  const runningShare = totalPods > 0 ? (data.runningPods / totalPods) * 100 : 0
  const pendingShare = totalPods > 0 ? (data.pendingPods / totalPods) * 100 : 0
  const failedShare = totalPods > 0 ? (data.failedPods / totalPods) * 100 : 0

  const label =
    health.tone === 'success'
      ? t('nodesOverview.health.healthy')
      : health.tone === 'warning'
        ? t('nodesOverview.health.warning')
        : t('nodesOverview.health.degraded')

  const message =
    health.tone === 'success'
      ? t('nodesOverview.health.healthyMsg')
      : health.tone === 'warning'
        ? t('nodesOverview.health.warningMsg', { pending: data.pendingPods })
        : t('nodesOverview.health.degradedMsg', {
            notReady: data.notReadyNodes,
            failed: data.failedPods
          })

  return (
    <MotionDiv className="ml-nodes-health-banner" {...fadeIn}>
      <div className={`ml-nodes-health-card ml-nodes-health-card--${health.tone}`}>
        <div className="ml-nodes-health-card__top">
          <span className={`ml-nodes-health-card__icon-soft ml-nodes-health-card__icon-soft--${health.tone}`} aria-hidden>
            <HealthToneIcon tone={health.tone} />
          </span>
          <span className="ml-nodes-health-card__label">{t('nodesOverview.health.cluster')}</span>
        </div>
        <div className="ml-nodes-health-card__metric">
          <span className="ml-nodes-health-card__value ml-nodes-health-card__value--text">{label}</span>
        </div>
        <div className="ml-nodes-health-meter" aria-hidden>
          <span className={`ml-nodes-health-meter__fill ml-nodes-health-meter__fill--${health.tone === 'success' ? 'ok' : health.tone === 'warning' ? 'warn' : 'bad'}`} style={{ width: '100%' }} />
        </div>
        <div className="ml-nodes-health-card__footer">
          <p className="ml-nodes-health-card__message">{message}</p>
        </div>
      </div>

      <div className="ml-nodes-health-card">
        <div className="ml-nodes-health-card__top">
          <span className="ml-nodes-health-card__icon-soft" aria-hidden>
            <Icon icon={Server} variant="detail" />
          </span>
          <span className="ml-nodes-health-card__label">{t('nodesOverview.health.nodes')}</span>
        </div>
        <div className="ml-nodes-health-card__metric">
          <span className="ml-nodes-health-card__value">{data.totalNodes}</span>
          <span className="ml-nodes-health-card__unit">{t('nodesOverview.health.nodesUnit')}</span>
        </div>
        <div className="ml-nodes-health-meter" aria-hidden>
          <span className="ml-nodes-health-meter__fill ml-nodes-health-meter__fill--ok" style={{ width: `${readyRatio}%` }} />
        </div>
        <div className="ml-nodes-health-card__footer">
          <div className="ml-nodes-health-chips">
            <span className="ml-nodes-health-chip ml-nodes-health-chip--ok">
              {t('nodesOverview.health.ready', { count: data.readyNodes })}
            </span>
            <span
              className={`ml-nodes-health-chip${data.notReadyNodes > 0 ? ' ml-nodes-health-chip--bad' : ''}`}
            >
              {t('nodesOverview.health.notReady', { count: data.notReadyNodes })}
            </span>
          </div>
        </div>
      </div>

      <div className="ml-nodes-health-card">
        <div className="ml-nodes-health-card__top">
          <span className="ml-nodes-health-card__icon-soft" aria-hidden>
            <Icon icon={Box} variant="detail" />
          </span>
          <span className="ml-nodes-health-card__label">{t('nodesOverview.health.pods')}</span>
        </div>
        <div className="ml-nodes-health-card__metric">
          <span className="ml-nodes-health-card__value">{totalPods}</span>
          <span className="ml-nodes-health-card__unit">{t('nodesOverview.health.podsUnit')}</span>
        </div>
        <div className="ml-nodes-health-meter" aria-hidden>
          <span className="ml-nodes-health-meter__fill ml-nodes-health-meter__fill--ok" style={{ width: `${runningShare}%` }} />
          {pendingShare > 0 ? (
            <span
              className="ml-nodes-health-meter__fill ml-nodes-health-meter__fill--warn"
              style={{ width: `${pendingShare}%` }}
            />
          ) : null}
          {failedShare > 0 ? (
            <span
              className="ml-nodes-health-meter__fill ml-nodes-health-meter__fill--bad"
              style={{ width: `${failedShare}%` }}
            />
          ) : null}
        </div>
        <div className="ml-nodes-health-card__footer">
          <div className="ml-nodes-health-chips">
            <span className="ml-nodes-health-chip ml-nodes-health-chip--ok">
              {t('nodesOverview.health.running', { count: data.runningPods })}
            </span>
            <span
              className={`ml-nodes-health-chip${data.pendingPods > 0 ? ' ml-nodes-health-chip--warn' : ''}`}
            >
              {t('nodesOverview.health.pending', { count: data.pendingPods })}
            </span>
            <span
              className={`ml-nodes-health-chip${data.failedPods > 0 ? ' ml-nodes-health-chip--bad' : ''}`}
            >
              {t('nodesOverview.health.failed', { count: data.failedPods })}
            </span>
          </div>
        </div>
      </div>
    </MotionDiv>
  )
}
