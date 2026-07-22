import { useRef } from 'react'
import { Button, Slider, Space, Typography } from 'antd'
import { ImagePlus, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  DEFAULT_CLUSTER_BACKGROUNDS,
  compressBackgroundToDataUrl,
  cssBackgroundImage,
  normalizeBackgroundPanelOpacity,
  resolveClusterBackgroundUrl
} from '../../clusterBackgrounds'
import { Icon } from '../ui/Icon'

interface ClusterBackgroundPickerProps {
  backgroundId?: string
  backgroundCustomUrl?: string
  backgroundPanelOpacity?: number
  onChange: (next: {
    backgroundId?: string
    backgroundCustomUrl?: string
    backgroundPanelOpacity?: number
  }) => void
}

export function ClusterBackgroundPicker({
  backgroundId,
  backgroundCustomUrl,
  backgroundPanelOpacity,
  onChange
}: ClusterBackgroundPickerProps): React.JSX.Element {
  const { t } = useTranslation()
  const fileRef = useRef<HTMLInputElement>(null)
  const preview = resolveClusterBackgroundUrl({ backgroundId, backgroundCustomUrl })
  const opacity = normalizeBackgroundPanelOpacity(backgroundPanelOpacity)
  const hasBg = !!preview

  async function handleFile(file: File): Promise<void> {
    const dataUrl = await compressBackgroundToDataUrl(file)
    onChange({
      backgroundId: 'custom',
      backgroundCustomUrl: dataUrl,
      backgroundPanelOpacity: opacity
    })
  }

  return (
    <div className="ml-cluster-bg-picker">
      <Typography.Text strong>{t('clusterBg.title')}</Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4, marginBottom: 10 }}>
        {t('clusterBg.hint')}
      </Typography.Text>

      {preview ? (
        <div
          className="ml-cluster-bg-picker__preview"
          style={{ backgroundImage: cssBackgroundImage(preview) }}
        >
          <Button
            size="small"
            danger
            icon={<Icon icon={X} variant="detail" />}
            onClick={() =>
              onChange({
                backgroundId: undefined,
                backgroundCustomUrl: undefined,
                backgroundPanelOpacity: undefined
              })
            }
          >
            {t('clusterBg.remove')}
          </Button>
        </div>
      ) : null}

      <div className="ml-cluster-bg-picker__grid">
        {DEFAULT_CLUSTER_BACKGROUNDS.map((bg) => {
          const selected = backgroundId === bg.id
          return (
            <button
              key={bg.id}
              type="button"
              className={`ml-cluster-bg-picker__thumb${selected ? ' ml-cluster-bg-picker__thumb--selected' : ''}`}
              style={{ backgroundImage: cssBackgroundImage(bg.src) }}
              title={bg.name}
              onClick={() =>
                onChange({
                  backgroundId: bg.id,
                  backgroundCustomUrl: undefined,
                  backgroundPanelOpacity: opacity
                })
              }
            >
              <span>{bg.name}</span>
            </button>
          )
        })}
      </div>

      <Space style={{ marginTop: 10 }}>
        <Button icon={<Icon icon={ImagePlus} variant="detail" />} onClick={() => fileRef.current?.click()}>
          {t('clusterBg.upload')}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,.png,.jpg,.jpeg"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void handleFile(file)
          }}
        />
      </Space>

      {hasBg ? (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
            <Typography.Text strong>{t('clusterBg.panelTransparency')}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {t('clusterBg.solidPct', { opacity })}
            </Typography.Text>
          </div>
          <Slider
            min={15}
            max={100}
            value={opacity}
            onChange={(value) =>
              onChange({
                backgroundId,
                backgroundCustomUrl,
                backgroundPanelOpacity: normalizeBackgroundPanelOpacity(value)
              })
            }
            marks={{
              15: t('clusterBg.clear'),
              70: t('clusterBg.default'),
              100: t('clusterBg.solid')
            }}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
            {t('clusterBg.panelHint')}
          </Typography.Text>
        </div>
      ) : null}
    </div>
  )
}
