import { useRef } from 'react'
import { Button, Slider, Space, Typography } from 'antd'
import { ImagePlus, X } from 'lucide-react'
import {
  DEFAULT_BACKGROUND_PANEL_OPACITY,
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
      <Typography.Text strong>Workspace background</Typography.Text>
      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4, marginBottom: 10 }}>
        Shown when this cluster tab is open. Pick a default landscape or upload PNG / JPG.
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
            Remove
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
          Upload PNG / JPG
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
            <Typography.Text strong>Panel transparency</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {opacity}% solid
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
            marks={{ 15: 'Clear', 70: 'Default', 100: 'Solid' }}
          />
          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
            Controls how see-through resource menus, tables (Pods, Deployments, …), and headers are over the wallpaper.
          </Typography.Text>
        </div>
      ) : null}
    </div>
  )
}
