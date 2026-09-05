import { Dropdown, Tooltip, message } from 'antd'
import type { MenuProps } from 'antd'
import { ArrowDown } from 'lucide-react'
import { Icon } from '../ui/Icon'
import { useUpdateStore } from '../../stores/updateStore'

/**
 * Ambient "an update is waiting" affordance, shown next to the app name.
 *
 * The banner announces a new version once and can be dismissed; after that nothing in the UI
 * says an update is pending. This stays until the update is actually installed, so the state is
 * always discoverable without being interruptive — clicking it opens a two-item menu rather than
 * the full update centre modal, since "install" and "read what changed" are the only two things
 * worth one click from here; anything else (skip, remind later, settings) is still reachable
 * from the banner or Settings.
 */
export function UpdateAvailableBadge(): React.JSX.Element | null {
  const state = useUpdateStore((s) => s.state)
  const install = useUpdateStore((s) => s.install)
  const download = useUpdateStore((s) => s.download)
  const openReleasePage = useUpdateStore((s) => s.openReleasePage)

  const phase = state?.phase
  const pending = phase === 'available' || phase === 'downloading' || phase === 'downloaded'
  if (!pending) return null

  const ready = phase === 'downloaded'
  const label = ready
    ? `MagicLens v${state?.latestVersion} is ready to install`
    : phase === 'downloading'
      ? `Downloading v${state?.latestVersion}…`
      : `MagicLens v${state?.latestVersion} is available`

  const handleInstall = (): void => {
    if (ready) {
      install()
      return
    }
    // Background download is already running by default (autoDownload), so this is a manual
    // kick-start for the rare case it hasn't started yet — not a duplicate download.
    void download()
    void message.info('Downloading the update — install from here once it finishes.')
  }

  const items: MenuProps['items'] = [
    {
      key: 'install',
      label: 'Install Update Now',
      disabled: !ready
    },
    {
      key: 'notes',
      label: 'View Release Notes'
    }
  ]

  const handleMenuClick: NonNullable<MenuProps['onClick']> = ({ key }) => {
    if (key === 'install') handleInstall()
    if (key === 'notes') void openReleasePage()
  }

  return (
    <Dropdown
      menu={{ items, onClick: handleMenuClick }}
      trigger={['click']}
      placement="bottomLeft"
    >
      <Tooltip title={label} placement="right">
        <button
          type="button"
          // `is-ready` switches the amber "there is something to fetch" cue to the theme's
          // success colour once the download has landed and the only step left is restarting.
          className={`ml-update-badge${ready ? ' is-ready' : ''}${phase === 'downloading' ? ' is-busy' : ''}`}
          aria-label={label}
        >
          <Icon icon={ArrowDown} variant="micro" />
        </button>
      </Tooltip>
    </Dropdown>
  )
}
