import { Button, Tabs, Tooltip } from 'antd'
import { PanelBottom, PanelLeft, PanelRight, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { UtilityPanelPlacement } from '@shared/types/app'
import { Icon } from '../ui/Icon'
import { TerminalView } from '../Terminal/TerminalView'
import { YamlEditorPanelBody } from '../ResourceTable/YamlEditorPanelBody'
import { ResourceDetailTabBody } from '../ResourceTable/ResourceDetailTabBody'
import { useDisplaySettingsStore } from '../../stores/displaySettingsStore'
import { useBottomPanel } from './BottomPanelContext'

interface BottomPanelProps {
  placement?: UtilityPanelPlacement
  allowSidePlacement?: boolean
}

export function BottomPanel({
  placement = 'bottom',
  allowSidePlacement = true
}: BottomPanelProps): React.JSX.Element {
  const { t } = useTranslation()
  const { tabs, activeTabId, addTerminalTab, closeTab, setActiveTab, closeAll } = useBottomPanel()
  const setUtilityPanelPlacement = useDisplaySettingsStore((s) => s.setUtilityPanelPlacement)

  const items = tabs.map((tab) => ({
    key: tab.id,
    label: tab.title,
    children:
      tab.kind === 'terminal' ? (
        <TerminalView sessionId={tab.id} clusterId={tab.clusterId} isActive={activeTabId === tab.id} />
      ) : tab.kind === 'yaml' ? (
        <YamlEditorPanelBody key={tab.id} tab={tab} onDone={() => closeTab(tab.id)} />
      ) : (
        <ResourceDetailTabBody tab={tab} isActive={activeTabId === tab.id} onClose={() => closeTab(tab.id)} />
      )
  }))

  const dockOptions: { value: UtilityPanelPlacement; icon: typeof PanelBottom; label: string }[] = [
    { value: 'left', icon: PanelLeft, label: t('settings.display.panelPlacementLeft') },
    { value: 'bottom', icon: PanelBottom, label: t('settings.display.panelPlacementBottom') },
    { value: 'right', icon: PanelRight, label: t('settings.display.panelPlacementRight') }
  ]

  return (
    <div className={`ml-bottom-panel ml-bottom-panel--${placement}`}>
      <Tabs
        type="editable-card"
        size="small"
        hideAdd={false}
        destroyOnHidden={false}
        activeKey={activeTabId ?? undefined}
        onChange={setActiveTab}
        onEdit={(targetKey, action) => {
          if (action === 'add') addTerminalTab()
          else if (typeof targetKey === 'string') closeTab(targetKey)
        }}
        items={items}
        className="ml-bottom-panel-tabs"
        tabBarStyle={{ margin: 0, padding: '0 8px' }}
        tabBarExtraContent={{
          right: (
            <div className="ml-bottom-panel__chrome">
              {allowSidePlacement
                ? dockOptions.map((opt) => (
                    <Tooltip key={opt.value} title={opt.label}>
                      <Button
                        type="text"
                        size="small"
                        className={
                          placement === opt.value
                            ? 'ml-bottom-panel__dock-btn is-active'
                            : 'ml-bottom-panel__dock-btn'
                        }
                        icon={<Icon icon={opt.icon} variant="detail" />}
                        aria-label={opt.label}
                        aria-pressed={placement === opt.value}
                        onClick={() => void setUtilityPanelPlacement(opt.value)}
                      />
                    </Tooltip>
                  ))
                : null}
              <Tooltip title={t('chromeExtra.closePanel')}>
                <Button
                  type="text"
                  size="small"
                  icon={<Icon icon={X} variant="detail" />}
                  onClick={closeAll}
                  aria-label={t('chromeExtra.closePanel')}
                />
              </Tooltip>
            </div>
          )
        }}
      />
    </div>
  )
}
