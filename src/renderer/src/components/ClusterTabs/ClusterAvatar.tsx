import { Avatar } from 'antd'
import { Layers } from 'lucide-react'
import { CLOUD_PROVIDER_LABELS, detectCloudProvider } from '@shared/cloudProvider'
import { CLOUD_PROVIDER_ICONS } from '../../icons/cloudProviderIcons'
import { Icon } from '../ui/Icon'

interface ClusterAvatarProps {
  logoUrl?: string
  /** Used when the cluster has no custom logo and the kubeconfig is not a known cloud. */
  fallbackLogoUrl?: string
  name: string
  size?: number
  /**
   * Fallback-tile background when there's no logo. Defaults to the theme accent, but a cluster
   * nested under a coloured workspace should use *that* colour — otherwise every logo-less
   * avatar in the sidebar renders the same flat theme-accent tile regardless of which workspace
   * it belongs to, which is indistinguishable from a workspace that has no colour set at all.
   */
  accentColor?: string
  contextName?: string
  endpoint?: string
  /** Extra kubeconfig strings (exec plugin, auth-provider) used only for cloud detection. */
  hints?: string
  /**
   * When false, skip inferred AWS/GCP/Azure badges and fall through to fallbackLogoUrl / letter.
   * Sidebar "show icons" should match workspace tiles, not cloud-provider marks.
   */
  cloudIcon?: boolean
}

function softRadius(_size: number): number {
  return 0
}

export function ClusterAvatar({
  logoUrl,
  fallbackLogoUrl,
  name,
  size = 32,
  accentColor,
  contextName,
  endpoint,
  hints,
  cloudIcon = true
}: ClusterAvatarProps): React.JSX.Element {
  const radius = softRadius(size)
  // Prefer an explicit / workspace fallback logo over inferred cloud badges — sidebar
  // "show icons" inherits the workspace mark for logo-less clusters; cloud icons were
  // jumping ahead and showing AWS/GCP/Azure tiles instead.
  const provider =
    !cloudIcon || logoUrl || fallbackLogoUrl
      ? null
      : detectCloudProvider(endpoint, contextName, name, hints)
  const src = logoUrl || fallbackLogoUrl || (provider ? CLOUD_PROVIDER_ICONS[provider] : undefined)
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: radius,
    flexShrink: 0,
    overflow: 'hidden'
  }

  if (src) {
    if (provider) {
      return (
        <span
          className={`ml-cluster-avatar ml-cluster-avatar--${provider}`}
          style={style}
          title={CLOUD_PROVIDER_LABELS[provider]}
        >
          <img src={src} alt="" width={size} height={size} draggable={false} />
        </span>
      )
    }
    return (
      <Avatar
        src={src}
        size={size}
        shape="square"
        style={{ ...style, background: 'transparent' }}
      />
    )
  }

  const initial = name.trim().charAt(0).toUpperCase()
  return (
    <Avatar
      size={size}
      shape="square"
      style={{ ...style, backgroundColor: accentColor || 'var(--ml-primary)' }}
    >
      {initial || <Icon icon={Layers} size={size * 0.45} />}
    </Avatar>
  )
}
