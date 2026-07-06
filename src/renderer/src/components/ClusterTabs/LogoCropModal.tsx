import { useState } from 'react'
import { Modal, Slider, Space, Typography } from 'antd'
import Cropper from 'react-easy-crop'
import type { Area, Point } from 'react-easy-crop'
import { cropImageToDataUrl } from '../../imageCrop'

interface LogoCropModalProps {
  imageSrc: string | null
  onCancel: () => void
  onSave: (dataUrl: string) => void
}

export function LogoCropModal({ imageSrc, onCancel, onSave }: LogoCropModalProps): React.JSX.Element {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSave(): Promise<void> {
    if (!imageSrc || !croppedAreaPixels) return
    setSaving(true)
    try {
      const dataUrl = await cropImageToDataUrl(imageSrc, croppedAreaPixels)
      onSave(dataUrl)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Crop logo"
      open={!!imageSrc}
      onCancel={onCancel}
      onOk={handleSave}
      okText="Save"
      okButtonProps={{ loading: saving, disabled: !croppedAreaPixels }}
      destroyOnHidden
    >
      <Space orientation="vertical" style={{ width: '100%' }} size="middle">
        <div style={{ position: 'relative', width: '100%', height: 280, background: '#333' }}>
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="rect"
              showGrid
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_area, areaPixels) => setCroppedAreaPixels(areaPixels)}
            />
          )}
        </div>
        <div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            Zoom
          </Typography.Text>
          <Slider min={1} max={3} step={0.05} value={zoom} onChange={setZoom} />
        </div>
      </Space>
    </Modal>
  )
}
