import { forwardRef } from 'react'
import type { LucideIcon, LucideProps } from 'lucide-react'
import argoCdSrc from './brands/argo-cd.png'
import prometheusSrc from './brands/prometheus.png'
import helmSrc from './brands/helm.png'
import dockerSrc from './brands/docker.png'
import kubernetesSrc from './brands/kubernetes.png'
import grafanaSrc from './brands/grafana.png'

function brandSize(size: LucideProps['size']): number {
  return typeof size === 'number' ? size : Number.parseInt(String(size ?? 24), 10) || 24
}

function createBrandIcon(src: string, name: string, extraClass?: string) {
  const BrandIcon = forwardRef<HTMLImageElement, LucideProps>(function BrandIcon(
    { size = 24, className },
    ref
  ) {
    const s = brandSize(size)
    return (
      <img
        ref={ref}
        src={src}
        width={s}
        height={s}
        className={['ml-brand-img', extraClass, className].filter(Boolean).join(' ')}
        alt=""
        draggable={false}
      />
    )
  })
  BrandIcon.displayName = name
  return BrandIcon
}

export const GrafanaLogo = createBrandIcon(grafanaSrc, 'GrafanaLogo')
export const PrometheusLogo = createBrandIcon(prometheusSrc, 'PrometheusLogo')
export const ArgoAppLogo = createBrandIcon(argoCdSrc, 'ArgoAppLogo')
export const HelmBrandLogo = createBrandIcon(helmSrc, 'HelmBrandLogo', 'ml-brand-img--helm')
export const KubernetesLogo = createBrandIcon(kubernetesSrc, 'KubernetesLogo')
export const DockerLogo = createBrandIcon(dockerSrc, 'DockerLogo')

export const BRAND_NAV_ICONS = new Set<LucideIcon>([
  GrafanaLogo as LucideIcon,
  PrometheusLogo as LucideIcon,
  ArgoAppLogo as LucideIcon,
  HelmBrandLogo as LucideIcon,
  KubernetesLogo as LucideIcon,
  DockerLogo as LucideIcon
])
