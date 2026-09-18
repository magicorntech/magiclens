import { useEffect, useRef, useState } from 'react'
import { Button, Input, Result, Spin, Tooltip, message } from 'antd'
import { Copy, ExternalLink, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { ClusterAppKind, ClusterAppOpenResponse } from '@shared/types/clusterApps'
import { mergeClusterSettings } from '@shared/types/clusterSettings'
import { Icon } from '../ui/Icon'
import { ArgoAppLogo, GrafanaLogo, PrometheusLogo } from '../../icons/AppsLogos'
import { useClusterStore } from '../../stores/clusterStore'

const KIND_BY_PAGE = {
  appArgoCd: 'argocd',
  appPrometheus: 'prometheus',
  appGrafana: 'grafana'
} as const

const KIND_LOGO = {
  argocd: ArgoAppLogo,
  prometheus: PrometheusLogo,
  grafana: GrafanaLogo
} as const

export type ClusterAppPageKey = keyof typeof KIND_BY_PAGE

export const CLUSTER_APP_PAGES: ClusterAppPageKey[] = ['appArgoCd', 'appPrometheus', 'appGrafana']

export function isClusterAppPage(page: string | null | undefined): page is ClusterAppPageKey {
  return page === 'appArgoCd' || page === 'appPrometheus' || page === 'appGrafana'
}

interface ClusterAppPageProps {
  clusterId: string
  page: ClusterAppPageKey
}

export function ClusterAppPage({ clusterId, page }: ClusterAppPageProps): React.JSX.Element {
  const { t } = useTranslation()
  const kind: ClusterAppKind = KIND_BY_PAGE[page]
  const Logo = KIND_LOGO[kind]
  const webviewRef = useRef<HTMLElement | null>(null)
  const updateClusterMeta = useClusterStore((s) => s.updateClusterMeta)
  const cluster = useClusterStore((s) => s.clusters.find((c) => c.id === clusterId))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [opened, setOpened] = useState<Extract<ClusterAppOpenResponse, { ok: true }> | null>(null)
  const [error, setError] = useState<{ message: string; missing?: boolean } | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [webviewSrc, setWebviewSrc] = useState<string | null>(null)
  const [url, setUrl] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  async function connect(): Promise<void> {
    setLoading(true)
    setError(null)
    const result = await window.api.clusterApps.open({ clusterId, kind })
    if (!result.ok) {
      setOpened(null)
      setWebviewSrc(null)
      setError({ message: result.error, missing: result.missing })
      setLoading(false)
      return
    }
    setOpened(result)
    setWebviewSrc((prev) => (prev === result.url ? prev : result.url))
    setLoading(false)
  }

  useEffect(() => {
    const settings = mergeClusterSettings(cluster?.settings)
    const i = settings.integrations
    if (kind === 'grafana') {
      setUrl(i.grafanaUrl)
      setUsername(i.grafanaUsername)
      setPassword(i.grafanaPassword)
    } else if (kind === 'prometheus') {
      setUrl(i.prometheusUrl)
      setUsername(i.prometheusUsername)
      setPassword(i.prometheusPassword)
    } else {
      setUrl(i.argoCdUrl)
      setUsername(i.argoCdUsername)
      setPassword(i.argoCdPassword)
    }
    void connect()
  }, [clusterId, kind])

  async function saveAndOpen(): Promise<void> {
    const trimmed = url.trim()
    if (!trimmed) {
      void message.warning(t('clusterApps.urlRequired'))
      return
    }
    setSaving(true)
    const saved = await window.api.clusterApps.saveManual({
      clusterId,
      kind,
      url: trimmed,
      username: username.trim(),
      password
    })
    if (!saved.ok) {
      setSaving(false)
      void message.error(saved.error)
      return
    }
    const settings = mergeClusterSettings(cluster?.settings)
    const integrations = { ...settings.integrations }
    if (kind === 'grafana') {
      integrations.grafanaUrl = trimmed
      integrations.grafanaUsername = username.trim()
      integrations.grafanaPassword = password
    } else if (kind === 'prometheus') {
      integrations.prometheusUrl = trimmed
      integrations.prometheusUsername = username.trim()
      integrations.prometheusPassword = password
    } else {
      integrations.argoCdUrl = trimmed
      integrations.argoCdUsername = username.trim()
      integrations.argoCdPassword = password
    }
    updateClusterMeta(clusterId, {
      settings: { ...settings, integrations }
    })
    setSaving(false)
    await connect()
  }

  function copy(value: string, label: string): void {
    void navigator.clipboard.writeText(value)
    void message.success(t('clusterApps.copied', { label }))
  }

  function reload(): void {
    const el = webviewRef.current as (HTMLElement & { reload?: () => void }) | null
    if (el && typeof el.reload === 'function') el.reload()
    else if (opened) setWebviewSrc(`${opened.url}${opened.url.includes('?') ? '&' : '?'}_=${Date.now()}`)
  }

  if (loading && !opened) {
    return (
      <div className="ml-cluster-app ml-cluster-app--center">
        <Spin description={t('clusterApps.opening', { name: t(`clusterApps.kinds.${kind}`) })} />
      </div>
    )
  }

  if (error || !opened) {
    return (
      <div className="ml-cluster-app ml-cluster-app--center">
        <Result
          icon={<Logo size={48} />}
          status="info"
          title={t('clusterApps.missingTitle', { name: t(`clusterApps.kinds.${kind}`) })}
          subTitle={error?.message || t('clusterApps.missingBody', { name: t(`clusterApps.kinds.${kind}`) })}
        />
        <div className="ml-cluster-app__form">
          <label>
            {t('clusterApps.url')}
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t('clusterApps.urlPlaceholder')}
              onPressEnter={() => void saveAndOpen()}
            />
          </label>
          <label>
            {t('clusterApps.user')}
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" autoComplete="off" />
          </label>
          <label>
            {t('clusterApps.password')}
            <Input.Password value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </label>
          <div className="ml-cluster-app__form-actions">
            <Button onClick={() => void connect()}>{t('clusterApps.retryDiscover')}</Button>
            <Button type="primary" loading={saving} onClick={() => void saveAndOpen()}>
              {t('clusterApps.saveAndOpen')}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const openedPassword = opened.password ?? ''
  const openedUsername = opened.username ?? ''

  return (
    <div className="ml-cluster-app">
      <div className="ml-cluster-app__bar">
        <Logo size={16} />
        <div className="ml-cluster-app__url" title={opened.url}>
          {opened.url.replace(/^https?:\/\//, '')}
        </div>
        {opened.serviceName ? <span className="ml-cluster-app__chip">{opened.serviceName}</span> : null}
        {openedUsername ? (
          <button type="button" className="ml-cluster-app__chip" onClick={() => copy(openedUsername, t('clusterApps.user'))}>
            {t('clusterApps.user')}: {openedUsername}
            <Icon icon={Copy} variant="micro" />
          </button>
        ) : null}
        {openedPassword ? (
          <span className="ml-cluster-app__chip ml-cluster-app__chip--secret">
            <span>
              {t('clusterApps.password')}: {showPassword ? openedPassword : '••••••••'}
            </span>
            <Tooltip title={showPassword ? t('clusterApps.hidePassword') : t('clusterApps.showPassword')}>
              <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={t('clusterApps.showPassword')}>
                <Icon icon={showPassword ? EyeOff : Eye} variant="micro" />
              </button>
            </Tooltip>
            <button type="button" onClick={() => copy(openedPassword, t('clusterApps.password'))} aria-label={t('clusterApps.copyPassword')}>
              <Icon icon={Copy} variant="micro" />
            </button>
          </span>
        ) : null}
        <div className="ml-cluster-app__actions">
          <Button size="small" icon={<Icon icon={ExternalLink} variant="micro" />} onClick={() => void window.api.app.openExternalUrl(opened.url)}>
            {t('clusterApps.open')}
          </Button>
          <Button size="small" icon={<Icon icon={RefreshCw} variant="micro" />} onClick={reload}>
            {t('clusterApps.refresh')}
          </Button>
        </div>
      </div>
      <div className="ml-cluster-app__frame">
        {webviewSrc ? (
          <webview
            ref={(el) => {
              webviewRef.current = el
            }}
            src={webviewSrc}
            partition={`persist:cluster-app-${clusterId}-${kind}`}
            key={`${clusterId}-${kind}`}
            allowpopups
            webpreferences="contextIsolation=yes, nodeIntegration=no, sandbox=yes"
          />
        ) : null}
      </div>
    </div>
  )
}
